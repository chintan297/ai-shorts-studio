"use client";

import { ExternalLink, RotateCcw, SkipForward } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChannelIcon } from "@/components/common/channel-style";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LockBadge, ProductionBadge, PublishingBadge, UploadBadge } from "@/components/common/status-badge";
import { PageContainer, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchedule, useVideos } from "@/hooks/use-progress";
import { CHANNELS, VIDEO_INDEX, channelEntries, getChannel, videoHref } from "@/lib/content/catalog";
import { formatDate, formatSlot, plannedDate, slotFor } from "@/lib/content/schedule";
import type { ChannelId, VideoIndexEntry } from "@/lib/content/schema";
import { channelSequence, type LockState } from "@/lib/progress/sequence";
import type { VideoProgressRow } from "@/lib/progress/types";
import { actions } from "@/lib/sync/actions";
import { MarkUploadedDialog } from "@/components/video/upload-tab";
import { cn } from "@/lib/utils";

type Filter = "next" | "ready" | "uploaded" | "failed" | "skipped" | "all";
const FILTERS: Record<Filter, string> = {
  next: "Next available",
  ready: "Ready for upload",
  uploaded: "Uploaded",
  failed: "Failed",
  skipped: "Skipped",
  all: "All videos",
};

export function UploadManager() {
  const videos = useVideos();
  const { start, preferences } = useSchedule();
  const [channelFilter, setChannelFilter] = useState<"all" | ChannelId>("all");
  const [filter, setFilter] = useState<Filter>("next");
  const [limit, setLimit] = useState(60);

  const states = useMemo(() => {
    const map: Record<string, LockState> = {};
    for (const c of CHANNELS) Object.assign(map, channelSequence(channelEntries(c.id), videos).states);
    return map;
  }, [videos]);

  const rows = useMemo(() => {
    const list = VIDEO_INDEX.filter((e) => channelFilter === "all" || e.channelId === channelFilter).filter((e) => {
      const row = videos[e.id];
      switch (filter) {
        case "next":
          return states[e.id] === "current";
        case "ready":
          return row?.production_status === "ready_for_upload" && row.upload_status !== "uploaded" && row.upload_status !== "skipped";
        case "uploaded":
          return row?.upload_status === "uploaded";
        case "failed":
          return row?.upload_status === "upload_failed" || row?.production_status === "failed";
        case "skipped":
          return row?.upload_status === "skipped";
        default:
          return true;
      }
    });
    if (filter === "uploaded") list.sort((a, b) => (videos[b.id]?.uploaded_at ?? "").localeCompare(videos[a.id]?.uploaded_at ?? ""));
    return list;
  }, [channelFilter, filter, videos, states]);

  return (
    <PageContainer>
      <PageHeader
        title="Upload Manager"
        description="Track manual YouTube uploads. This app never uploads or publishes anything itself: you upload in YouTube Studio, then record it here."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Status filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTERS) as Filter[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {FILTERS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as typeof channelFilter)}>
            <SelectTrigger className="w-full sm:w-64" aria-label="Channel filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {CHANNELS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No videos match these filters.</p> : null}

      {/* Desktop table */}
      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Production</TableHead>
              <TableHead>Upload</TableHead>
              <TableHead>Publishing</TableHead>
              <TableHead>YouTube</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((e) => (
              <UploadTableRow key={e.id} entry={e} row={videos[e.id]} state={states[e.id]} start={start} slot={slotFor(getChannel(e.channelId)!, e.videoNumber, preferences)} />
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {rows.slice(0, limit).map((e) => {
          const c = getChannel(e.channelId)!;
          const row = videos[e.id];
          return (
            <Card key={e.id} size="sm" className={cn(states[e.id] === "current" && "ring-2 ring-amber-500/40")}>
              <CardContent className="space-y-2">
                <Link href={videoHref(e)} className="flex items-start gap-2">
                  <ChannelIcon icon={c.icon} accent={c.accent} size="sm" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.shortName} · Day {e.dayNumber} · V{e.videoNumber} · {formatDate(plannedDate(start, e.dayNumber), { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </Link>
                <div className="flex flex-wrap gap-1">
                  {states[e.id] ? <LockBadge state={states[e.id]!} /> : null}
                  <ProductionBadge status={row?.production_status ?? "pending"} />
                  <UploadBadge status={row?.upload_status ?? "not_uploaded"} />
                  {row?.upload_status === "uploaded" ? <PublishingBadge status={row.publishing_status} /> : null}
                </div>
                <RowActions entry={e} row={row} state={states[e.id]} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rows.length > limit ? (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + 60)}>
            Show more ({rows.length - limit} left)
          </Button>
        </div>
      ) : null}
    </PageContainer>
  );
}

function UploadTableRow({ entry, row, state, start, slot }: { entry: VideoIndexEntry; row: VideoProgressRow | undefined; state: LockState | undefined; start: string; slot: string }) {
  const c = getChannel(entry.channelId)!;
  return (
    <TableRow className={cn(state === "current" && "bg-amber-500/5")} data-testid={`upload-row-${entry.id}`}>
      <TableCell>
        <span className="flex items-center gap-2">
          <ChannelIcon icon={c.icon} accent={c.accent} size="sm" />
          <span className="text-xs">{c.shortName}</span>
        </span>
      </TableCell>
      <TableCell className="max-w-72">
        <Link href={videoHref(entry)} className="line-clamp-1 font-medium hover:underline">
          {entry.title}
        </Link>
        <span className="text-xs text-muted-foreground">
          Day {entry.dayNumber} · Video {entry.videoNumber}
        </span>
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {formatDate(plannedDate(start, entry.dayNumber), { day: "numeric", month: "short" })}
        <br />
        <span className="text-muted-foreground">{formatSlot(slot)}</span>
      </TableCell>
      <TableCell>
        <ProductionBadge status={row?.production_status ?? "pending"} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <UploadBadge status={row?.upload_status ?? "not_uploaded"} />
          {state ? <LockBadge state={state} /> : null}
        </div>
      </TableCell>
      <TableCell>
        <PublishingBadge status={row?.publishing_status ?? "not_published"} />
      </TableCell>
      <TableCell className="max-w-40 text-xs">
        {row?.youtube_url ? (
          <a href={row.youtube_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 truncate underline">
            {row.youtube_video_id ?? "Open"} <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <RowActions entry={entry} row={row} state={state} />
      </TableCell>
    </TableRow>
  );
}

function RowActions({ entry, row, state }: { entry: VideoIndexEntry; row: VideoProgressRow | undefined; state: LockState | undefined }) {
  const { today } = useSchedule();
  const channel = getChannel(entry.channelId)!;
  const skipped = row?.upload_status === "skipped";
  const uploaded = row?.upload_status === "uploaded";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {state === "current" ? (
        <MarkUploadedDialog
          entry={entry}
          title={entry.title}
          madeForKids={channel.madeForKids}
          syntheticRequired={channel.syntheticDisclosure === "required"}
          initialUrl={row?.youtube_url ?? ""}
          initialVideoId={row?.youtube_video_id ?? ""}
          initialUploadedAt={row?.uploaded_at ?? today}
          disabled={false}
          trigger={
            <Button size="xs" data-testid={`record-upload-${entry.id}`}>
              Record upload
            </Button>
          }
        />
      ) : null}
      {!uploaded && !skipped ? (
        <Button asChild size="xs" variant="outline">
          <Link href={`${videoHref(entry)}`}>Open</Link>
        </Button>
      ) : null}
      {skipped ? (
        <ConfirmDialog
          trigger={
            <Button size="xs" variant="outline">
              <RotateCcw data-icon="inline-start" /> Restore
            </Button>
          }
          title="Restore this video?"
          description="It returns to its previous status, or to Pending."
          confirmLabel="Restore"
          onConfirm={() => actions.restoreVideo(entry)}
        />
      ) : !uploaded ? (
        <ConfirmDialog
          trigger={
            <Button size="xs" variant="ghost">
              <SkipForward data-icon="inline-start" /> Skip
            </Button>
          }
          title="Skip this video?"
          description="The content is kept and you can restore it later. Skipped videos never count as uploaded."
          confirmLabel="Skip video"
          withReason
          onConfirm={(reason) => actions.skipVideo(entry, reason || undefined)}
        />
      ) : (
        <Button asChild size="xs" variant="ghost">
          <Link href={videoHref(entry)}>Details</Link>
        </Button>
      )}
    </div>
  );
}
