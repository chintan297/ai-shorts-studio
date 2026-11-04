"use client";

import { Check, ExternalLink, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ChannelIcon, ProgressBar } from "@/components/common/channel-style";
import { PageContainer, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useReady, useSettings, useVideos } from "@/hooks/use-progress";
import { CHANNELS, channelEntries, indexEntry } from "@/lib/content/catalog";
import { RECOMMENDATIONS } from "@/lib/content/recommendations";
import { channelSequence } from "@/lib/progress/sequence";
import { computeStats } from "@/lib/progress/stats";
import { actions } from "@/lib/sync/actions";
import { cn } from "@/lib/utils";

const LEVEL_TONE = {
  Low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  High: "bg-red-500/10 text-red-700 dark:text-red-300",
} as const;
const GROWTH_TONE = {
  Low: LEVEL_TONE.High,
  Medium: LEVEL_TONE.Medium,
  High: LEVEL_TONE.Low,
} as const;

export function ChannelsView() {
  const videos = useVideos();
  const ready = useReady();
  const settings = useSettings();
  const decisions = settings?.preferences.categoryDecisions ?? {};

  const rows = useMemo(
    () =>
      CHANNELS.map((channel) => {
        const entries = channelEntries(channel.id);
        const seq = channelSequence(entries, videos);
        return { channel, stats: computeStats(entries, videos), next: seq.nextId ? indexEntry(seq.nextId) : undefined };
      }),
    [videos],
  );

  function decide(id: string, decision: "approved" | "rejected" | null) {
    const next = { ...decisions };
    if (decision) next[id] = decision;
    else delete next[id];
    void actions.updateSettings(
      { preferences: { categoryDecisions: next } },
      decision === "approved" ? "Category approved. No channel was created automatically." : decision === "rejected" ? "Category rejected" : "Decision cleared",
    );
  }

  return (
    <PageContainer>
      <PageHeader title="My Channels" description="Six channels, each with its own identity, 90-day plan and upload sequence." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ channel, stats, next }) => (
          <Link key={channel.id} href={`/channels/${channel.id}`} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <ChannelIcon icon={channel.icon} accent={channel.accent} />
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{channel.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{channel.niche}</p>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{channel.description}</p>
                <div className="flex flex-wrap gap-1">
                  {channel.categories.slice(0, 4).map((c) => (
                    <Badge key={c} variant="outline" className="text-[11px]">
                      {c}
                    </Badge>
                  ))}
                  {channel.categories.length > 4 ? <Badge variant="outline" className="text-[11px]">+{channel.categories.length - 4}</Badge> : null}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {ready ? `${stats.uploaded} uploaded · ${stats.skipped} skipped` : "Loading…"}
                    </span>
                    <span>{stats.completionPercent}%</span>
                  </div>
                  <ProgressBar value={stats.completionPercent} accent={channel.accent} label={`${channel.name} completion`} />
                </div>
                <p className="line-clamp-1 text-xs">
                  <span className="text-muted-foreground">Next: </span>
                  {next ? `Day ${next.dayNumber} V${next.videoNumber} — ${next.title}` : "All done"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="mt-10 space-y-4" aria-labelledby="suggested">
        <div className="space-y-1">
          <h2 id="suggested" className="text-lg font-semibold">
            Suggested new categories
          </h2>
          <p className="text-sm text-muted-foreground">
            {RECOMMENDATIONS.methodology} Researched {new Date(RECOMMENDATIONS.researchedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}.{" "}
            {RECOMMENDATIONS.disclaimer}
          </p>
        </div>
        {RECOMMENDATIONS.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No researched suggestions yet.</p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {RECOMMENDATIONS.recommendations.map((rec) => {
            const decision = decisions[rec.id];
            return (
              <Card key={rec.id} className={cn(decision === "rejected" && "opacity-60", decision === "approved" && "ring-2 ring-emerald-500/40")}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {rec.name}
                    {decision ? <Badge variant={decision === "approved" ? "default" : "secondary"}>{decision === "approved" ? "Approved" : "Rejected"}</Badge> : null}
                  </CardTitle>
                  <CardDescription>{rec.targetAudience}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={cn("border-transparent", LEVEL_TONE[rec.competition])}>Competition: {rec.competition}</Badge>
                    <Badge variant="outline" className={cn("border-transparent", LEVEL_TONE[rec.productionDifficulty])}>Difficulty: {rec.productionDifficulty}</Badge>
                    <Badge variant="outline" className={cn("border-transparent", GROWTH_TONE[rec.growthPotential])}>Growth: {rec.growthPotential}</Badge>
                    <Badge variant="outline" className={cn("border-transparent", GROWTH_TONE[rec.internationalPotential])}>International: {rec.internationalPotential}</Badge>
                  </div>
                  <div>
                    <p className="font-medium">Content examples</p>
                    <ul className="ml-4 list-disc text-muted-foreground">
                      {rec.examples.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    <span className="font-medium">8–10 s fit: </span>
                    <span className="text-muted-foreground">{rec.eightSecondFit}</span>
                  </p>
                  <p>
                    <span className="font-medium">Strategy: </span>
                    <span className="text-muted-foreground">{rec.strategy}</span>
                  </p>
                  <div>
                    <p className="font-medium">Monetization risks</p>
                    <ul className="ml-4 list-disc text-muted-foreground">
                      {rec.monetizationRisks.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Evidence: {rec.evidence}{" "}
                    {rec.sourceIds.map((id) => {
                      const s = RECOMMENDATIONS.sources.find((src) => src.id === id);
                      return s ? (
                        <a key={id} href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 underline">
                          [{id}]<ExternalLink className="size-3" />
                        </a>
                      ) : null;
                    })}
                  </p>
                  <div className="flex gap-2 pt-1">
                    {decision ? (
                      <Button size="sm" variant="ghost" onClick={() => decide(rec.id, null)}>
                        <Undo2 data-icon="inline-start" /> Undo
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => decide(rec.id, "approved")}>
                          <Check data-icon="inline-start" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide(rec.id, "rejected")}>
                          <X data-icon="inline-start" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {RECOMMENDATIONS.sources.length ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Sources ({RECOMMENDATIONS.sources.length})</summary>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              {RECOMMENDATIONS.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer noopener" className="underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </section>
    </PageContainer>
  );
}
