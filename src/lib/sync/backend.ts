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

export interface WorkspaceRow {
  id: string;
  name: string;
  created_at: string;
}

export interface Snapshot {
  workspace: WorkspaceRow;
  settings: SettingsRow;
  members: MemberRow[];
  memberId: string;
  videos: VideoProgressRow[];
  daySkips: DaySkipRow[];
  prompts: PromptProgressRow[];
  activity: ActivityRow[];
}

export type Membership =
  | { status: "active"; workspaceId: string; memberId: string; role: "owner" | "member"; shared: boolean }
  | { status: "revoked" }
  | { status: "none" };

export interface RealtimeHandlers {
  onVideo(row: VideoProgressRow): void;
  onDaySkip(row: DaySkipRow): void;
  onPrompt(row: PromptProgressRow): void;
  onSettings(row: SettingsRow): void;
  onMember(row: MemberRow): void;
  onActivity(row: ActivityRow): void;
  onWorkspace(row: WorkspaceRow): void;
  /** Rows were deleted (reset/import) — the engine refetches. */
  onInvalidate(): void;
  onStatus(status: "subscribed" | "error" | "closed"): void;
}

export interface ImportSummary {
  videos: number;
  days: number;
  prompts: number;
  activity: number;
}

export type RedeemResult =
  | { status: "ok"; workspaceId: string }
  | { status: "invalid"; remainingAttempts?: number }
  | { status: "rate_limited" };

/** Thrown when the network (not the server) failed — the op stays queued. */
export class NetworkError extends Error {
  constructor(message = "network_error") {
    super(message);
    this.name = "NetworkError";
  }
}

/** Thrown when this device is no longer an active member of a workspace. */
export class NotMemberError extends Error {
  constructor(message = "not_member") {
    super(message);
    this.name = "NotMemberError";
  }
}

export interface SyncBackend {
  readonly kind: "supabase" | "mock";
  ensureSession(): Promise<void>;
  getMembership(): Promise<Membership>;
  createWorkspace(device: DeviceInfo, force?: boolean): Promise<{ workspaceId: string }>;
  /** Shared-workspace mode: joins the single shared workspace (no pairing code). */
  joinSharedWorkspace(device: DeviceInfo): Promise<{ workspaceId: string }>;
  fetchSnapshot(): Promise<Snapshot>;
  applyOps(ops: Op[]): Promise<OpResult[]>;
  subscribe(workspaceId: string, handlers: RealtimeHandlers): () => void;
  fetchActivity(filter: { videoId?: string; channelId?: string; limit?: number }): Promise<ActivityRow[]>;
  /** Every history entry of the workspace (for backups). */
  fetchAllActivity(): Promise<ActivityRow[]>;
  createPairingCode(): Promise<{ code: string; expiresAt: string }>;
  redeemPairingCode(code: string, device: DeviceInfo): Promise<RedeemResult>;
  touchDevice(label?: string): Promise<void>;
  revokeDevice(memberId: string): Promise<void>;
  resetProgress(): Promise<void>;
  importBackup(backup: unknown, mode: "merge" | "replace"): Promise<ImportSummary>;
}

export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = String((error as { message?: string })?.message ?? error ?? "");
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|timeout|aborted/i.test(message);
}
