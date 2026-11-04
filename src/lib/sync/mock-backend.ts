/**
 * Development-only backend used when Supabase isn't configured.
 * A single local "server" lives in IndexedDB and uses the same state machine as the client;
 * open tabs are kept in sync through BroadcastChannel. Pairing needs the real cloud.
 */
import { todayIn } from "@/lib/content/schedule";
import { OpRejected, applyOp } from "@/lib/progress/transitions";
import {
  daySkipKey,
  promptKey,
  type ActivityRow,
  type MemberRow,
  type Op,
  type OpResult,
  type ProgressState,
} from "@/lib/progress/types";
import type { DeviceInfo } from "@/lib/workspace/device";
import type { ImportSummary, Membership, RealtimeHandlers, RedeemResult, Snapshot, SyncBackend } from "./backend";
import { localDb } from "./local-db";

interface MockServer {
  snapshot: Snapshot;
}

const KEY = "server";
const CHANNEL = "ass-mock-sync";

export class MockBackend implements SyncBackend {
  readonly kind = "mock" as const;
  private channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;

  private async load(): Promise<MockServer | undefined> {
    return localDb.mockGet<MockServer>(KEY);
  }

  private async save(server: MockServer) {
    await localDb.mockPut(KEY, server);
  }

  async ensureSession() {}

  async getMembership(): Promise<Membership> {
    const server = await this.load();
    if (!server) return { status: "none" };
    return { status: "active", workspaceId: server.snapshot.workspace.id, memberId: server.snapshot.memberId, role: "owner", shared: false };
  }

  async createWorkspace(device: DeviceInfo) {
    const existing = await this.load();
    if (existing) return { workspaceId: existing.snapshot.workspace.id };
    const now = new Date().toISOString();
    const workspaceId = "local-workspace";
    const member: MemberRow = {
      id: "local-member",
      workspace_id: workspaceId,
      device_id: device.deviceId,
      device_label: device.label,
      role: "owner",
      created_at: now,
      last_active_at: now,
      revoked_at: null,
    };
    await this.save({
      snapshot: {
        workspace: { id: workspaceId, name: "My Workspace", created_at: now },
        settings: {
          workspace_id: workspaceId,
          preferences: {},
          schedule_start_date: todayIn(),
          timezone: "Asia/Kolkata",
          content_version: "v1",
          progress_epoch: 1,
          field_clock: {},
          version: 1,
          updated_at: now,
        },
        members: [member],
        memberId: member.id,
        videos: [],
        daySkips: [],
        prompts: [],
        activity: [this.activityRow({ action_type: "workspace_created", notes: `Workspace created on ${device.label}`, device_id: device.deviceId })],
      },
    });
    return { workspaceId };
  }

  async joinSharedWorkspace(device: DeviceInfo) {
    return this.createWorkspace(device);
  }

  private activityRow(partial: Partial<ActivityRow> & Pick<ActivityRow, "action_type">): ActivityRow {
    return {
      id: crypto.randomUUID(),
      client_op_id: null,
      channel_id: null,
      day_number: null,
      video_id: null,
      previous_status: null,
      new_status: null,
      notes: null,
      details: null,
      device_id: null,
      created_at: new Date().toISOString(),
      client_created_at: null,
      ...partial,
    };
  }

  async fetchSnapshot(): Promise<Snapshot> {
    const server = await this.load();
    if (!server) throw new Error("not_member");
    return structuredClone(server.snapshot);
  }

