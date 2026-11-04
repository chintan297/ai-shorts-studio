import { z } from "zod";
import { CHANNEL_IDS } from "@/lib/content/schema";
import {
  ACTION_TYPES,
  PRODUCTION_STATUSES,
  PROMPT_TYPES,
  PUBLISHING_STATUSES,
  TESTING_STATUSES,
  UPLOAD_STATUSES,
  type ActivityRow,
  type DaySkipRow,
  type PromptProgressRow,
  type SettingsRow,
  type VideoProgressRow,
} from "@/lib/progress/types";

export const BACKUP_VERSION = 1;

const iso = z.string().min(10);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableText = (max: number) => z.string().max(max).nullable().optional();

const videoProgress = z.object({
  channel_id: z.enum(CHANNEL_IDS),
  video_id: z.string().regex(/^[a-z-]+-d\d{3}-v[12]$/),
  day_number: z.number().int().min(1).max(90),
  video_number: z.number().int().min(1).max(2),
  production_status: z.enum(PRODUCTION_STATUSES),
  upload_status: z.enum(UPLOAD_STATUSES),
  publishing_status: z.enum(PUBLISHING_STATUSES),
  checklist: z.record(z.string(), z.boolean()).default({}),
  skip_scope: z.enum(["video", "day"]).nullable().optional(),
  skip_reason: nullableText(500),
  skipped_at: iso.nullable().optional(),
  pre_skip: z.record(z.string(), z.string()).nullable().optional(),
  youtube_url: nullableText(300),
  youtube_video_id: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable().optional(),
  uploaded_at: date.nullable().optional(),
  published_at: date.nullable().optional(),
  notes: nullableText(2000),
  analytics: z.record(z.string(), z.union([z.number(), z.string()])).nullable().optional(),
  updated_at: iso,
});

const daySkip = z.object({
  channel_id: z.enum(CHANNEL_IDS),
  day_number: z.number().int().min(1).max(90),
  reason: nullableText(500),
  skipped_at: iso,
  restored_at: iso.nullable().optional(),
  updated_at: iso,
});

const promptProgress = z.object({
  channel_id: z.enum(CHANNEL_IDS),
  video_id: z.string(),
  prompt_type: z.enum(PROMPT_TYPES),
  testing_status: z.enum(TESTING_STATUSES),
  approved_version: nullableText(40),
  custom_text: nullableText(12000),
  custom_version: z.number().int().min(0),
  feedback: nullableText(2000),
  failure_reason: nullableText(1000),
  updated_at: iso,
});

const activity = z.object({
  client_op_id: z.string().uuid().nullable().optional(),
  channel_id: z.string().nullable().optional(),
  day_number: z.number().int().nullable().optional(),
  video_id: z.string().nullable().optional(),
  action_type: z.enum(ACTION_TYPES),
  previous_status: z.string().nullable().optional(),
  new_status: z.string().nullable().optional(),
  notes: nullableText(2000),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  device_id: z.string().nullable().optional(),
  created_at: iso,
  client_created_at: iso.nullable().optional(),
});

export const backupSchema = z
  .object({
    app: z.literal("ai-shorts-studio"),
    backupVersion: z.literal(BACKUP_VERSION),
    exportedAt: iso,
    contentVersion: z.string(),
    workspaceName: z.string().max(80),
    settings: z.object({
      preferences: z.record(z.string(), z.unknown()),
      scheduleStartDate: date,
      timezone: z.string().max(64),
    }),
    videoProgress: z.array(videoProgress),
    daySkips: z.array(daySkip),
    promptProgress: z.array(promptProgress),
    activity: z.array(activity),
  })
  .superRefine((b, ctx) => {
    for (const [i, v] of b.videoProgress.entries()) {
      if (v.video_id !== `${v.channel_id}-d${String(v.day_number).padStart(3, "0")}-v${v.video_number}`) {
        ctx.addIssue({ code: "custom", path: ["videoProgress", i, "video_id"], message: "video_id doesn't match channel/day/video" });
      }
      if ((v.upload_status === "skipped") !== Boolean(v.skip_scope)) {
        ctx.addIssue({ code: "custom", path: ["videoProgress", i, "skip_scope"], message: "skip_scope must be set exactly when the video is skipped" });
      }
    }
  });
export type WorkspaceBackup = z.infer<typeof backupSchema>;

/** Builds a backup: progress, skips, uploads, prompt testing, history and preferences. No auth tokens or pairing secrets. */
export function buildBackup(input: {
  workspaceName: string;
  settings: SettingsRow;
  videos: VideoProgressRow[];
  daySkips: DaySkipRow[];
  prompts: PromptProgressRow[];
  activity: ActivityRow[];
}): WorkspaceBackup {
  return {
    app: "ai-shorts-studio",
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    contentVersion: input.settings.content_version,
    workspaceName: input.workspaceName,
    settings: {
      preferences: input.settings.preferences,
      scheduleStartDate: input.settings.schedule_start_date,
      timezone: input.settings.timezone,
    },
    videoProgress: input.videos.map((v) => ({
      channel_id: v.channel_id,
      video_id: v.video_id,
      day_number: v.day_number,
      video_number: v.video_number,
      production_status: v.production_status,
      upload_status: v.upload_status,
      publishing_status: v.publishing_status,
      checklist: v.checklist as Record<string, boolean>,
      skip_scope: v.skip_scope,
      skip_reason: v.skip_reason,
      skipped_at: v.skipped_at,
      pre_skip: v.pre_skip as Record<string, string> | null,
      youtube_url: v.youtube_url,
      youtube_video_id: v.youtube_video_id,
      uploaded_at: v.uploaded_at,
      published_at: v.published_at,
      notes: v.notes,
      analytics: v.analytics as Record<string, number | string> | null,
      updated_at: v.updated_at,
    })),
    daySkips: input.daySkips.map((d) => ({
      channel_id: d.channel_id,
      day_number: d.day_number,
      reason: d.reason,
      skipped_at: d.skipped_at,
      restored_at: d.restored_at,
      updated_at: d.updated_at,
    })),
    promptProgress: input.prompts.map((p) => ({
      channel_id: p.channel_id,
      video_id: p.video_id,
      prompt_type: p.prompt_type,
      testing_status: p.testing_status,
      approved_version: p.approved_version,
      custom_text: p.custom_text,
      custom_version: p.custom_version,
      feedback: p.feedback,
      failure_reason: p.failure_reason,
      updated_at: p.updated_at,
    })),
    activity: input.activity.map((a) => ({
      client_op_id: a.client_op_id,
      channel_id: a.channel_id,
      day_number: a.day_number,
      video_id: a.video_id,
      action_type: a.action_type,
      previous_status: a.previous_status,
      new_status: a.new_status,
      notes: a.notes,
      details: a.details,
      device_id: a.device_id,
      created_at: a.created_at,
      client_created_at: a.client_created_at,
    })),
  };
}

export function summarizeBackup(b: WorkspaceBackup) {
  return {
    videos: b.videoProgress.length,
    uploaded: b.videoProgress.filter((v) => v.upload_status === "uploaded").length,
    skippedVideos: b.videoProgress.filter((v) => v.upload_status === "skipped").length,
    skippedDays: b.daySkips.filter((d) => !d.restored_at).length,
    prompts: b.promptProgress.length,
    activity: b.activity.length,
    exportedAt: b.exportedAt,
  };
}
