/**
 * Security & integrity checks against the real Supabase project (no mocks):
 * RLS isolation, server-only writes, pairing codes (one-time, rate-limited), device revocation,
 * idempotent operations and the server-side upload sequence guard.
 *
 *   npm run test:db          (reads NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY from .env.local)
 *
 * Creates a few throwaway anonymous users and workspaces; it never touches your own workspace.
 */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL_ || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local first.");
  process.exit(1);
}

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}

async function device(label: string) {
  const memory = new Map<string, string>();
  const client = createClient(URL_!, KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      storage: { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v), removeItem: (k) => void memory.delete(k) },
    },
  });
  const { error } = await client.auth.signInAnonymously();
  if (error) throw new Error(`Anonymous sign-in failed (is it enabled in Auth settings?): ${error.message}`);
  return { client, label, deviceId: randomUUID() };
}

const op = (type: string, day: number, n: number, payload: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  op_id: randomUUID(),
  type,
  channel_id: "ai-facts",
  video_id: `ai-facts-d${String(day).padStart(3, "0")}-v${n}`,
  day_number: day,
  video_number: n,
  payload,
  client_ts: new Date().toISOString(),
  device_id: "test-db-script",
  epoch: 1,
  ...extra,
});

async function pairing(client: SupabaseClient, body: Record<string, unknown>) {
  const { data, error } = await client.functions.invoke("pairing", { body });
  if (error instanceof FunctionsHttpError) return { httpStatus: error.context.status, ...(await error.context.json().catch(() => ({}))) };
  if (error) throw error;
  return { httpStatus: 200, ...data };
}

