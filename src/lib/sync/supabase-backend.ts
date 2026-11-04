import { FunctionsHttpError, createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityRow,
  DaySkipRow,
  MemberRow,
  Op,
  OpResult,
  PromptProgressRow,
  SettingsRow,
  VideoProgressRow,
} from "@/lib/progress/types";
import type { DeviceInfo } from "@/lib/workspace/device";
import {
  NetworkError,
  NotMemberError,
  isNetworkFailure,
  type ImportSummary,
  type Membership,
  type RealtimeHandlers,
  type RedeemResult,
  type Snapshot,
  type SyncBackend,
  type WorkspaceRow,
} from "./backend";

const PAGE = 1000;

function fail(error: { message?: string; code?: string } | null | undefined): never {
  if (isNetworkFailure(error)) throw new NetworkError(error?.message);
  if (error?.message?.includes("not_member") || error?.code === "42501") throw new NotMemberError(error?.message);
  throw new Error(error?.message ?? "request_failed");
}

export class SupabaseBackend implements SyncBackend {
  readonly kind = "supabase" as const;
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "ass-auth" },
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }

  async ensureSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) fail(error);
    if (data.session) return;
    const result = await this.client.auth.signInAnonymously();
    if (result.error) fail(result.error);
  }

  async getMembership(): Promise<Membership> {
    const { data, error } = await this.client.rpc("get_my_membership");
    if (error) fail(error);
    const m = data as { status: string; workspace_id?: string; member_id?: string; role?: "owner" | "member"; shared?: boolean };
    if (m.status === "active" && m.workspace_id && m.member_id) {
      return { status: "active", workspaceId: m.workspace_id, memberId: m.member_id, role: m.role ?? "member", shared: Boolean(m.shared) };
    }
    return { status: m.status === "revoked" ? "revoked" : "none" };
  }

  async createWorkspace(device: DeviceInfo, force = false) {
    const { data, error } = await this.client.rpc("create_workspace", {
      p_device_id: device.deviceId,
      p_device_label: device.label,
      p_force: force,
    });
    if (error) fail(error);
    return { workspaceId: (data as { workspace_id: string }).workspace_id };
  }

  async joinSharedWorkspace(device: DeviceInfo) {
    const { data, error } = await this.client.rpc("join_shared_workspace", { p_device_id: device.deviceId, p_device_label: device.label });
    if (error) fail(error);
    return { workspaceId: (data as { workspace_id: string }).workspace_id };
  }

  private async selectAll<T>(table: string, order: string): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.client.from(table).select("*").order(order).range(from, from + PAGE - 1);
      if (error) fail(error);
      rows.push(...((data ?? []) as T[]));
      if (!data || data.length < PAGE) return rows;
    }
  }

  async fetchSnapshot(): Promise<Snapshot> {
    const membership = await this.getMembership();
    if (membership.status !== "active") throw new NotMemberError();
    const [workspace, settings, members, videos, daySkips, prompts, activity] = await Promise.all([
      this.client.from("workspaces").select("id,name,created_at").single(),
      this.client.from("workspace_settings").select("*").single(),
      this.client.from("workspace_members").select("id,workspace_id,device_id,device_label,role,created_at,last_active_at,revoked_at").order("created_at"),
      this.selectAll<VideoProgressRow>("video_progress", "video_id"),
      this.selectAll<DaySkipRow>("day_skips", "day_number"),
      this.selectAll<PromptProgressRow>("prompt_progress", "video_id"),
      this.client.from("activity_history").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    for (const r of [workspace, settings, members, activity]) if (r.error) fail(r.error);
    return {
      workspace: workspace.data as WorkspaceRow,
      settings: settings.data as SettingsRow,
      members: (members.data ?? []) as MemberRow[],
      memberId: membership.memberId,
      videos,
      daySkips,
      prompts,
      activity: (activity.data ?? []) as ActivityRow[],
    };
  }

  async applyOps(ops: Op[]): Promise<OpResult[]> {
    const { data, error } = await this.client.rpc("apply_ops", { p_ops: ops });
    if (error) fail(error);
    return data as OpResult[];
  }

  subscribe(workspaceId: string, h: RealtimeHandlers) {
    const filter = `workspace_id=eq.${workspaceId}`;
    const channel = this.client.channel(`workspace-${workspaceId}`);
    const on = <T>(table: string, cb: (row: T) => void, events: "*" | "INSERT" = "*") =>
      channel.on("postgres_changes" as never, { event: events, schema: "public", table, filter } as never, (payload: {
        eventType: string;
        new: T;
      }) => {
        if (payload.eventType === "DELETE") h.onInvalidate();
        else cb(payload.new);
      });
    on<VideoProgressRow>("video_progress", h.onVideo);
    on<DaySkipRow>("day_skips", h.onDaySkip);
    on<PromptProgressRow>("prompt_progress", h.onPrompt);
    on<SettingsRow>("workspace_settings", h.onSettings);
    on<MemberRow>("workspace_members", h.onMember);
    on<ActivityRow>("activity_history", h.onActivity, "INSERT");
    // `workspaces` isn't in the realtime publication; renames arrive through workspace_settings (see engine.onSettings).
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") h.onStatus("subscribed");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") h.onStatus("error");
      else if (status === "CLOSED") h.onStatus("closed");
    });
    return () => {
      void this.client.removeChannel(channel);
    };
  }

  async fetchActivity(filter: { videoId?: string; channelId?: string; limit?: number }) {
    let query = this.client.from("activity_history").select("*").order("created_at", { ascending: false }).limit(filter.limit ?? 100);
    if (filter.videoId) query = query.eq("video_id", filter.videoId);
    if (filter.channelId) query = query.eq("channel_id", filter.channelId);
    const { data, error } = await query;
    if (error) fail(error);
    return (data ?? []) as ActivityRow[];
  }

  fetchAllActivity() {
    return this.selectAll<ActivityRow>("activity_history", "created_at");
  }

  private async invokePairing<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.functions.invoke("pairing", { body });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => ({}));
        return payload as T;
      }
      if (isNetworkFailure(error)) throw new NetworkError(error.message);
      throw new Error(error.message);
    }
    return data as T;
  }

  async createPairingCode() {
    const result = await this.invokePairing<{ code?: string; expiresAt?: string; error?: string }>({ action: "create" });
    if (!result.code || !result.expiresAt) {
      if (result.error === "not_member") throw new NotMemberError();
      throw new Error(result.error ?? "create_failed");
    }
    return { code: result.code, expiresAt: result.expiresAt };
  }

  async redeemPairingCode(code: string, device: DeviceInfo): Promise<RedeemResult> {
    const result = await this.invokePairing<{ status?: string; workspaceId?: string; remainingAttempts?: number; error?: string }>({
      action: "redeem",
      code,
      deviceId: device.deviceId,
      deviceLabel: device.label,
    });
    if (result.status === "ok" && result.workspaceId) return { status: "ok", workspaceId: result.workspaceId };
    if (result.status === "rate_limited") return { status: "rate_limited" };
    if (result.status === "invalid") return { status: "invalid", remainingAttempts: result.remainingAttempts };
    throw new Error(result.error ?? "redeem_failed");
  }

  async touchDevice(label?: string) {
    const { error } = await this.client.rpc("touch_device", { p_device_label: label ?? null });
    if (error) fail(error);
  }

  async revokeDevice(memberId: string) {
    const { error } = await this.client.rpc("revoke_device", { p_member_id: memberId });
    if (error) fail(error);
  }

  async resetProgress() {
    const { error } = await this.client.rpc("reset_progress", { p_confirm: "RESET" });
    if (error) fail(error);
  }

  async importBackup(backup: unknown, mode: "merge" | "replace"): Promise<ImportSummary> {
    const { data, error } = await this.client.rpc("import_backup", { p_backup: backup, p_mode: mode });
    if (error) fail(error);
    const d = data as ImportSummary;
    return { videos: d.videos, days: d.days, prompts: d.prompts, activity: d.activity };
  }
}
