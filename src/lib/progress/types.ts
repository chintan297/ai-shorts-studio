import type { ChannelId } from "@/lib/content/schema";

export const PRODUCTION_STATUSES = [
  "pending",
  "in_progress",
  "image_generated",
  "video_generated",
  "thumbnail_ready",
  "ready_for_upload",
  "completed",
  "failed",
] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const UPLOAD_STATUSES = ["not_uploaded", "uploaded", "upload_failed", "skipped"] as const;
export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

export const PUBLISHING_STATUSES = [
  "not_published",
  "scheduled_manually",
  "published",
  "private",
  "unlisted",
] as const;
export type PublishingStatus = (typeof PUBLISHING_STATUSES)[number];

export const CHECKLIST_ITEMS = [
  { key: "imageGenerated", label: "Image Generated" },
  { key: "imageReviewed", label: "Image Reviewed" },
  { key: "videoGenerated", label: "Video Generated" },
  { key: "videoReviewed", label: "Video Reviewed" },
  { key: "thumbnailReady", label: "Thumbnail Ready" },
  { key: "youtubeDetailsReady", label: "YouTube Details Ready" },
  { key: "readyForUpload", label: "Ready for Upload" },
] as const;
export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];
export type Checklist = Partial<Record<ChecklistKey, boolean>>;

export const PROMPT_TYPES = ["image", "flow", "thumbnail"] as const;
export type PromptType = (typeof PROMPT_TYPES)[number];
export const TESTING_STATUSES = ["untested", "testing", "approved", "failed"] as const;
export type TestingStatus = (typeof TESTING_STATUSES)[number];

export interface Analytics {
  views?: number;
  likes?: number;
  comments?: number;
  subscribersGained?: number;
  averageViewDurationSeconds?: number;
  retentionPercent?: number;
  recordedAt?: string;
}

export interface PreSkip {
  production_status: ProductionStatus;
  upload_status: UploadStatus;
  publishing_status: PublishingStatus;
}

/** Mirrors the `video_progress` table row (snake_case on purpose — rows travel unchanged to/from the DB and backups). */
export interface VideoProgressRow {
  channel_id: ChannelId;
  video_id: string;
  day_number: number;
  video_number: number;
  production_status: ProductionStatus;
  upload_status: UploadStatus;
  publishing_status: PublishingStatus;
  checklist: Checklist;
  skip_scope: "video" | "day" | null;
  skip_reason: string | null;
  skipped_at: string | null;
  pre_skip: PreSkip | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  uploaded_at: string | null;
  published_at: string | null;
  notes: string | null;
  analytics: Analytics | null;
  field_clock: Record<string, string>;
  version: number;
  updated_at: string;
  updated_by_device: string | null;
}

export interface DaySkipRow {
  channel_id: ChannelId;
  day_number: number;
  reason: string | null;
  skipped_at: string;
  restored_at: string | null;
  version: number;
  updated_at: string;
}

export interface PromptProgressRow {
  channel_id: ChannelId;
  video_id: string;
  prompt_type: PromptType;
  testing_status: TestingStatus;
  approved_version: string | null;
  custom_text: string | null;
  custom_version: number;
  feedback: string | null;
  failure_reason: string | null;
  field_clock: Record<string, string>;
  version: number;
  updated_at: string;
}

export interface WorkspacePreferences {
  slots?: Partial<Record<ChannelId, [string, string]>>;
  categoryDecisions?: Record<string, "approved" | "rejected">;
  [key: string]: unknown;
}

export interface SettingsRow {
  workspace_id: string;
  preferences: WorkspacePreferences;
  schedule_start_date: string;
  timezone: string;
  content_version: string;
  progress_epoch: number;
  field_clock: Record<string, string>;
  version: number;
  updated_at: string;
}

export interface MemberRow {
  id: string;
  workspace_id: string;
  device_id: string;
  device_label: string;
  role: "owner" | "member";
  created_at: string;
  last_active_at: string;
  revoked_at: string | null;
}

export const ACTION_TYPES = [
  "workspace_created",
  "video_started",
  "checklist_updated",
  "image_generated",
  "video_generated",
  "video_completed",
  "video_uploaded",
  "upload_failed",
  "upload_reverted",
  "video_published",
  "publishing_status_changed",
  "video_skipped",
  "day_skipped",
  "video_restored",
  "day_restored",
  "prompt_updated",
  "prompt_status_changed",
  "status_changed",
  "youtube_url_updated",
  "notes_added",
  "analytics_updated",
  "settings_updated",
  "device_connected",
  "device_disconnected",
  "pairing_code_regenerated",
  "backup_imported",
  "progress_reset",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface ActivityRow {
  id: string;
  client_op_id: string | null;
  channel_id: string | null;
  day_number: number | null;
  video_id: string | null;
  action_type: ActionType;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  details: Record<string, unknown> | null;
  device_id: string | null;
  created_at: string;
  client_created_at: string | null;
}

export interface ProgressState {
  videos: Record<string, VideoProgressRow>;
  /** key: `${channelId}:${dayNumber}` */
  daySkips: Record<string, DaySkipRow>;
  /** key: `${videoId}:${promptType}` */
  prompts: Record<string, PromptProgressRow>;
  settings: SettingsRow | null;
  workspaceName: string;
}

export const daySkipKey = (channelId: string, day: number) => `${channelId}:${day}`;
export const promptKey = (videoId: string, type: PromptType) => `${videoId}:${type}`;

// ---------------------------------------------------------------------------
// Operations — the only way progress changes (queued offline, applied by `apply_ops`)
// ---------------------------------------------------------------------------

export type VideoOpType =
  | "checklist"
  | "set_production_status"
  | "save_upload_details"
  | "mark_uploaded"
  | "mark_upload_failed"
  | "revert_upload"
  | "set_publishing_status"
  | "skip_video"
  | "restore_video"
  | "set_notes"
  | "set_analytics";
export type DayOpType = "skip_day" | "restore_day";
export type OpType = VideoOpType | DayOpType | "prompt_update" | "update_settings";

export interface Op {
  op_id: string;
  type: OpType;
  channel_id?: string;
  video_id?: string;
  day_number?: number;
  video_number?: number;
  videos?: Array<{ video_id: string; video_number: number }>;
  payload: Record<string, unknown>;
  client_ts: string;
  device_id: string;
  epoch: number;
}

export type OpInput = Omit<Op, "op_id" | "client_ts" | "device_id" | "epoch">;

export interface OpResult {
  op_id: string;
  status: "applied" | "stale" | "duplicate" | "rejected";
  reason?: string;
  videos?: VideoProgressRow[];
  day_skip?: DaySkipRow;
  prompt?: PromptProgressRow;
  settings?: SettingsRow;
}

export const REJECTION_MESSAGES: Record<string, string> = {
  sequence_locked: "This video is locked. Upload or skip the earlier videos in this channel first.",
  video_skipped: "This video is skipped. Restore it before you mark it uploaded.",
  already_uploaded: "This video is already marked as uploaded.",
  not_uploaded: "Mark the video as uploaded first.",
  later_videos_uploaded: "Later videos in this channel are already uploaded, so this upload can't be reverted.",
  invalid_transition: "That status change isn't allowed from the video's current state.",
  duplicate_youtube_video: "This YouTube video is already recorded against another planned video.",
  stale_epoch: "Progress was reset or a backup was imported, so this older change was discarded.",
  invalid_value: "One of the values is invalid (check the YouTube video ID and text lengths).",
  not_member: "This device is no longer connected to the workspace.",
};
