/**
 * One-command cloud setup: link → apply migrations → pairing secret → deploy Edge Function → verify.
 *
 *   npm run supabase:setup
 *
 * Reads from .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_ACCESS_TOKEN (dashboard → Account → Access Tokens) and SUPABASE_DB_PASSWORD.
 * Secrets are passed through the environment and never printed.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const ref = /^https:\/\/([a-z0-9]{20})\.supabase\.co/.exec(url)?.[1];

const missing = [
  !ref && "NEXT_PUBLIC_SUPABASE_URL (https://<ref>.supabase.co)",
  !key && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  !process.env.SUPABASE_ACCESS_TOKEN && "SUPABASE_ACCESS_TOKEN",
  !process.env.SUPABASE_DB_PASSWORD && "SUPABASE_DB_PASSWORD",
].filter(Boolean);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

function run(label: string, args: string[], { allowFail = false } = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npx", ["supabase", ...args], { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: process.env });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.replaceAll(process.env.SUPABASE_DB_PASSWORD!, "***").replaceAll(process.env.SUPABASE_ACCESS_TOKEN!, "***");
  console.log(out.trim().split("\n").slice(-12).join("\n"));
  if (result.status !== 0 && !allowFail) {
    console.error(`✗ ${label} failed`);
    process.exit(1);
  }
  return { ok: result.status === 0, out };
}

run("Link project", ["link", "--project-ref", ref!]);
run("Apply database migrations", ["db", "push", "--remote", "--password", process.env.SUPABASE_DB_PASSWORD!, "--include-all", "--yes"]);

const secrets = run("Read Edge Function secrets", ["secrets", "list", "--project-ref", ref!], { allowFail: true });
if (!secrets.out.includes("PAIRING_PEPPER")) {
  // Generated once and stored only in Supabase; rotating it invalidates outstanding pairing codes (harmless).
  run("Set PAIRING_PEPPER secret", ["secrets", "set", `PAIRING_PEPPER=${randomBytes(32).toString("hex")}`, "--project-ref", ref!, "--yes"]);
} else {
  console.log("PAIRING_PEPPER already set — kept.");
}
run("Deploy pairing Edge Function", ["functions", "deploy", "pairing", "--project-ref", ref!, "--no-verify-jwt", "--use-api", "--yes"]);

console.log("\n▶ Verify");
const client = createClient(url, key, { auth: { persistSession: false } });
const signIn = await client.auth.signInAnonymously();
if (signIn.error) {
  console.error(`✗ Anonymous sign-in: ${signIn.error.message}\n  → Dashboard → Authentication → Sign In / Providers → enable "Allow anonymous sign-ins".`);
  process.exit(1);
}
const membership = await client.rpc("get_my_membership");
console.log(membership.error ? `✗ RPC check failed: ${membership.error.message}` : `✓ Database ready (membership: ${membership.data.status})`);
const fn = await client.functions.invoke("pairing", { body: { action: "create" } });
// A fresh anonymous user has no workspace, so "not_member" (403) proves the function is deployed and verifying JWTs.
const fnStatus = (fn.error as { context?: Response } | null)?.context?.status;
console.log(fnStatus === 403 ? "✓ Pairing function deployed and checking membership" : `? Pairing function responded with ${fnStatus ?? "200"}`);
console.log("\nDone. Next: npm run test:db");
