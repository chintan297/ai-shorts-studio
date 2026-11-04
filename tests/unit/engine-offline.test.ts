import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it } from "vitest";
import { MockBackend } from "@/lib/sync/mock-backend";
import { NetworkError } from "@/lib/sync/backend";
import { SyncEngine } from "@/lib/sync/engine";
import type { Op, OpResult } from "@/lib/progress/types";

/** Mock backend whose network can be switched off, to exercise the offline queue. */
class FlakyBackend extends MockBackend {
  offline = false;
  async applyOps(ops: Op[]): Promise<OpResult[]> {
    if (this.offline) throw new NetworkError("Failed to fetch");
    return super.applyOps(ops);
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true, userAgent: "node" }, configurable: true });
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    configurable: true,
  });
});

const waitFor = async (check: () => boolean, ms = 3000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("sync engine (mock backend)", () => {
  it("creates a workspace on first start, queues offline changes and syncs them later", async () => {
    const backend = new FlakyBackend();
    const engine = new SyncEngine(backend);
    await engine.start();
    expect(engine.state.phase).toBe("ready");
    expect(engine.state.indicator).toBe("synced");

    const entry = { type: "skip_video" as const, channel_id: "ai-facts", video_id: "ai-facts-d001-v2", day_number: 1, video_number: 2, payload: { reason: "test" } };

    backend.offline = true;
    await engine.dispatch(entry);
    await waitFor(() => !engine.state.online);
    expect(engine.state.pendingOps).toHaveLength(1);
    expect(engine.state.indicator).toBe("offline");
    // The optimistic view already shows the skip.
    expect(engine.state.progress.videos["ai-facts-d001-v2"]?.upload_status).toBe("skipped");
    // Nothing reached the "server" yet.
    expect((await backend.fetchSnapshot()).videos).toHaveLength(0);

    backend.offline = false;
    await engine.retryNow();
    await waitFor(() => engine.state.pendingOps.length === 0);
    expect(engine.state.indicator).toBe("synced");
    const server = await backend.fetchSnapshot();
    expect(server.videos.find((v) => v.video_id === "ai-facts-d001-v2")?.upload_status).toBe("skipped");
    expect(server.activity.some((a) => a.action_type === "video_skipped")).toBe(true);
    engine.stop();
  });

  it("refuses an invalid action locally instead of queueing it", async () => {
    const engine = new SyncEngine(new FlakyBackend());
    await engine.start();
    await expect(
      engine.dispatch({ type: "mark_uploaded", channel_id: "ai-facts", video_id: "ai-facts-d003-v1", day_number: 3, video_number: 1, payload: {} }),
    ).rejects.toThrow(/sequence_locked/);
    expect(engine.state.pendingOps).toHaveLength(0);
    engine.stop();
  });
});
