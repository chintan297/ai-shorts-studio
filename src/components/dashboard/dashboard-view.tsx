"use client";

import { ArrowRight, CalendarCheck, CheckCircle2, Clock, Film, ListVideo, SkipForward, Tv, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ChannelIcon, ProgressBar } from "@/components/common/channel-style";
import { LockBadge, statusDotClass } from "@/components/common/status-badge";
import { PageContainer, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useReady, useSchedule, useVideos } from "@/hooks/use-progress";
import { CHANNELS, VIDEO_INDEX, channelEntries, indexEntry, videoHref } from "@/lib/content/catalog";
import { formatDate, formatSlot, plannedDate, slotFor } from "@/lib/content/schedule";
import type { ChannelId } from "@/lib/content/schema";
import { channelSequence } from "@/lib/progress/sequence";
import { computeStats } from "@/lib/progress/stats";

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: React.ReactNode; icon: typeof Film; hint?: string }) {
  return (
    <Card size="sm" className="gap-1">
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">{label}</span>
          <Icon className="size-4" />
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const videos = useVideos();
  const ready = useReady();
  const { start, planDay, preferences } = useSchedule();

  const totals = useMemo(() => computeStats(VIDEO_INDEX, videos), [videos]);
  const perChannel = useMemo(
    () =>
      CHANNELS.map((channel) => {
        const entries = channelEntries(channel.id);
        const seq = channelSequence(entries, videos);
        const today = entries.filter((e) => e.dayNumber === planDay);
        return {
          channel,
          stats: computeStats(entries, videos),
          seq,
          next: seq.nextId ? indexEntry(seq.nextId) : undefined,
          today,
          todayDone: today.filter((e) => seq.states[e.id] === "uploaded").length,
        };
      }),
    [videos, planDay],
  );
  const todayTotal = perChannel.reduce((s, c) => s + c.today.length, 0);
  const todayDone = perChannel.reduce((s, c) => s + c.todayDone, 0);
  const n = (v: number) => (ready ? v.toLocaleString("en-IN") : "—");

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={
          !start
            ? "Loading your plan…"
            : planDay >= 1 && planDay <= 90
            ? `Today is plan day ${planDay} of 90 (started ${formatDate(start)}).`
            : planDay < 1
              ? `Your 90-day plan starts on ${formatDate(start)}.`
              : `Your 90-day plan ended on ${formatDate(plannedDate(start, 90))}.`
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Channels" value={CHANNELS.length} icon={Tv} />
        <StatCard label="Total Planned Videos" value={VIDEO_INDEX.length.toLocaleString("en-IN")} icon={ListVideo} hint="90 days × 2 per channel" />
        <StatCard label="Completed Videos" value={n(totals.completed)} icon={CheckCircle2} hint={ready ? `${totals.completionPercent}% of plan` : undefined} />
        <StatCard label="Uploaded Videos" value={n(totals.uploaded)} icon={UploadCloud} />
        <StatCard label="Published Videos" value={n(totals.published)} icon={Film} />
        <StatCard label="Pending Videos" value={n(totals.pending)} icon={Clock} hint={totals.failed ? `${totals.failed} failed` : undefined} />
        <StatCard label="Skipped Videos" value={n(totals.skipped)} icon={SkipForward} />
        <StatCard label="Today's Progress" value={ready ? `${todayDone}/${todayTotal}` : "—"} icon={CalendarCheck} hint="Uploaded of today's planned videos" />
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Next available videos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perChannel.map(({ channel, next }) => (
            <Card key={channel.id} size="sm" className={next ? "ring-amber-500/40" : undefined}>
              <CardContent className="flex items-start gap-3">
                <ChannelIcon icon={channel.icon} accent={channel.accent} size="sm" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground">{channel.shortName}</p>
                  {next ? (
                    <>
                      <p className="line-clamp-2 text-sm font-medium" data-testid={`next-${channel.id}`}>
                        {next.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Day {next.dayNumber} · Video {next.videoNumber} · {formatDate(plannedDate(start, next.dayNumber), { day: "numeric", month: "short" })},{" "}
                        {formatSlot(slotFor(channel, next.videoNumber, preferences))}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium">All 90 days are done 🎉</p>
                  )}
                </div>
                {next ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={videoHref(next)} aria-label={`Open next video for ${channel.shortName}`}>
                      Open <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Channels</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perChannel.map(({ channel, stats, seq, today }) => (
            <ChannelCard key={channel.id} channelId={channel.id} stats={stats} today={today.map((e) => ({ id: e.id, state: seq.states[e.id], failed: videos[e.id]?.upload_status === "upload_failed", inProgress: (videos[e.id]?.production_status ?? "pending") !== "pending" }))} ready={ready} />
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

function ChannelCard({
  channelId,
  stats,
  today,
  ready,
}: {
  channelId: ChannelId;
  stats: ReturnType<typeof computeStats>;
  today: Array<{ id: string; state: ReturnType<typeof channelSequence>["states"][string] | undefined; failed: boolean; inProgress: boolean }>;
  ready: boolean;
}) {
  const channel = CHANNELS.find((c) => c.id === channelId)!;
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <ChannelIcon icon={channel.icon} accent={channel.accent} />
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{channel.name}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{channel.niche}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Today</span>
          <span className="flex items-center gap-1.5">
            {today.length === 0 ? <span className="text-muted-foreground">Outside the plan dates</span> : null}
            {today.map((t) => (
              <span key={t.id} className="flex items-center gap-1">
                <span className={`size-2.5 rounded-full ${statusDotClass(t.state, t.failed, t.inProgress)}`} />
                {t.state ? <LockBadge state={t.state} /> : null}
              </span>
            ))}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Uploaded", stats.uploaded],
            ["Pending", stats.pending],
            ["Skipped", stats.skipped],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted/50 py-2">
              <p className="text-lg font-semibold tabular-nums">{ready ? value : "—"}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>90-day progress</span>
            <span className="tabular-nums">
              {stats.completed}/{stats.total} · {stats.completionPercent}%
            </span>
          </div>
          <ProgressBar value={stats.completionPercent} accent={channel.accent} label={`${channel.name} progress`} />
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/channels/${channel.id}`}>Open Channel</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
