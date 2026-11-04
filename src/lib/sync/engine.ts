import { todayIn } from "@/lib/content/schedule";
import { OpRejected, applyOp } from "@/lib/progress/transitions";
import {
  daySkipKey,
  promptKey,
  type ActivityRow,
  type MemberRow,
  type Op,
  type OpInput,
  type OpResult,
  type ProgressState,
  type VideoProgressRow,
} from "@/lib/progress/types";
import { getDevice, setDeviceLabel, type DeviceInfo } from "@/lib/workspace/device";
import {
  NetworkError,
  NotMemberError,
  isNetworkFailure,
  type ImportSummary,
  type RedeemResult,
  type Snapshot,
  type SyncBackend,
  type WorkspaceRow,
} from "./backend";
import { localDb, type RejectedOp } from "./local-db";

export type Phase = "booting" | "ready" | "revoked" | "error";
export type Indicator = "syncing" | "synced" | "offline" | "failed" | "pending";

export interface EngineState {
  phase: Phase;
  backendKind: SyncBackend["kind"];
  error: string | null;
  device: DeviceInfo | null;
  workspace: WorkspaceRow | null;
  memberId: string | null;
  members: MemberRow[];
  /** Confirmed cloud state + pending local operations applied on top. */
  progress: ProgressState;
  pendingOps: Op[];
  rejected: RejectedOp[];
  activity: ActivityRow[];
  indicator: Indicator;
  online: boolean;
  realtime: "connecting" | "subscribed" | "error" | "closed";
  lastSyncedAt: string | null;
  /** The workspace was created on this device during this session (offer "connect existing"). */
  createdHere: boolean;
}

const CACHE_KEY = "current";
const EMPTY_PROGRESS: ProgressState = { videos: {}, daySkips: {}, prompts: {}, settings: null, workspaceName: "My Workspace" };
const BATCH = 25;
const MAX_BACKOFF = 60_000;

function fromSnapshot(s: Snapshot): ProgressState {
  return {
    videos: Object.fromEntries(s.videos.map((v) => [v.video_id, v])),
    daySkips: Object.fromEntries(s.daySkips.map((d) => [daySkipKey(d.channel_id, d.day_number), d])),
    prompts: Object.fromEntries(s.prompts.map((p) => [promptKey(p.video_id, p.prompt_type), p])),
    settings: s.settings,
    workspaceName: s.workspace.name,
  };
}

export class SyncEngine {
  private listeners = new Set<() => void>();
  private confirmed: ProgressState = EMPTY_PROGRESS;
  private snapshot: Snapshot | null = null;
  private flushing = false;
  /** A flush was requested while one was running (e.g. a change made during a refresh): run again afterwards. */
  private flushAgain = false;
  private networkDown = false;
  private lastError: string | null = null;
  private backoff = 2_000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private memberTimer: ReturnType<typeof setInterval> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private cacheTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeRealtime: (() => void) | null = null;
  private started = false;
  /** True once this session has reached the server (session, membership, snapshot, realtime). */
  private connected = false;

  state: EngineState;

  constructor(private backend: SyncBackend) {
    this.state = {
      phase: "booting",
      backendKind: backend.kind,
      error: null,
      device: null,
      workspace: null,
      memberId: null,
      members: [],
      progress: EMPTY_PROGRESS,
      pendingOps: [],
      rejected: [],
      activity: [],
      indicator: "syncing",
      online: true,
      realtime: "connecting",
      lastSyncedAt: null,
      createdHere: false,
    };
  }

  // ------------------------------------------------------------------ store API
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  private set(patch: Partial<EngineState>) {
    this.state = { ...this.state, ...patch };
    this.state.indicator = this.computeIndicator();
    for (const l of this.listeners) l();
  }

  private computeIndicator(): Indicator {
    const s = this.state;
    if (!s.online) return "offline";
    if (this.flushing) return "syncing";
    if (this.lastError || s.rejected.length > 0) return "failed";
    if (s.pendingOps.length > 0) return "pending";
    if (!s.lastSyncedAt) return "syncing";
    return "synced";
  }

