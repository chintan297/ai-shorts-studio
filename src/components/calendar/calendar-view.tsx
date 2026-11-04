"use client";

import { CalendarDays, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DayActions } from "@/components/channels/day-actions";
import { StatusLegend } from "@/components/channels/day-grid";
import { ChannelIcon } from "@/components/common/channel-style";
import { statusDotClass } from "@/components/common/status-badge";
import { VideoRow } from "@/components/common/video-row";
import { PageContainer, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchedule, useVideos } from "@/hooks/use-progress";
import { CHANNELS, VIDEO_INDEX, channelEntries, getChannel, videoHref } from "@/lib/content/catalog";
import { formatDate, formatSlot, plannedDate, slotFor } from "@/lib/content/schedule";
import type { ChannelId } from "@/lib/content/schema";
import { channelSequence, type ChannelSequence } from "@/lib/progress/sequence";
import { cn } from "@/lib/utils";

const BLOCKS = [1, 16, 31, 46, 61, 76];

export function CalendarView() {
  const videos = useVideos();
  const { start, planDay, preferences } = useSchedule();
  const [channelFilter, setChannelFilter] = useState<"all" | ChannelId>("all");
  const [query, setQuery] = useState("");
  const [block, setBlock] = useState(() => BLOCKS.findLast((b) => b <= Math.min(90, Math.max(1, planDay))) ?? 1);

  const sequences = useMemo(() => {
    const map = {} as Record<ChannelId, ChannelSequence>;
    for (const c of CHANNELS) map[c.id] = channelSequence(channelEntries(c.id), videos);
    return map;
  }, [videos]);

  const channels = channelFilter === "all" ? CHANNELS : CHANNELS.filter((c) => c.id === channelFilter);
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return VIDEO_INDEX.filter(
      (e) =>
        (channelFilter === "all" || e.channelId === channelFilter) &&
        (e.title.toLowerCase().includes(q) || e.concept.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.id.includes(q) || `day ${e.dayNumber}` === q),
    ).slice(0, 60);
  }, [q, channelFilter]);

  return (
    <PageContainer>
      <PageHeader
        title="Content Calendar"
        description={`90 days × 2 videos per channel, starting ${formatDate(start)}. Change the start date in Settings.`}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              const day = Math.min(90, Math.max(1, planDay));
              setBlock(BLOCKS.findLast((b) => b <= day) ?? 1);
              setTimeout(() => document.getElementById(`cal-day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }}
          >
            <CalendarDays data-icon="inline-start" /> Today
          </Button>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
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
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search titles, concepts, categories…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search videos" />
          </div>
        </div>
        <StatusLegend />
      </PageHeader>

      {q ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.length === 60 ? "First 60 matches" : `${results.length} match${results.length === 1 ? "" : "es"}`}
          </p>
          {results.map((e) => (
            <VideoRow
              key={e.id}
              entry={e}
              state={sequences[e.channelId].states[e.id]}
              row={videos[e.id]}
              showChannel={getChannel(e.channelId)?.shortName}
              meta={`Day ${e.dayNumber} · ${formatDate(plannedDate(start, e.dayNumber), { day: "numeric", month: "short" })}`}
            />
          ))}
        </div>
      ) : (
        <>
          <Tabs value={String(block)} onValueChange={(v) => setBlock(Number(v))} className="mb-4">
            <TabsList className="h-auto w-full flex-wrap sm:w-fit">
              {BLOCKS.map((b) => (
                <TabsTrigger key={b} value={String(b)} className="text-xs">
                  Days {b}–{b + 14}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="space-y-3">
            {Array.from({ length: 15 }, (_, i) => block + i).map((day) => (
              <Card key={day} id={`cal-day-${day}`} size="sm" className={cn("scroll-mt-20", day === planDay && "ring-2 ring-primary/40")}>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">Day {day}</h2>
                    <span className="text-xs text-muted-foreground">{formatDate(plannedDate(start, day), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                    {day === planDay ? <Badge>Today</Badge> : null}
                  </div>
                  {channelFilter !== "all" ? (
                    <div className="space-y-2">
                      {channelEntries(channelFilter)
                        .filter((e) => e.dayNumber === day)
                        .map((e) => (
                          <VideoRow
                            key={e.id}
                            entry={e}
                            state={sequences[channelFilter].states[e.id]}
                            row={videos[e.id]}
                            meta={formatSlot(slotFor(getChannel(channelFilter)!, e.videoNumber, preferences))}
                          />
                        ))}
                      <DayActions channelId={channelFilter} day={day} />
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {channels.map((c) => {
                        const list = channelEntries(c.id).filter((e) => e.dayNumber === day);
                        return (
                          <div key={c.id} className="space-y-1.5 rounded-lg border p-2.5" data-testid={`cal-cell-${c.id}-${day}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
                                <ChannelIcon icon={c.icon} accent={c.accent} size="sm" />
                                <span className="truncate">{c.shortName}</span>
                              </span>
                              {list.length ? <DayActions channelId={c.id} day={day} size="xs" /> : null}
                            </div>
                            {list.length === 0 ? <p className="text-xs text-muted-foreground">Not in the library yet</p> : null}
                            {list.map((e) => {
                              const row = videos[e.id];
                              const state = sequences[c.id].states[e.id];
                              return (
                                <Link key={e.id} href={videoHref(e)} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-muted">
                                  <span
                                    className={cn(
                                      "size-2.5 shrink-0 rounded-full",
                                      statusDotClass(state, row?.upload_status === "upload_failed" || row?.production_status === "failed", (row?.production_status ?? "pending") !== "pending"),
                                    )}
                                  />
                                  <span className={cn("truncate", state === "skipped" && "line-through opacity-70")}>
                                    V{e.videoNumber} · {e.title}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
