import type { VideoIndexEntry } from "@/lib/content/schema";
import type { VideoProgressRow } from "./types";

export interface ProgressStats {
  total: number;
  completed: number;
  uploaded: number;
  published: number;
  skipped: number;
  failed: number;
  pending: number;
  /** Completed ÷ total (skipped videos never count as completed). */
  completionPercent: number;
}

export function computeStats(entries: VideoIndexEntry[], videos: Record<string, VideoProgressRow>): ProgressStats {
  let completed = 0;
  let uploaded = 0;
  let published = 0;
  let skipped = 0;
  let failed = 0;
  for (const entry of entries) {
    const row = videos[entry.id];
    if (!row) continue;
    if (row.upload_status === "skipped") {
      skipped++;
      continue;
    }
    if (row.production_status === "completed") completed++;
    if (row.upload_status === "uploaded") uploaded++;
    if (row.upload_status === "uploaded" && row.publishing_status === "published") published++;
    if (row.upload_status !== "uploaded" && (row.upload_status === "upload_failed" || row.production_status === "failed")) {
      failed++;
    }
  }
  const total = entries.length;
  return {
    total,
    completed,
    uploaded,
    published,
    skipped,
    failed,
    pending: Math.max(0, total - completed - skipped - failed),
    completionPercent: total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
  };
}