  private recompute(extra: Partial<EngineState> = {}) {
    let view = this.confirmed;
    const ctx = { now: new Date().toISOString(), today: todayIn(this.confirmed.settings?.timezone) };
    for (const op of extra.pendingOps ?? this.state.pendingOps) {
      try {
        view = applyOp(view, op, ctx).state;
      } catch {
        // The server will reject it too; it shows up in "Rejected changes" after the next flush.
      }
    }
    this.set({ ...extra, progress: view });
  }

  // ------------------------------------------------------------------ lifecycle
  async start() {
    if (this.started) return;
    this.started = true;
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      document.addEventListener("visibilitychange", this.handleVisibility);
    }
    const device = getDevice();
    const [cached, pendingOps, rejected] = await Promise.all([
      localDb.loadSnapshot(CACHE_KEY).catch(() => undefined),
      localDb.loadOutbox().catch(() => []),
      localDb.loadRejected().catch(() => []),
    ]);
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    if (cached) this.adoptSnapshot(cached.snapshot);
    this.recompute({
      device,
      pendingOps,
      rejected,
      online,
      phase: cached ? "ready" : "booting",
    });
    await this.connect();
    this.memberTimer = setInterval(() => void this.checkMembership(), 45_000);
  }

  stop() {
    this.unsubscribeRealtime?.();
    for (const t of [this.retryTimer, this.refreshTimer, this.cacheTimer]) if (t) clearTimeout(t);
    if (this.memberTimer) clearInterval(this.memberTimer);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }
    this.started = false;
  }

  private async connect() {
    const device = this.state.device ?? getDevice();
    try {
      await this.backend.ensureSession();
      let membership = await this.backend.getMembership();
      if (membership.status === "revoked") return this.markRevoked();
      let createdHere = false;
      if (membership.status === "none") {
        await this.backend.createWorkspace(device);
        createdHere = true;
        membership = await this.backend.getMembership();
      }
      if (membership.status !== "active") return this.markRevoked();
      await this.refresh();
      this.subscribeRealtime(membership.workspaceId);
      this.connected = true;
      this.networkDown = false;
      this.backoff = 2_000;
      this.set({ phase: "ready", error: null, createdHere: createdHere || this.state.createdHere, online: true });
      // Read the label now (not the value captured at connect start): the user may have renamed the device meanwhile.
      void this.backend.touchDevice(this.state.device?.label ?? device.label).catch(() => undefined);
      void this.flush();
    } catch (err) {
      if (err instanceof NotMemberError) return this.markRevoked();
      const network = err instanceof NetworkError || isNetworkFailure(err);
      if (network) this.networkDown = true;
      this.set({
        phase: this.snapshot ? "ready" : "error",
        error: network ? "You're offline. Connect to the internet once to set up this device." : (err as Error).message,
        online: !network && navigator.onLine,
      });
      this.scheduleRetry(() => this.connect());
    }
  }

  private markRevoked() {
    this.connected = false;
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = null;
    // The device lost access: drop its local copy of the workspace too (queued ops can never sync).
    void localDb.clearSnapshots().catch(() => undefined);
    void localDb.clearOutbox().catch(() => undefined);
    this.snapshot = null;
    this.confirmed = EMPTY_PROGRESS;
    this.set({ phase: "revoked", workspace: null, members: [], activity: [], pendingOps: [], progress: EMPTY_PROGRESS, realtime: "closed" });
  }

  private adoptSnapshot(s: Snapshot) {
    this.snapshot = s;
    this.confirmed = fromSnapshot(s);
    this.state = {
      ...this.state,
      workspace: s.workspace,
      memberId: s.memberId,
      members: s.members,
      activity: s.activity,
    };
  }

  /** Full refetch from the cloud (startup, reconnect, reset/import, missed realtime events). */
  async refresh() {
    const snapshot = await this.backend.fetchSnapshot();
    if (this.snapshot && this.snapshot.workspace.id !== snapshot.workspace.id) {
      await localDb.clearOutbox();
      this.state = { ...this.state, pendingOps: [] };
    }
    this.adoptSnapshot(snapshot);
    await localDb.saveSnapshot(CACHE_KEY, snapshot);
    this.recompute({ lastSyncedAt: new Date().toISOString() });
  }

  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      void this.refresh().catch(() => undefined);
    }, 400);
  }

  private persistSoon() {
    if (this.cacheTimer) clearTimeout(this.cacheTimer);
    this.cacheTimer = setTimeout(() => {
      if (!this.snapshot) return;
      const c = this.confirmed;
      const snapshot: Snapshot = {
        ...this.snapshot,
        members: this.state.members,
        activity: this.state.activity.slice(0, 200),
        settings: c.settings ?? this.snapshot.settings,
        workspace: { ...this.snapshot.workspace, name: c.workspaceName },
        videos: Object.values(c.videos),
        daySkips: Object.values(c.daySkips),
        prompts: Object.values(c.prompts),
      };
      this.snapshot = snapshot;
      void localDb.saveSnapshot(CACHE_KEY, snapshot);
    }, 500);
  }

  // ------------------------------------------------------------------ realtime
  private subscribeRealtime(workspaceId: string) {
    this.unsubscribeRealtime?.();
    let wasDisconnected = false;
    this.set({ realtime: "connecting" });
    this.unsubscribeRealtime = this.backend.subscribe(workspaceId, {
      onVideo: (row) => this.mergeVideos([row]),
      onDaySkip: (row) => {
        const key = daySkipKey(row.channel_id, row.day_number);
        const cur = this.confirmed.daySkips[key];
        if (cur && cur.version >= row.version) return;
        this.confirmed = { ...this.confirmed, daySkips: { ...this.confirmed.daySkips, [key]: row } };
        this.recompute();
        this.persistSoon();
      },
      onPrompt: (row) => {
        const key = promptKey(row.video_id, row.prompt_type);
        const cur = this.confirmed.prompts[key];
        if (cur && cur.version >= row.version) return;
        this.confirmed = { ...this.confirmed, prompts: { ...this.confirmed.prompts, [key]: row } };
        this.recompute();
        this.persistSoon();
      },
      onSettings: (row) => {
        const cur = this.confirmed.settings;
        if (cur && row.progress_epoch !== cur.progress_epoch) return this.scheduleRefresh();
        if (cur && cur.version >= row.version) return;
        // A rename touches `workspaces`, which has no realtime feed: refetch when the name clock moved.
        if (cur && row.field_clock?.name !== cur.field_clock?.name) this.scheduleRefresh();
        this.confirmed = { ...this.confirmed, settings: row };
        this.recompute();
        this.persistSoon();
      },
      onMember: (row) => {
        const members = this.state.members.some((m) => m.id === row.id)
          ? this.state.members.map((m) => (m.id === row.id ? { ...m, ...row } : m))
          : [...this.state.members, row];
        if (row.id === this.state.memberId && row.revoked_at) return this.markRevoked();
        this.set({ members });
        this.persistSoon();
      },
      onActivity: (row) => {
        if (this.state.activity.some((a) => a.id === row.id)) return;
        this.set({ activity: [row, ...this.state.activity].slice(0, 300) });
        this.persistSoon();
      },
      onWorkspace: (row) => {
        this.confirmed = { ...this.confirmed, workspaceName: row.name };
        this.recompute({ workspace: { ...(this.state.workspace ?? row), name: row.name } });
      },
      onInvalidate: () => this.scheduleRefresh(),
      onStatus: (status) => {
        if (status === "subscribed" && wasDisconnected) this.scheduleRefresh();
        if (status !== "subscribed") wasDisconnected = true;
        this.set({ realtime: status });
      },
    });
  }

  private mergeVideos(rows: VideoProgressRow[]) {
    let changed = false;
    const videos = { ...this.confirmed.videos };
    for (const row of rows) {
      const cur = videos[row.video_id];
      if (cur && cur.version >= row.version) continue;
      videos[row.video_id] = row;
      changed = true;
    }
    if (!changed) return;
    this.confirmed = { ...this.confirmed, videos };
    this.recompute();
    this.persistSoon();
  }

  // ------------------------------------------------------------------ operations
  /** Applies an operation optimistically, queues it durably, and syncs it. Throws OpRejected for invalid actions. */
  async dispatch(input: OpInput) {
    if (this.state.phase === "revoked") throw new NotMemberError();
    const device = this.state.device ?? getDevice();
    const op: Op = {
      ...input,
      op_id: crypto.randomUUID(),
      client_ts: new Date().toISOString(),
      device_id: device.deviceId,
      epoch: this.confirmed.settings?.progress_epoch ?? 1,
    };
    // Validate against what the user currently sees (throws OpRejected with a reason code).
    applyOp(this.state.progress, op, { now: op.client_ts, today: todayIn(this.confirmed.settings?.timezone) });
    await localDb.enqueue(op);
    this.recompute({ pendingOps: [...this.state.pendingOps, op] });
    void this.flush();
  }

  async flush(): Promise<void> {
    if (this.flushing) {
      this.flushAgain = true;
      return;
    }
    if (this.state.pendingOps.length === 0 || this.state.phase !== "ready" || !this.snapshot) return;
    this.flushing = true;
    this.set({});
    let needsRefresh = false;
    try {
      while (this.state.pendingOps.length > 0) {
        const batch = this.state.pendingOps.slice(0, BATCH);
        const results = await this.backend.applyOps(batch);
        const byId = new Map(results.map((r) => [r.op_id, r] as const));
        const done: string[] = [];
        const rejected: RejectedOp[] = [];
        for (const op of batch) {
          const result = byId.get(op.op_id);
          if (!result) continue;
          done.push(op.op_id);
          if (result.status === "rejected") {
            await localDb.addRejected(op, result);
            rejected.push({ op, reason: result.reason ?? "rejected", rejectedAt: new Date().toISOString() });
            if (result.reason === "stale_epoch") needsRefresh = true;
            continue;
          }
          if (result.status === "duplicate") needsRefresh = true;
          this.mergeResult(result);
        }
        await localDb.dequeue(done);
        const doneSet = new Set(done);
        this.lastError = null;
        this.networkDown = false;
        this.backoff = 2_000;
        this.recompute({
          pendingOps: this.state.pendingOps.filter((op) => !doneSet.has(op.op_id)),
          rejected: [...this.state.rejected, ...rejected],
          lastSyncedAt: new Date().toISOString(),
          online: true,
        });
        if (done.length === 0) break;
      }
      if (needsRefresh) await this.refresh();
    } catch (err) {
      if (err instanceof NotMemberError) {
        this.flushing = false;
        return this.markRevoked();
      }
      if (err instanceof NetworkError || isNetworkFailure(err)) {
        this.networkDown = true;
        this.lastError = null;
        this.set({ online: false });
      } else {
        this.lastError = (err as Error).message;
      }
      this.scheduleRetry(() => this.flush());
    } finally {
      this.flushing = false;
      this.set({});
      if (this.flushAgain) {
        this.flushAgain = false;
        if (this.state.pendingOps.length > 0 && !this.networkDown) void this.flush();
      }
    }
  }

  private mergeResult(result: OpResult) {
    if (result.videos?.length) this.mergeVideos(result.videos);
    let next = this.confirmed;
    if (result.day_skip) {
      const key = daySkipKey(result.day_skip.channel_id, result.day_skip.day_number);
      const cur = next.daySkips[key];
      if (!cur || cur.version < result.day_skip.version) next = { ...next, daySkips: { ...next.daySkips, [key]: result.day_skip } };
    }
    if (result.prompt) {
      const key = promptKey(result.prompt.video_id, result.prompt.prompt_type);
      const cur = next.prompts[key];
      if (!cur || cur.version < result.prompt.version) next = { ...next, prompts: { ...next.prompts, [key]: result.prompt } };
    }
    if (result.settings && (!next.settings || next.settings.version < result.settings.version)) {
      next = { ...next, settings: result.settings };
    }
    if (next !== this.confirmed) {
      this.confirmed = next;
      this.persistSoon();
    }
  }

  private scheduleRetry(fn: () => Promise<void>) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void fn();
    }, delay);
  }

  private handleOnline = () => {
    this.networkDown = false;
    this.backoff = 2_000;
    this.set({ online: true });
    if (!this.connected || this.state.phase === "error") void this.connect();
    else {
      void this.flush();
      this.scheduleRefresh();
    }
  };

  private handleOffline = () => this.set({ online: false });

  private handleVisibility = () => {
    if (document.visibilityState !== "visible") return;
    void this.checkMembership();
    void this.flush();
  };

  private async checkMembership() {
    if (this.state.phase !== "ready" || !navigator.onLine) return;
    try {
      const m = await this.backend.getMembership();
      if (m.status !== "active") this.markRevoked();
      else if (this.networkDown) this.handleOnline();
    } catch {
      // offline or transient — the next check retries
    }
  }

  // ------------------------------------------------------------------ workspace actions
  async dismissRejected(opId: string) {
    await localDb.dismissRejected(opId);
    this.set({ rejected: this.state.rejected.filter((r) => r.op.op_id !== opId) });
  }

  async retryNow() {
    this.lastError = null;
    this.backoff = 2_000;
    if (!this.connected || this.state.phase === "error") await this.connect();
    else {
      await this.flush();
      await this.refresh().catch(() => undefined);
    }
  }

  fetchActivity(filter: { videoId?: string; channelId?: string; limit?: number }) {
    return this.backend.fetchActivity(filter);
  }

  /** Snapshot of confirmed cloud progress + full history, ready for buildBackup(). */
  async collectBackupData() {
    const activity = await this.backend.fetchAllActivity();
    const c = this.confirmed;
    if (!c.settings) throw new Error("Workspace isn't loaded yet");
    return {
      workspaceName: c.workspaceName,
      settings: c.settings,
      videos: Object.values(c.videos),
      daySkips: Object.values(c.daySkips),
      prompts: Object.values(c.prompts),
      activity,
    };
  }

  createPairingCode() {
    return this.backend.createPairingCode();
  }

  /** Connects this device to another workspace. Pending changes for the old workspace are discarded (the UI confirms first). */
  async redeemPairingCode(code: string): Promise<RedeemResult> {
    const device = this.state.device ?? getDevice();
    await this.backend.ensureSession();
    const result = await this.backend.redeemPairingCode(code, device);
    if (result.status === "ok") await this.reboot();
    return result;
  }

  async startNewWorkspace() {
    const device = this.state.device ?? getDevice();
    await this.backend.ensureSession();
    await this.backend.createWorkspace(device, true);
    await this.reboot();
    this.set({ createdHere: true });
  }

  private async reboot() {
    this.connected = false;
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = null;
    await Promise.all([localDb.clearOutbox(), localDb.clearSnapshots()]);
    this.snapshot = null;
    this.confirmed = EMPTY_PROGRESS;
    this.recompute({ pendingOps: [], phase: "booting", workspace: null, members: [], activity: [], lastSyncedAt: null, createdHere: false });
    await this.connect();
  }

  async revokeDevice(memberId: string) {
    await this.backend.revokeDevice(memberId);
    if (memberId === this.state.memberId) return this.markRevoked();
    this.set({ members: this.state.members.map((m) => (m.id === memberId ? { ...m, revoked_at: new Date().toISOString() } : m)) });
  }

  async renameDevice(label: string) {
    const device = setDeviceLabel(label);
    this.set({ device });
    await this.backend.touchDevice(device.label);
    this.set({ members: this.state.members.map((m) => (m.id === this.state.memberId ? { ...m, device_label: device.label } : m)) });
  }

  async resetProgress() {
    if (this.state.pendingOps.length) await this.flush();
    await this.backend.resetProgress();
    await this.refresh();
  }

  async importBackup(backup: unknown, mode: "merge" | "replace"): Promise<ImportSummary> {
    if (this.state.pendingOps.length) await this.flush();
    const summary = await this.backend.importBackup(backup, mode);
    await this.refresh();
    return summary;
  }
}

export { OpRejected };
