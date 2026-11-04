/**
 * Runs the real Supabase migration inside PGlite (Postgres in WASM) with a minimal stand-in for
 * Supabase's auth schema and roles, then exercises RLS, the state machine, pairing and revocation
 * exactly as clients would (role `authenticated` + JWT subject).
 */
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema extensions;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create publication supabase_realtime;
`;

let db: PGlite;

async function as<T = Record<string, unknown>>(user: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
  await db.exec(user === "service" ? "set role service_role" : "set role authenticated");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

async function newUser() {
  const id = randomUUID();
  await db.query("insert into auth.users (id) values ($1)", [id]);
  return id;
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
  device_id: "sql-test",
  epoch: 1,
  ...extra,
});

async function apply(user: string, ...ops: object[]) {
  const [row] = await as<{ r: Array<{ status: string; reason?: string; videos?: Array<Record<string, unknown>> }> }>(user, "select public.apply_ops($1::jsonb) as r", [JSON.stringify(ops)]);
  return row!.r;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const dir = "supabase/migrations";
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(`${dir}/${file}`, "utf8").replace(/create extension[^;]+;/gi, "");
    await db.exec(sql);
  }
}, 60_000);

describe("supabase migration (PGlite)", () => {
  let a: string;
  let b: string;
  let ws: string;

  it("creates a workspace idempotently for the first device", async () => {
    a = await newUser();
    const [first] = await as<{ r: { workspace_id: string; created: boolean } }>(a, "select public.create_workspace('dev-aaaaaaaa', 'Laptop') as r");
    const [second] = await as<{ r: { workspace_id: string; created: boolean } }>(a, "select public.create_workspace('dev-aaaaaaaa', 'Laptop') as r");
    ws = first!.r.workspace_id;
    expect(first!.r.created).toBe(true);
    expect(second!.r).toMatchObject({ workspace_id: ws, created: false });
  });

  it("blocks direct table writes and pairing-table reads from clients", async () => {
    await expect(as(a, "insert into public.video_progress (workspace_id, channel_id, video_id, day_number, video_number) values ($1, 'ai-facts', 'ai-facts-d001-v1', 1, 1)", [ws])).rejects.toThrow(/permission denied/);
    await expect(as(a, "select * from public.workspace_pairing_codes")).rejects.toThrow(/permission denied/);
  });

  it("enforces the upload sequence and idempotency", async () => {
    const [locked] = await apply(a, op("mark_uploaded", 1, 2));
    expect(locked).toMatchObject({ status: "rejected", reason: "sequence_locked" });

    const upload = op("mark_uploaded", 1, 1, { youtube_url: "https://youtu.be/BBBBBBBBBBB", youtube_video_id: "BBBBBBBBBBB", uploaded_at: "2026-11-04" });
    const res = await apply(a, op("checklist", 1, 1, { item: "imageGenerated", value: true }), upload);
    expect(res.map((r) => r.status)).toEqual(["applied", "applied"]);
    expect(res[1]!.videos![0]).toMatchObject({ upload_status: "uploaded", production_status: "completed", youtube_video_id: "BBBBBBBBBBB" });

    const [replay] = await apply(a, upload);
    expect(replay!.status).toBe("duplicate");
    const history = await as(a, "select id from public.activity_history where client_op_id = $1", [upload.op_id]);
    expect(history).toHaveLength(1);
  });

  it("applies state-machine guards server-side", async () => {
    expect((await apply(a, op("mark_uploaded", 1, 2, { youtube_video_id: "BBBBBBBBBBB" })))[0]).toMatchObject({ reason: "duplicate_youtube_video" });
    expect((await apply(a, op("skip_video", 1, 1)))[0]).toMatchObject({ reason: "already_uploaded" });
    const failed = await apply(a, op("mark_upload_failed", 1, 2), op("mark_uploaded", 2, 1));
    expect(failed[0]!.status).toBe("applied");
    expect(failed[1]).toMatchObject({ status: "rejected", reason: "sequence_locked" });
    expect((await apply(a, op("set_notes", 1, 1, { notes: "x" }, { epoch: 99 })))[0]).toMatchObject({ reason: "stale_epoch" });
  });

  it("skip day keeps uploads, restore day restores only day-scoped skips (with previous status)", async () => {
    const videos = [
      { video_id: "ai-facts-d001-v1", video_number: 1 },
      { video_id: "ai-facts-d001-v2", video_number: 2 },
    ];
    const [skip] = await apply(a, op("skip_day", 1, 1, { reason: "travel" }, { video_id: undefined, video_number: undefined, videos }));
    expect(skip!.status).toBe("applied");
    const rows = await as<{ video_id: string; upload_status: string; skip_scope: string | null }>(a, "select video_id, upload_status, skip_scope from public.video_progress order by video_id");
    expect(rows).toEqual([
      { video_id: "ai-facts-d001-v1", upload_status: "uploaded", skip_scope: null },
      { video_id: "ai-facts-d001-v2", upload_status: "skipped", skip_scope: "day" },
    ]);
    // A skipped video resolves the sequence.
    expect((await apply(a, op("mark_uploaded", 2, 1)))[0]!.status).toBe("applied");

    await apply(a, op("restore_day", 1, 1, {}, { video_id: undefined, video_number: undefined, videos }));
    const [v2] = await as<{ upload_status: string }>(a, "select upload_status from public.video_progress where video_id = 'ai-facts-d001-v2'");
    expect(v2!.upload_status).toBe("upload_failed"); // its status before the skip
  });

  it("per-field last-writer-wins ignores older offline edits", async () => {
    await apply(a, op("set_notes", 2, 1, { notes: "newer" }, { client_ts: "2026-11-04T09:00:00Z" }));
    const [stale] = await apply(a, op("set_notes", 2, 1, { notes: "older" }, { client_ts: "2026-11-04T08:00:00Z" }));
    expect(stale!.status).toBe("stale");
    const [row] = await as<{ notes: string }>(a, "select notes from public.video_progress where video_id = 'ai-facts-d002-v1'");
    expect(row!.notes).toBe("newer");
  });

  it("isolates workspaces with RLS", async () => {
    b = await newUser();
    expect(await as(b, "select * from public.video_progress")).toHaveLength(0);
    await expect(apply(b, op("skip_video", 1, 2))).rejects.toThrow(/not_member/);
    await as(b, "select public.create_workspace('dev-bbbbbbbb', 'Phone B')");
    expect(await as(b, "select * from public.video_progress")).toHaveLength(0);
    expect(await as(b, "select * from public.activity_history where workspace_id = $1", [ws])).toHaveLength(0);
  });

  it("pairing: one-time, rotating, rate-limited codes; joining moves the device", async () => {
    const hash = (s: string) => s.padEnd(64, "0").slice(0, 64);
    await as("service", "select public.pairing_create($1, $2, 900)", [a, hash("aaa1")]);
    // client roles can't call the service-only functions
    await expect(as(b, "select public.pairing_create($1, $2, 900)", [b, hash("bbb1")])).rejects.toThrow(/permission denied/);

    const c = await newUser();
    const [wrong] = await as<{ r: { status: string } }>("service", "select public.pairing_redeem($1, $2, 'dev-cccccccc', 'Tablet', 'ip1') as r", [c, hash("nope")]);
    expect(wrong!.r.status).toBe("invalid");
    const [ok] = await as<{ r: { status: string; workspace_id: string } }>("service", "select public.pairing_redeem($1, $2, 'dev-cccccccc', 'Tablet', 'ip1') as r", [c, hash("aaa1")]);
    expect(ok!.r).toMatchObject({ status: "ok", workspace_id: ws });
    expect((await as(c, "select * from public.video_progress")).length).toBeGreaterThan(0);

    const [reuse] = await as<{ r: { status: string } }>("service", "select public.pairing_redeem($1, $2, 'dev-bbbbbbbb', 'Phone B', 'ip2') as r", [b, hash("aaa1")]);
    expect(reuse!.r.status).toBe("invalid");

    await as("service", "select public.pairing_create($1, $2, 900)", [a, hash("old1")]);
    await as("service", "select public.pairing_create($1, $2, 900)", [a, hash("new1")]);
    const [rotated] = await as<{ r: { status: string } }>("service", "select public.pairing_redeem($1, $2, 'dev-bbbbbbbb', 'Phone B', 'ip2') as r", [b, hash("old1")]);
    expect(rotated!.r.status).toBe("invalid");

    const d = await newUser();
    let last = "";
    for (let i = 0; i < 6; i++) {
      const [r] = await as<{ r: { status: string } }>("service", "select public.pairing_redeem($1, $2, 'dev-dddddddd', 'D', 'ip3') as r", [d, hash(`x${i}`)]);
      last = r!.r.status;
    }
    expect(last).toBe("rate_limited");

    // B joins A's workspace with the valid new code: B's own (empty) workspace is left and deleted.
    const [bJoin] = await as<{ r: { status: string } }>("service", "select public.pairing_redeem($1, $2, 'dev-bbbbbbbb', 'Phone B', 'ip4') as r", [b, hash("new1")]);
    expect(bJoin!.r.status).toBe("ok");
    const [m] = await as<{ r: { status: string; workspace_id: string } }>(b, "select public.get_my_membership() as r");
    expect(m!.r).toMatchObject({ status: "active", workspace_id: ws });
  });

  it("revocation denies access immediately and doesn't hand out a new workspace silently", async () => {
    const members = await as<{ id: string; device_label: string }>(a, "select id, device_label from public.workspace_members where revoked_at is null");
    const tablet = members.find((m) => m.device_label === "Tablet")!;
    await as(a, "select public.revoke_device($1)", [tablet.id]);
    const tabletUser = (await db.query<{ user_id: string }>("select user_id from public.workspace_members where id = $1", [tablet.id])).rows[0]!.user_id;
    expect(await as(tabletUser, "select * from public.video_progress")).toHaveLength(0);
    await expect(apply(tabletUser, op("set_notes", 1, 1, { notes: "hacked" }))).rejects.toThrow(/not_member/);
    const [status] = await as<{ r: { status: string } }>(tabletUser, "select public.get_my_membership() as r");
    expect(status!.r.status).toBe("revoked");
    await expect(as(tabletUser, "select public.create_workspace('dev-cccccccc', 'Tablet')")).rejects.toThrow(/device_revoked/);
  });

  it("reset and import bump the epoch and keep history", async () => {
    await expect(as(a, "select public.reset_progress('nope')")).rejects.toThrow(/confirmation_required/);
    const [settings] = await as<{ r: { progress_epoch: number } }>(a, "select public.reset_progress('RESET') as r");
    expect(settings!.r.progress_epoch).toBe(2);
    expect(await as(a, "select * from public.video_progress")).toHaveLength(0);

    const backup = {
      backupVersion: 1,
      videoProgress: [
        { channel_id: "ai-facts", video_id: "ai-facts-d001-v1", day_number: 1, video_number: 1, production_status: "completed", upload_status: "uploaded", publishing_status: "published", checklist: {}, youtube_video_id: "CCCCCCCCCCC", updated_at: "2026-11-04T00:00:00Z" },
      ],
      daySkips: [],
      promptProgress: [{ channel_id: "ai-facts", video_id: "ai-facts-d001-v1", prompt_type: "flow", testing_status: "approved", custom_version: 0, updated_at: "2026-11-04T00:00:00Z" }],
      activity: [],
      settings: { preferences: { x: 1 }, scheduleStartDate: "2026-12-01", timezone: "Asia/Kolkata" },
    };
    const [res] = await as<{ r: { videos: number; prompts: number; settings: { progress_epoch: number } } }>(a, "select public.import_backup($1::jsonb, 'replace') as r", [JSON.stringify(backup)]);
    expect(res!.r).toMatchObject({ videos: 1, prompts: 1 });
    expect(res!.r.settings.progress_epoch).toBe(3);
    const history = await as<{ action_type: string }>(a, "select action_type from public.activity_history where action_type in ('progress_reset','backup_imported')");
    expect(history.map((h) => h.action_type).sort()).toEqual(["backup_imported", "progress_reset"]);
  });
});
