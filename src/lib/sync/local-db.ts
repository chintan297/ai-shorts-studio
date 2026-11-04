import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Op, OpResult } from "@/lib/progress/types";
import type { Snapshot } from "./backend";

export interface RejectedOp {
  op: Op;
  reason: string;
  rejectedAt: string;
}

interface StudioDB extends DBSchema {
  /** Last cloud snapshot, so the app renders instantly and works offline. */
  cache: { key: string; value: { snapshot: Snapshot; savedAt: string } };
  /** Pending operations, in order. */
  outbox: { key: number; value: { seq?: number; op: Op } };
  /** Operations the server refused — shown to the user, never silently dropped. */
  rejected: { key: string; value: RejectedOp };
  /** Local-only "server" for mock mode. */
  mock: { key: string; value: unknown };
}

const DB_NAME = "ai-shorts-studio";
let dbPromise: Promise<IDBPDatabase<StudioDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<StudioDB>(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore("cache");
        database.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
        database.createObjectStore("rejected", { keyPath: "op.op_id" });
        database.createObjectStore("mock");
      },
    });
  }
  return dbPromise;
}

export const localDb = {
  async loadSnapshot(workspaceKey: string) {
    return (await db()).get("cache", workspaceKey);
  },
  async saveSnapshot(workspaceKey: string, snapshot: Snapshot) {
    await (await db()).put("cache", { snapshot, savedAt: new Date().toISOString() }, workspaceKey);
  },
  async clearSnapshots() {
    await (await db()).clear("cache");
  },

  async loadOutbox(): Promise<Op[]> {
    const rows = await (await db()).getAll("outbox");
    return rows.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map((r) => r.op);
  },
  async enqueue(op: Op) {
    await (await db()).add("outbox", { op });
  },
  /** Removes the given op ids from the outbox (after the server confirmed them). */
  async dequeue(opIds: string[]) {
    const database = await db();
    const tx = database.transaction("outbox", "readwrite");
    const ids = new Set(opIds);
    let cursor = await tx.store.openCursor();
    while (cursor) {
      if (ids.has(cursor.value.op.op_id)) await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
  async clearOutbox() {
    await (await db()).clear("outbox");
  },

  async loadRejected(): Promise<RejectedOp[]> {
    return (await db()).getAll("rejected");
  },
  async addRejected(op: Op, result: Pick<OpResult, "reason">) {
    await (await db()).put("rejected", { op, reason: result.reason ?? "rejected", rejectedAt: new Date().toISOString() });
  },
  async dismissRejected(opId: string) {
    await (await db()).delete("rejected", opId);
  },

  async mockGet<T>(key: string): Promise<T | undefined> {
    return (await (await db()).get("mock", key)) as T | undefined;
  },
  async mockPut(key: string, value: unknown) {
    await (await db()).put("mock", value, key);
  },
};
