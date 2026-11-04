"use client";

import { toast } from "sonner";
import { dayEntries } from "@/lib/content/catalog";
import type { ChannelId, VideoIndexEntry } from "@/lib/content/schema";
import { OpRejected } from "@/lib/progress/transitions";
import {
  REJECTION_MESSAGES,
  type Analytics,
  type ChecklistKey,
  type OpInput,
  type PromptType,
  type PublishingStatus,
  type TestingStatus,
} from "@/lib/progress/types";
import { getEngine } from "./index";

export function describeError(err: unknown): string {
  const reason = err instanceof OpRejected ? err.reason : (err as Error)?.message;
  return (reason && REJECTION_MESSAGES[reason]) ?? reason ?? "Something went wrong";
}

async function run(input: OpInput, success?: string): Promise<boolean> {
  try {
    await getEngine().dispatch(input);
    if (success) toast.success(success);
    return true;
  } catch (err) {
    toast.error(describeError(err));
    return false;
  }
}

const videoOp = (entry: Pick<VideoIndexEntry, "id" | "channelId" | "dayNumber" | "videoNumber">) => ({
  channel_id: entry.channelId,
  video_id: entry.id,
  day_number: entry.dayNumber,
  video_number: entry.videoNumber,
});

type Entry = Pick<VideoIndexEntry, "id" | "channelId" | "dayNumber" | "videoNumber">;

export const actions = {
  setChecklist: (entry: Entry, item: ChecklistKey, value: boolean) =>
    run({ type: "checklist", ...videoOp(entry), payload: { item, value } }),

  startVideo: (entry: Entry) =>
    run({ type: "set_production_status", ...videoOp(entry), payload: { status: "in_progress" } }, "Marked as in progress"),

  markProductionFailed: (entry: Entry, reason?: string) =>
    run({ type: "set_production_status", ...videoOp(entry), payload: { status: "failed", reason } }, "Production marked as failed"),

  clearProductionFailed: (entry: Entry) =>
    run({ type: "set_production_status", ...videoOp(entry), payload: { status: "auto" } }, "Production status restored"),

  saveUploadDetails: (entry: Entry, details: { youtube_url?: string | null; youtube_video_id?: string | null; uploaded_at?: string | null; published_at?: string | null }) =>
    run({ type: "save_upload_details", ...videoOp(entry), payload: details }, "Upload details saved"),

  markUploaded: (entry: Entry) =>
    run({ type: "mark_uploaded", ...videoOp(entry), payload: {} }, "Marked as uploaded. The next video is unlocked."),

  markUploadFailed: (entry: Entry, reason?: string) =>
    run({ type: "mark_upload_failed", ...videoOp(entry), payload: { reason } }, "Upload marked as failed. The next video stays locked."),

  revertUpload: (entry: Entry, reason?: string) =>
    run({ type: "revert_upload", ...videoOp(entry), payload: { reason } }, "Upload reverted"),

  setPublishing: (entry: Entry, status: PublishingStatus, publishedAt?: string) =>
    run({ type: "set_publishing_status", ...videoOp(entry), payload: { status, published_at: publishedAt } }, "Publishing status updated"),

  skipVideo: (entry: Entry, reason?: string) =>
    run({ type: "skip_video", ...videoOp(entry), payload: { reason } }, "Video skipped"),

  restoreVideo: (entry: Entry) => run({ type: "restore_video", ...videoOp(entry), payload: {} }, "Video restored"),

  skipDay: (channelId: ChannelId, day: number, reason?: string) =>
    run(
      {
        type: "skip_day",
        channel_id: channelId,
        day_number: day,
        videos: dayEntries(channelId, day).map((e) => ({ video_id: e.id, video_number: e.videoNumber })),
        payload: { reason },
      },
      `Day ${day} skipped`,
    ),

  restoreDay: (channelId: ChannelId, day: number) =>
    run(
      {
        type: "restore_day",
        channel_id: channelId,
        day_number: day,
        videos: dayEntries(channelId, day).map((e) => ({ video_id: e.id, video_number: e.videoNumber })),
        payload: {},
      },
      `Day ${day} restored`,
    ),

  setNotes: (entry: Entry, notes: string) => run({ type: "set_notes", ...videoOp(entry), payload: { notes } }, "Notes saved"),

  setAnalytics: (entry: Entry, analytics: Analytics) =>
    run({ type: "set_analytics", ...videoOp(entry), payload: { analytics } }, "Performance saved"),

  updatePrompt: (
    entry: Entry,
    promptType: PromptType,
    patch: { testing_status?: TestingStatus; feedback?: string | null; failure_reason?: string | null; custom_text?: string | null; template_version?: string },
    success = "Prompt progress saved",
  ) => run({ type: "prompt_update", ...videoOp(entry), payload: { prompt_type: promptType, ...patch } }, success),

  updateSettings: (patch: Record<string, unknown>, success = "Settings saved") =>
    run({ type: "update_settings", payload: patch }, success),
};
