import { MockBackend } from "./mock-backend";
import { SupabaseBackend } from "./supabase-backend";
import { SyncEngine } from "./engine";

let engine: SyncEngine | null = null;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const CLOUD_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Browser-only singleton. Uses Supabase when configured, otherwise the local mock backend. */
export function getEngine(): SyncEngine {
  if (typeof window === "undefined") throw new Error("getEngine() is browser-only");
  if (!engine) {
    engine = new SyncEngine(CLOUD_CONFIGURED ? new SupabaseBackend(SUPABASE_URL, SUPABASE_KEY) : new MockBackend());
  }
  return engine;
}
