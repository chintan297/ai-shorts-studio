"use client";

import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { LockBadge, ProductionBadge, PublishingBadge } from "@/components/common/status-badge";
import { videoHref } from "@/lib/content/catalog";
import type { VideoIndexEntry } from "@/lib/content/schema";
import type { LockState } from "@/lib/progress/sequence";
import type { VideoProgressRow } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

export function VideoRow({
  entry,
  state,
  row,
  meta,
  showChannel,
}: {
  entry: VideoIndexEntry;
  state: LockState | undefined;
  row: VideoProgressRow | undefined;
  meta?: React.ReactNode;
  showChannel?: string;
}) {
  return (
    <Link
      href={videoHref(entry)}
      data-testid={`video-row-${entry.id}`}
      data-lock={state}
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/60",
        state === "current" && "border-amber-500/60 bg-amber-500/5",
        state === "skipped" && "opacity-70",
      )}
    >
      <span className="w-10 shrink-0 text-center text-xs text-muted-foreground tabular-nums">V{entry.videoNumber}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-1 font-medium">
          {state === "locked" ? <Lock className="mr-1 inline size-3 text-muted-foreground" aria-label="Locked" /> : null}
          {entry.title}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {showChannel ? `${showChannel} · ` : ""}
          {entry.category}
          {meta ? <> · {meta}</> : null}
        </p>
      </div>
      <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
        {state ? <LockBadge state={state} /> : null}
        {row && row.upload_status !== "skipped" && row.production_status !== "pending" && row.production_status !== "completed" ? (
          <ProductionBadge status={row.production_status} />
        ) : null}
        {row?.upload_status === "upload_failed" ? <ProductionBadge status="failed" /> : null}
        {row?.upload_status === "uploaded" && row.publishing_status !== "not_published" ? <PublishingBadge status={row.publishing_status} /> : null}
      </div>
      <span className="sm:hidden">{state ? <LockBadge state={state} /> : null}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
    </Link>
  );
}
