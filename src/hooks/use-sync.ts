"use client";

import { useSyncExternalStore } from "react";
import type { EngineState, SyncEngine } from "@/lib/sync/engine";
import { getEngine } from "@/lib/sync";

const SERVER_STATE: EngineState = {
  phase: "booting",
  backendKind: "supabase",
  error: null,
  device: null,
  workspace: null,
  memberId: null,
  members: [],
  progress: { videos: {}, daySkips: {}, prompts: {}, settings: null, workspaceName: "My Workspace" },
  pendingOps: [],
  rejected: [],
  activity: [],
  indicator: "syncing",
  online: true,
  realtime: "connecting",
  lastSyncedAt: null,
  createdHere: false,
};

const noopSubscribe = () => () => {};

/** Subscribe to a slice of the sync engine state. Selectors must return stable references or primitives. */
export function useSync<T>(selector: (state: EngineState) => T): T {
  const isBrowser = typeof window !== "undefined";
  const engine = isBrowser ? getEngine() : null;
  return useSyncExternalStore(
    engine?.subscribe ?? noopSubscribe,
    () => selector(engine ? engine.getState() : SERVER_STATE),
    () => selector(SERVER_STATE),
  );
}

/** During server prerendering there is no engine; methods are only called from effects/handlers on the client. */
const SERVER_ENGINE = new Proxy({} as SyncEngine, {
  get: () => () => Promise.reject(new Error("The sync engine is only available in the browser")),
});

export function useEngine(): SyncEngine {
  return typeof window === "undefined" ? SERVER_ENGINE : getEngine();
}
