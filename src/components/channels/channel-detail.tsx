"use client";

import { ArrowRight, ExternalLink, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChannelIcon, ProgressBar } from "@/components/common/channel-style";
import { ActivityList } from "@/components/common/activity-list";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { VideoRow } from "@/components/common/video-row";
import { PageContainer } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannelSequence, useReady, useSchedule, useVideos } from "@/hooks/use-progress";
import { useSync } from "@/hooks/use-sync";
import { channelEntries, getChannel, indexEntry, videoHref } from "@/lib/content/catalog";
import { formatDate, formatSlot, plannedDate, slotFor } from "@/lib/content/schedule";
import type { ChannelId } from "@/lib/content/schema";
import { dayStatus } from "@/lib/progress/sequence";
import { computeStats } from "@/lib/progress/stats";
import { daySkipKey } from "@/lib/progress/types";
import { actions } from "@/lib/sync/actions";
import { DayActions } from "./day-actions";
import { DayGrid, StatusLegend } from "./day-grid";

const BLOCKS = [1, 16, 31, 46, 61, 76];
const DAY_STATUS_LABEL = {
  uploaded: "Uploaded",
  skipped: "Skipped",
  partial: "Partly done",
  in_progress: "In production",
  failed: "Needs attention",
  pending: "Pending",
} as const;

