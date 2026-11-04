"use client";

import { Clock3, CloudOff } from "lucide-react";
import { useSync } from "@/hooks/use-sync";
import { indexEntry } from "@/lib/content/catalog";
import type { ActionType, ActivityRow, Op } from "@/lib/progress/types";

const ACTION_LABEL: Record<ActionType, string> = {
  workspace_created: "Workspace created",
  video_started: "Video started",
  checklist_updated: "Checklist updated",
  image_generated: "Image generated",
  video_generated: "Video generated",
  video_completed: "Video completed",
  video_uploaded: "Video uploaded",
  upload_failed: "Upload failed",
  upload_reverted: "Upload reverted",
  video_published: "Video published",
  publishing_status_changed: "Publishing status changed",
  video_skipped: "Video skipped",
  day_skipped: "Day skipped",
  video_restored: "Video restored",
  day_restored: "Day restored",
  prompt_updated: "Prompt updated",
  prompt_status_changed: "Prompt testing status changed",
  status_changed: "Status changed",
  youtube_url_updated: "YouTube URL updated",
  notes_added: "Notes saved",
  analytics_updated: "Performance updated",
  settings_updated: "Settings updated",
  device_connected: "Device connected",
  device_disconnected: "Device disconnected",
  pairing_code_regenerated: "Pairing code regenerated",
  backup_imported: "Backup imported",
  progress_reset: "Progress reset",
};

const OP_LABEL: Record<Op["type"], string> = {
  checklist: "Checklist change",
  set_production_status: "Production status change",
  save_upload_details: "Upload details",
  mark_uploaded: "Mark uploaded",
  mark_upload_failed: "Mark upload failed",
  revert_upload: "Revert upload",
  set_publishing_status: "Publishing status",
  skip_video: "Skip video",
  restore_video: "Restore video",
  skip_day: "Skip day",
  restore_day: "Restore day",
  set_notes: "Notes",
  set_analytics: "Performance",
  prompt_update: "Prompt update",
  update_settings: "Settings",
};

const pretty = (s: string | null) => (s ? s.replaceAll("_", " ") : null);

function when(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function ActivityList({
  rows,
  pending = [],
  showVideo = false,
  empty = "No activity yet.",
}: {
  rows: ActivityRow[];
  pending?: Op[];
  showVideo?: boolean;
  empty?: string;
}) {
  const members = useSync((s) => s.members);
  const deviceName = (id: string | null) => members.find((m) => m.device_id === id)?.device_label ?? (id ? "Another device" : "System");

  if (rows.length === 0 && pending.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="space-y-2">
      {pending.map((op) => (
        <li key={op.op_id} className="flex gap-3 rounded-lg border border-dashed p-3 text-sm">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="font-medium">
              {OP_LABEL[op.type]} <span className="font-normal text-amber-700 dark:text-amber-300">· waiting to sync</span>
            </p>
            <p className="text-xs text-muted-foreground">{when(op.client_ts)} · this device</p>
          </div>
        </li>
      ))}
      {rows.map((row) => {
        const entry = row.video_id ? indexEntry(row.video_id) : undefined;
        return (
          <li key={row.id} className="flex gap-3 rounded-lg border p-3 text-sm">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium">
                {ACTION_LABEL[row.action_type] ?? row.action_type}
                {row.previous_status || row.new_status ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {pretty(row.previous_status) ?? "—"} → {pretty(row.new_status) ?? "—"}
                  </span>
                ) : null}
              </p>
              {showVideo && entry ? (
                <p className="truncate text-xs text-muted-foreground">
                  Day {entry.dayNumber} · Video {entry.videoNumber} — {entry.title}
                </p>
              ) : null}
              {showVideo && !entry && row.day_number ? <p className="text-xs text-muted-foreground">Day {row.day_number}</p> : null}
              {row.notes ? <p className="text-xs wrap-break-word text-muted-foreground">“{row.notes}”</p> : null}
              <p className="text-xs text-muted-foreground">
                {when(row.created_at)} · {deviceName(row.device_id)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
