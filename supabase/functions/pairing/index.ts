// Supabase Edge Function: one-time workspace pairing codes.
//
//   POST { action: "create" }                                  → { code, expiresAt }
//   POST { action: "redeem", code, deviceId, deviceLabel }     → { status, workspaceId? }
//
// Security:
// - The caller must be a signed-in (anonymous) Supabase user; the JWT is verified here.
// - Codes are 8 Crockford-base32 chars from crypto.getRandomValues (~40 bits), short-lived (15 min),
//   single-use, and stored only as HMAC-SHA256(PAIRING_PEPPER, code) — never in plain text.
// - Redemption is rate-limited (5 failures / 15 min per device and per IP hash) inside the
//   database function `pairing_redeem`, which runs atomically with the service-role key.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32 (no I, L, O, U)
const CODE_LENGTH = 8;
const CODE_TTL_SECONDS = 15 * 60;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const PEPPER = Deno.env.get("PAIRING_PEPPER") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((o) => o.trim());

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = ALLOWED_ORIGINS.includes("*") ? "*" : origin && ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function generateCode(): string {
  // Rejection-free: 256 % 32 === 0, so `byte & 31` is uniformly distributed.
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join("");
}

/** Accepts "abcd-1234", lower case and Crockford look-alikes (I/L → 1, O → 0). */
function normalizeCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (cleaned.length !== CODE_LENGTH) return null;
  for (const ch of cleaned) if (!ALPHABET.includes(ch)) return null;
  return cleaned;
}

async function hmacHex(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PEPPER),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || PEPPER.length < 32) {
    return json({ error: "server_not_configured" }, 500, origin);
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "not_authenticated" }, 401, origin);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: "not_authenticated" }, 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  if (body.action === "create") {
    const code = generateCode();
    const { data, error } = await admin.rpc("pairing_create", {
      p_user: user.id,
      p_code_hash: await hmacHex(code),
      p_ttl_seconds: CODE_TTL_SECONDS,
    });
    if (error) {
      const notMember = error.message.includes("not_member");
      return json({ error: notMember ? "not_member" : "create_failed" }, notMember ? 403 : 500, origin);
    }
    return json({ code: `${code.slice(0, 4)}-${code.slice(4)}`, expiresAt: data.expires_at }, 200, origin);
  }

  if (body.action === "redeem") {
    const code = typeof body.code === "string" ? normalizeCode(body.code) : null;
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.slice(0, 64) : "";
    const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 80) : "Device";
    if (deviceId.length < 8) return json({ error: "invalid_device" }, 400, origin);

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
    const ipHash = ip ? await hmacHex(`ip:${ip}`) : null;
    // A malformed code still counts as a failed attempt (hash of the raw input never matches).
    const codeHash = await hmacHex(code ?? `invalid:${crypto.randomUUID()}`);

    const { data, error } = await admin.rpc("pairing_redeem", {
      p_user: user.id,
      p_code_hash: codeHash,
      p_device_id: deviceId,
      p_device_label: deviceLabel,
      p_ip_hash: ipHash,
    });
    if (error) return json({ error: "redeem_failed" }, 500, origin);
    if (data.status === "rate_limited") return json({ status: "rate_limited" }, 429, origin);
    if (data.status === "invalid") {
      return json({ status: "invalid", remainingAttempts: data.remaining_attempts }, 400, origin);
    }
    return json({ status: "ok", workspaceId: data.workspace_id }, 200, origin);
  }

  return json({ error: "unknown_action" }, 400, origin);
});