export function ChannelDetail({ channelId }: { channelId: ChannelId }) {
  const channel = getChannel(channelId)!;
  const entries = channelEntries(channelId);
  const videos = useVideos();
  const ready = useReady();
  const daySkips = useSync((s) => s.progress.daySkips);
  const activity = useSync((s) => s.activity);
  const seq = useChannelSequence(channelId);
  const { start, planDay, preferences } = useSchedule();
  const stats = useMemo(() => computeStats(entries, videos), [entries, videos]);
  const next = seq.nextId ? indexEntry(seq.nextId) : undefined;

  const initialBlock = BLOCKS.findLast((b) => b <= Math.max(1, Math.min(90, next?.dayNumber ?? planDay))) ?? 1;
  const [block, setBlock] = useState(initialBlock);

  const skippedDays = Object.values(daySkips)
    .filter((d) => d.channel_id === channelId && !d.restored_at)
    .sort((a, b) => a.day_number - b.day_number);
  const skippedVideos = entries.filter((e) => videos[e.id]?.upload_status === "skipped" && videos[e.id]?.skip_scope === "video");
  const uploads = entries
    .filter((e) => videos[e.id]?.upload_status === "uploaded")
    .map((e) => ({ entry: e, row: videos[e.id]! }))
    .sort((a, b) => (b.row.uploaded_at ?? "").localeCompare(a.row.uploaded_at ?? "") || b.entry.sequence - a.entry.sequence);
  const analytics = uploads.reduce(
    (acc, { row }) => {
      if (!row.analytics) return acc;
      acc.count++;
      acc.views += row.analytics.views ?? 0;
      acc.likes += row.analytics.likes ?? 0;
      acc.comments += row.analytics.comments ?? 0;
      acc.subs += row.analytics.subscribersGained ?? 0;
      return acc;
    },
    { count: 0, views: 0, likes: 0, comments: 0, subs: 0 },
  );
  const channelActivity = activity.filter((a) => a.channel_id === channelId).slice(0, 30);

  function jumpToDay(day: number) {
    setBlock(BLOCKS.findLast((b) => b <= day) ?? 1);
    setTimeout(() => document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        <ChannelIcon icon={channel.icon} accent={channel.accent} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{channel.name}</h1>
          <p className="text-sm text-muted-foreground">{channel.description}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="h-auto max-w-full whitespace-normal">{channel.language}</Badge>
            <Badge variant="secondary" className="h-auto max-w-full whitespace-normal">Audience: {channel.targetAudience}</Badge>
            <Badge variant="secondary">
              Slots: {formatSlot(slotFor(channel, 1, preferences))} & {formatSlot(slotFor(channel, 2, preferences))} IST
            </Badge>
            {channel.madeForKids ? <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300">Made for Kids</Badge> : null}
            {channel.syntheticDisclosure === "required" ? <Badge variant="outline">AI disclosure: required</Badge> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Skipped videos never count as completed or uploaded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {(
                [
                  ["Total", stats.total],
                  ["Completed", stats.completed],
                  ["Uploaded", stats.uploaded],
                  ["Published", stats.published],
                  ["Pending", stats.pending],
                  ["Skipped", stats.skipped],
                  ["Failed", stats.failed],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/50 px-2 py-2 text-center" data-testid={`stat-${label.toLowerCase()}`}>
                  <p className="text-lg font-semibold tabular-nums">{ready ? value : "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Completion</span>
                <span className="tabular-nums">{stats.completionPercent}%</span>
              </div>
              <ProgressBar value={stats.completionPercent} accent={channel.accent} label="Completion" />
            </div>
          </CardContent>
        </Card>

        <Card className={next ? "ring-2 ring-amber-500/40" : undefined}>
          <CardHeader>
            <CardTitle>Next available video</CardTitle>
            <CardDescription>Unlocks after the previous video is uploaded or skipped.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {next ? (
              <>
                <div>
                  <p className="font-medium" data-testid="channel-next-title">
                    {next.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Day {next.dayNumber} · Video {next.videoNumber} · {formatDate(plannedDate(start, next.dayNumber))},{" "}
                    {formatSlot(slotFor(channel, next.videoNumber, preferences))}
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href={videoHref(next)}>
                    Open workspace <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm">Every video in this channel is uploaded or skipped. 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>90-day calendar</CardTitle>
          <CardDescription>Tap a day to jump to its videos. The outlined cell is today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DayGrid channelId={channelId} entries={entries} seq={seq} videos={videos} daySkips={daySkips} start={start} today={planDay} onSelectDay={jumpToDay} />
          <StatusLegend />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="gap-3">
          <CardTitle>Daily videos</CardTitle>
          <Tabs value={String(block)} onValueChange={(v) => setBlock(Number(v))}>
            <TabsList className="h-auto w-full flex-wrap sm:w-fit">
              {BLOCKS.map((b) => (
                <TabsTrigger key={b} value={String(b)} className="text-xs">
                  Days {b}–{b + 14}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 15 }, (_, i) => block + i).map((day) => {
            const list = entries.filter((e) => e.dayNumber === day);
            const status = dayStatus(list.map((e) => videos[e.id]), daySkips[daySkipKey(channelId, day)]);
            return (
              <section key={day} id={`day-${day}`} className="scroll-mt-24 space-y-2" data-testid={`day-section-${day}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Day {day}</h3>
                    <span className="text-xs text-muted-foreground">{formatDate(plannedDate(start, day), { weekday: "short", day: "numeric", month: "short" })}</span>
                    {day === planDay ? <Badge>Today</Badge> : null}
                    <Badge variant="outline" data-testid={`day-status-${day}`}>
                      {DAY_STATUS_LABEL[status]}
                    </Badge>
                  </div>
                  {list.length ? <DayActions channelId={channelId} day={day} /> : null}
                </div>
                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Content for this day isn&apos;t in the library yet.</p>
                ) : (
                  list.map((e) => (
                    <VideoRow key={e.id} entry={e} state={seq.states[e.id]} row={videos[e.id]} meta={formatSlot(slotFor(channel, e.videoNumber, preferences))} />
                  ))
                )}
              </section>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skipped days & videos</CardTitle>
            <CardDescription>Skipping never deletes content. Restore at any time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {skippedDays.length === 0 && skippedVideos.length === 0 ? <p className="text-sm text-muted-foreground">Nothing skipped.</p> : null}
            {skippedDays.map((d) => (
              <div key={d.day_number} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">Day {d.day_number}</p>
                  <p className="text-xs text-muted-foreground">
                    Skipped {new Date(d.skipped_at).toLocaleString("en-IN")}
                    {d.reason ? ` · “${d.reason}”` : ""}
                  </p>
                </div>
                <DayActions channelId={channelId} day={d.day_number} />
              </div>
            ))}
            {skippedVideos.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    Day {e.dayNumber} · V{e.videoNumber}: {e.title}
                  </p>
                  {videos[e.id]?.skip_reason ? <p className="text-xs text-muted-foreground">“{videos[e.id]?.skip_reason}”</p> : null}
                </div>
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <RotateCcw data-icon="inline-start" /> Restore
                    </Button>
                  }
                  title="Restore this video?"
                  description="It returns to its previous status, or to Pending."
                  confirmLabel="Restore video"
                  onConfirm={() => actions.restoreVideo(e)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload history</CardTitle>
            <CardDescription>
              {analytics.count > 0
                ? `Manually entered performance (${analytics.count} videos): ${analytics.views.toLocaleString("en-IN")} views · ${analytics.likes.toLocaleString("en-IN")} likes · ${analytics.subs} subscribers gained`
                : "Videos you've confirmed as uploaded."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploads.length === 0 ? <p className="text-sm text-muted-foreground">No uploads yet.</p> : null}
            {uploads.slice(0, 20).map(({ entry, row }) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <Link href={videoHref(entry)} className="min-w-0 hover:underline">
                  <p className="truncate font-medium">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Day {entry.dayNumber} · V{entry.videoNumber} · uploaded {formatDate(row.uploaded_at)}
                    {row.publishing_status === "published" ? " · published" : ""}
                  </p>
                </Link>
                {row.youtube_url ? (
                  <Button asChild size="icon-sm" variant="ghost">
                    <a href={row.youtube_url} target="_blank" rel="noreferrer noopener" aria-label="Open on YouTube">
                      <ExternalLink />
                    </a>
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" /> Channel identity
            </CardTitle>
            <CardDescription>Injected into every prompt so characters and style stay consistent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channel.identities.map((identity) => (
              <div key={identity.title} className="space-y-2">
                <p className="font-medium">{identity.title}</p>
                <p className="text-sm text-muted-foreground">{identity.summary}</p>
                <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                  {identity.traits.map((t) => (
                    <div key={t.label} className="contents">
                      <dt className="text-muted-foreground">{t.label}</dt>
                      <dd>{t.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5">
              {channel.categories.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel history</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityList rows={channelActivity} showVideo empty="No activity for this channel yet." />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