  async applyOps(ops: Op[]): Promise<OpResult[]> {
    const server = await this.load();
    if (!server) throw new Error("not_member");
    const snap = server.snapshot;
    let state: ProgressState = {
      videos: Object.fromEntries(snap.videos.map((v) => [v.video_id, v])),
      daySkips: Object.fromEntries(snap.daySkips.map((d) => [daySkipKey(d.channel_id, d.day_number), d])),
      prompts: Object.fromEntries(snap.prompts.map((p) => [promptKey(p.video_id, p.prompt_type), p])),
      settings: snap.settings,
      workspaceName: snap.workspace.name,
    };
    const results: OpResult[] = [];
    const now = new Date().toISOString();
    for (const op of ops) {
      if (snap.activity.some((a) => a.client_op_id === op.op_id)) {
        results.push({ op_id: op.op_id, status: "duplicate" });
        continue;
      }
      if (op.epoch !== snap.settings.progress_epoch) {
        results.push({ op_id: op.op_id, status: "rejected", reason: "stale_epoch" });
        continue;
      }
      try {
        const outcome = applyOp(state, op, { now, today: todayIn(snap.settings.timezone) });
        state = outcome.state;
        if (outcome.status === "applied" && outcome.activity) {
          snap.activity.unshift(
            this.activityRow({
              ...outcome.activity,
              client_op_id: op.op_id,
              channel_id: op.channel_id ?? null,
              day_number: op.day_number ?? null,
              video_id: op.video_id ?? null,
              device_id: op.device_id,
              client_created_at: op.client_ts,
            }),
          );
        }
        results.push({
          op_id: op.op_id,
          status: outcome.status,
          videos: outcome.videos,
          day_skip: op.channel_id && op.day_number ? state.daySkips[daySkipKey(op.channel_id, op.day_number)] : undefined,
          prompt: op.type === "prompt_update" && op.video_id ? state.prompts[promptKey(op.video_id, op.payload.prompt_type as never)] : undefined,
          settings: op.type === "update_settings" ? (state.settings ?? undefined) : undefined,
        });
      } catch (err) {
        results.push({ op_id: op.op_id, status: "rejected", reason: err instanceof OpRejected ? err.reason : String(err) });
      }
    }
    snap.videos = Object.values(state.videos);
    snap.daySkips = Object.values(state.daySkips);
    snap.prompts = Object.values(state.prompts);
    if (state.settings) snap.settings = state.settings;
    snap.workspace.name = state.workspaceName;
    snap.activity = snap.activity.slice(0, 500);
    await this.save(server);
    this.channel?.postMessage({ type: "changed" });
    return results;
  }

  subscribe(_workspaceId: string, h: RealtimeHandlers) {
    const listener = () => h.onInvalidate();
    this.channel?.addEventListener("message", listener);
    queueMicrotask(() => h.onStatus("subscribed"));
    return () => this.channel?.removeEventListener("message", listener);
  }

  async fetchActivity(filter: { videoId?: string; channelId?: string; limit?: number }) {
    const server = await this.load();
    return (server?.snapshot.activity ?? [])
      .filter((a) => (!filter.videoId || a.video_id === filter.videoId) && (!filter.channelId || a.channel_id === filter.channelId))
      .slice(0, filter.limit ?? 100);
  }

  async fetchAllActivity() {
    const server = await this.load();
    return server?.snapshot.activity ?? [];
  }

  async createPairingCode(): Promise<{ code: string; expiresAt: string }> {
    throw new Error("Device pairing needs Supabase. Add your Supabase URL and anon key to .env.local.");
  }

  async redeemPairingCode(): Promise<RedeemResult> {
    throw new Error("Device pairing needs Supabase. Add your Supabase URL and anon key to .env.local.");
  }

  async touchDevice() {}

  async revokeDevice() {
    throw new Error("Device management needs Supabase.");
  }

  async resetProgress() {
    const server = await this.load();
    if (!server) return;
    server.snapshot.videos = [];
    server.snapshot.daySkips = [];
    server.snapshot.prompts = [];
    server.snapshot.settings.progress_epoch += 1;
    server.snapshot.activity.unshift(this.activityRow({ action_type: "progress_reset", notes: "All progress was reset (static content untouched)" }));
    await this.save(server);
    this.channel?.postMessage({ type: "changed" });
  }

  async importBackup(backup: unknown, mode: "merge" | "replace"): Promise<ImportSummary> {
    const server = await this.load();
    if (!server) throw new Error("not_member");
    const b = backup as Pick<Snapshot, "videos" | "daySkips" | "prompts"> & { videoProgress: Snapshot["videos"]; promptProgress: Snapshot["prompts"]; activity: ActivityRow[] };
    const snap = server.snapshot;
    const mergeBy = <T>(current: T[], incoming: T[], key: (row: T) => string): T[] => {
      const map = new Map(mode === "replace" ? [] : current.map((r) => [key(r), r] as const));
      for (const row of incoming) map.set(key(row), row);
      return [...map.values()];
    };
    snap.videos = mergeBy(snap.videos, b.videoProgress ?? [], (r) => r.video_id);
    snap.daySkips = mergeBy(snap.daySkips, b.daySkips ?? [], (r) => daySkipKey(r.channel_id, r.day_number));
    snap.prompts = mergeBy(snap.prompts, b.promptProgress ?? [], (r) => promptKey(r.video_id, r.prompt_type));
    snap.activity = [...(b.activity ?? []), ...snap.activity].slice(0, 500);
    snap.settings.progress_epoch += 1;
    await this.save(server);
    this.channel?.postMessage({ type: "changed" });
    return {
      videos: b.videoProgress?.length ?? 0,
      days: b.daySkips?.length ?? 0,
      prompts: b.promptProgress?.length ?? 0,
      activity: b.activity?.length ?? 0,
    };
  }
}
