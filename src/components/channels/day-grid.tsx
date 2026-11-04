"use client";

import { statusDotClass } from "@/components/common/status-badge";
import type { VideoIndexEntry } from "@/lib/content/schema";
import { formatDate, plannedDate } from "@/lib/content/schedule";
import type { ChannelSequence } from "@/lib/progress/sequence";
import type { DaySkipRow, VideoProgressRow } from "@/lib/progress/types";
import { daySkipKey } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

/** Compact 90-day overview: one cell per day, one dot per video. Clicking a cell jumps to that day. */
export function DayGrid({
  channelId,
  entries,
  seq,
  videos,
  daySkips,
  start,
  today,
  onSelectDay,
}: {
  channelId: string;
  entries: VideoIndexEntry[];
  seq: ChannelSequence;
  videos: Record<string, VideoProgressRow>;
  daySkips: Record<string, DaySkipRow>;
  start: string;
  today: number;
  onSelectDay: (day: number) => void;
}) {
  const days = Array.from({ length: 90 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10" role="list" aria-label="90-day calendar">
      {days.map((day) => {
        const list = entries.filter((e) => e.dayNumber === day);
        const skip = daySkips[daySkipKey(channelId, day)];
        const skipped = Boolean(skip && !skip.restored_at);
        return (
          <button
            key={day}
            type="button"
            role="listitem"
            onClick={() => onSelectDay(day)}
            title={`Day ${day} · ${formatDate(plannedDate(start, day))}`}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-[11px] transition-colors hover:bg-muted",
              day === today && "border-primary bg-primary/5 font-semibold",
              skipped && "bg-zinc-500/10",
            )}
          >
            <span className="tabular-nums">{day}</span>
            <span className="flex gap-0.5">
              {list.length === 0 ? <span className="size-2 rounded-full border border-dashed border-muted-foreground/40" /> : null}
              {list.map((e) => (
                <span
                  key={e.id}
                  className={cn("size-2 rounded-full", statusDotClass(seq.states[e.id], videos[e.id]?.upload_status === "upload_failed" || videos[e.id]?.production_status === "failed", (videos[e.id]?.production_status ?? "pending") !== "pending"))}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StatusLegend() {
  const items: Array<[string, string]> = [
    ["bg-emerald-500", "Uploaded"],
    ["bg-amber-500", "Next up"],
    ["bg-indigo-500", "In production"],
    ["bg-red-500", "Failed"],
    ["bg-zinc-400", "Skipped"],
    ["bg-muted-foreground/25", "Pending / locked"],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([cls, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", cls)} /> {label}
        </span>
      ))}
    </div>
  );
}
