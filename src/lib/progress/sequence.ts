import type { VideoIndexEntry } from "@/lib/content/schema";
import { isResolved } from "./transitions";
import type { DaySkipRow, VideoProgressRow } from "./types";

/**
 * Per-channel upload sequence: a video unlocks only when every earlier video in that
 * channel is Uploaded or explicitly Skipped. Failed uploads, drafts, copied prompts and
 * generated videos never unlock anything.
 */
export type LockState = "uploaded" | "skipped" | "current" | "locked";

export interface ChannelSequence {
  nextId: string | null;
  states: Record<string, LockState>;
}

/** `entries` must be one channel's index entries sorted by `sequence`. */
export function channelSequence(
  entries: VideoIndexEntry[],
  videos: Record<string, VideoProgressRow>,
): ChannelSequence {
  const states: Record<string, LockState> = {};
  let nextId: string | null = null;
  for (const entry of entries) {
    const row = videos[entry.id];
    if (row?.upload_status === "uploaded") states[entry.id] = "uploaded";
    else if (row?.upload_status === "skipped") states[entry.id] = "skipped";
    else if (nextId === null) {
      nextId = entry.id;
      states[entry.id] = "current";
    } else states[entry.id] = "locked";
  }
  return { nextId, states };
}

export type DayStatus = "uploaded" | "skipped" | "partial" | "in_progress" | "failed" | "pending";

export function dayStatus(
  dayVideos: Array<VideoProgressRow | undefined>,
  daySkip: DaySkipRow | undefined,
): DayStatus {
  const skipActive = Boolean(daySkip && !daySkip.restored_at);
  const rows = dayVideos;
  if (rows.every((r) => r?.upload_status === "uploaded")) return "uploaded";
  if (rows.every((r) => isResolved(r))) return skipActive || rows.every((r) => r?.upload_status === "skipped") ? "skipped" : "partial";
  if (skipActive) return "partial";
  if (rows.some((r) => r?.upload_status === "upload_failed" || r?.production_status === "failed")) return "failed";
  if (rows.some((r) => isResolved(r))) return "partial";
  if (rows.some((r) => r && r.production_status !== "pending")) return "in_progress";
  return "pending";
}