async function main() {
  const a = await device("A");
  const b = await device("B");
  const c = await device("C");

  // --- workspace creation -------------------------------------------------
  const created = await a.client.rpc("create_workspace", { p_device_id: a.deviceId, p_device_label: "Test A", p_force: false });
  check("A creates a workspace", !created.error, created.error);
  const again = await a.client.rpc("create_workspace", { p_device_id: a.deviceId, p_device_label: "Test A", p_force: false });
  check("create_workspace is idempotent", again.data?.workspace_id === created.data?.workspace_id);

  // --- writes only through RPCs --------------------------------------------
  const direct = await a.client.from("video_progress").insert({ workspace_id: created.data.workspace_id, channel_id: "ai-facts", video_id: "ai-facts-d001-v1", day_number: 1, video_number: 1 });
  check("direct table inserts are denied", Boolean(direct.error));
  const codes = await a.client.from("workspace_pairing_codes").select("*");
  check("pairing code table is not readable by clients", Boolean(codes.error) || (codes.data ?? []).length === 0);

  // --- state machine + sequence guard --------------------------------------
  const locked = await a.client.rpc("apply_ops", { p_ops: [op("mark_uploaded", 1, 2, { youtube_url: "https://youtu.be/AAAAAAAAAAA" })] });
  check("server rejects uploading out of sequence", locked.data?.[0]?.status === "rejected" && locked.data?.[0]?.reason === "sequence_locked", locked.data);
  const upload = op("mark_uploaded", 1, 1, { youtube_url: "https://youtu.be/BBBBBBBBBBB", youtube_video_id: "BBBBBBBBBBB", uploaded_at: "2026-11-04" });
  const first = await a.client.rpc("apply_ops", { p_ops: [op("checklist", 1, 1, { item: "imageGenerated", value: true }), upload] });
  check("checklist + upload applied", first.data?.every((r: { status: string }) => r.status === "applied"), first.data ?? first.error);
  const replay = await a.client.rpc("apply_ops", { p_ops: [upload] });
  check("replaying the same op is a no-op (duplicate)", replay.data?.[0]?.status === "duplicate", replay.data);
  const history = await a.client.from("activity_history").select("id").eq("client_op_id", upload.op_id);
  check("exactly one history entry for a replayed op", history.data?.length === 1, history.data);
  const dupYt = await a.client.rpc("apply_ops", { p_ops: [op("mark_uploaded", 1, 2, { youtube_url: "https://youtu.be/BBBBBBBBBBB", youtube_video_id: "BBBBBBBBBBB" })] });
  check("same YouTube video can't be recorded twice", dupYt.data?.[0]?.reason === "duplicate_youtube_video", dupYt.data);
  const skipUploaded = await a.client.rpc("apply_ops", { p_ops: [op("skip_video", 1, 1)] });
  check("uploaded video can't be skipped", skipUploaded.data?.[0]?.reason === "already_uploaded", skipUploaded.data);
  const failed = await a.client.rpc("apply_ops", { p_ops: [op("mark_upload_failed", 1, 2), op("mark_uploaded", 2, 1)] });
  check("a failed upload keeps the next video locked", failed.data?.[0]?.status === "applied" && failed.data?.[1]?.reason === "sequence_locked", failed.data);
  const stale = await a.client.rpc("apply_ops", { p_ops: [op("set_notes", 1, 1, { notes: "x" }, { epoch: 99 })] });
  check("ops from an old epoch (before reset/import) are rejected", stale.data?.[0]?.reason === "stale_epoch", stale.data);

  // --- isolation ----------------------------------------------------------
  const bNone = await b.client.from("video_progress").select("video_id");
  check("a device without a workspace sees no progress", (bNone.data ?? []).length === 0, bNone.data);
  const bWrite = await b.client.rpc("apply_ops", { p_ops: [op("skip_video", 1, 2)] });
  check("a device without a workspace can't write", Boolean(bWrite.error) && /not_member/.test(bWrite.error!.message), bWrite.error);
  await b.client.rpc("create_workspace", { p_device_id: b.deviceId, p_device_label: "Test B", p_force: false });
  const bOwn = await b.client.from("video_progress").select("video_id");
  check("another workspace can't read A's progress", (bOwn.data ?? []).length === 0, bOwn.data);

  // --- pairing ------------------------------------------------------------
  const code = await pairing(a.client, { action: "create" });
  check("A generates a pairing code", typeof code.code === "string" && /^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(code.code), code);
  const wrong = await pairing(c.client, { action: "redeem", code: "0000-0000", deviceId: c.deviceId, deviceLabel: "Test C" });
  check("a wrong code is rejected", wrong.status === "invalid", wrong);
  const ok = await pairing(c.client, { action: "redeem", code: code.code, deviceId: c.deviceId, deviceLabel: "Test C" });
  check("C connects with the code", ok.status === "ok", ok);
  const cRows = await c.client.from("video_progress").select("video_id,upload_status");
  check("C now sees A's progress", (cRows.data ?? []).some((r) => r.video_id === "ai-facts-d001-v1" && r.upload_status === "uploaded"), cRows.data);
  const reuse = await pairing(b.client, { action: "redeem", code: code.code, deviceId: b.deviceId, deviceLabel: "Test B" });
  check("a pairing code works only once", reuse.status === "invalid", reuse);
  const rotated1 = await pairing(a.client, { action: "create" });
  const rotated2 = await pairing(a.client, { action: "create" });
  const old = await pairing(b.client, { action: "redeem", code: rotated1.code, deviceId: b.deviceId, deviceLabel: "Test B" });
  check("generating a new code invalidates the previous one", old.status === "invalid", old);
  void rotated2;

  // --- rate limiting ------------------------------------------------------
  const d = await device("D");
  let last: Record<string, unknown> = {};
  for (let i = 0; i < 6; i++) last = await pairing(d.client, { action: "redeem", code: `ZZZZ-ZZZ${i}`, deviceId: d.deviceId, deviceLabel: "Test D" });
  check("repeated wrong codes are rate-limited", last.status === "rate_limited", last);

  // --- revocation ---------------------------------------------------------
  const members = await a.client.from("workspace_members").select("id,device_label,revoked_at");
  const cMember = members.data?.find((m) => m.device_label === "Test C" && !m.revoked_at);
  const revoke = await a.client.rpc("revoke_device", { p_member_id: cMember?.id });
  check("A removes device C", !revoke.error, revoke.error);
  const cAfter = await c.client.from("video_progress").select("video_id");
  check("a removed device can no longer read progress", (cAfter.data ?? []).length === 0, cAfter.data);
  const cWrite = await c.client.rpc("apply_ops", { p_ops: [op("set_notes", 1, 1, { notes: "hacked" })] });
  check("a removed device can no longer write", Boolean(cWrite.error) && /not_member/.test(cWrite.error!.message), cWrite.error);
  const cStatus = await c.client.rpc("get_my_membership");
  check("a removed device learns it was revoked", cStatus.data?.status === "revoked", cStatus.data);
  const cNew = await c.client.rpc("create_workspace", { p_device_id: c.deviceId, p_device_label: "Test C", p_force: false });
  check("a revoked device doesn't silently get a new workspace", Boolean(cNew.error) && /device_revoked/.test(cNew.error!.message), cNew.error);

  console.log(failures === 0 ? "\nAll database checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
