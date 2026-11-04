"use client";

import { ChevronLeft, ChevronRight, Info, Lock, RotateCcw, SkipForward } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChannelIcon } from "@/components/common/channel-style";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CopyButton, CopyField } from "@/components/common/copy-button";
import { LockBadge, ProductionBadge, PublishingBadge, UploadBadge } from "@/components/common/status-badge";
import { PageContainer } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannelSequence, useSchedule } from "@/hooks/use-progress";
import { useSync } from "@/hooks/use-sync";
import { channelEntries, getChannel, indexEntry, videoHref } from "@/lib/content/catalog";
import { allDetailsText, flowLitePromptText, flowPromptText, imagePromptText, storyboardText, thumbnailPromptText } from "@/lib/content/copy-format";
import { formatDate, formatSlot, plannedDate, slotFor } from "@/lib/content/schedule";
import type { VideoIndexEntry, VideoPackage } from "@/lib/content/schema";
import { promptKey } from "@/lib/progress/types";
import { scorePackage } from "@/lib/quality/score";
import { actions } from "@/lib/sync/actions";
import { ChecklistCard } from "./checklist-card";
import { HistoryTab } from "./history-tab";
import { PromptPanel } from "./prompt-panel";
import { QualityPanel } from "./quality-panel";
import { SeoTab } from "./seo-tab";
import { UploadTab, uploadFormKey } from "./upload-tab";

const TABS = [
  ["overview", "Overview"],
  ["storyboard", "Storyboard"],
  ["image", "Image Prompt"],
  ["flow", "Google Flow Video + Audio"],
  ["thumbnail", "Thumbnail"],
  ["seo", "YouTube SEO"],
  ["upload", "Upload Details"],
  ["history", "History"],
] as const;

export function VideoWorkspace({ pkg }: { pkg: VideoPackage }) {
  const channel = getChannel(pkg.channelId)!;
  const entry: VideoIndexEntry =
    indexEntry(pkg.id) ??
    ({
      id: pkg.id,
      channelId: pkg.channelId,
      dayNumber: pkg.dayNumber,
      videoNumber: pkg.videoNumber,
      sequence: pkg.sequence,
      title: pkg.seo.title,
      concept: pkg.concept,
      category: pkg.category,
      plannedSlot: pkg.plannedSlot,
      qualityScore: pkg.quality.score,
    } satisfies VideoIndexEntry);
  const row = useSync((s) => s.progress.videos[pkg.id]);
  const imageProgress = useSync((s) => s.progress.prompts[promptKey(pkg.id, "image")]);
  const flowProgress = useSync((s) => s.progress.prompts[promptKey(pkg.id, "flow")]);
  const thumbProgress = useSync((s) => s.progress.prompts[promptKey(pkg.id, "thumbnail")]);
  const seq = useChannelSequence(pkg.channelId);
  const lock = seq.states[pkg.id];
  const { start, preferences } = useSchedule();
  const [tab, setTab] = useState<string>("overview");

  const entries = channelEntries(pkg.channelId);
  const pos = entries.findIndex((e) => e.id === pkg.id);
  const prev = pos > 0 ? entries[pos - 1] : undefined;
  const next = pos >= 0 ? entries[pos + 1] : undefined;
  const current = seq.nextId ? indexEntry(seq.nextId) : undefined;

  const overrides = { image: imageProgress?.custom_text ?? null, flow: flowProgress?.custom_text ?? null, thumbnail: thumbProgress?.custom_text ?? null };
  const edited = Boolean(overrides.image || overrides.flow || overrides.thumbnail);
  const quality = useMemo(() => {
    if (!edited) return pkg.quality;
    return scorePackage(
      {
        ...pkg,
        imagePrompt: { ...pkg.imagePrompt, prompt: overrides.image ?? pkg.imagePrompt.prompt },
        flowPrompt: { ...pkg.flowPrompt, prompt: overrides.flow ?? pkg.flowPrompt.prompt },
        thumbnail: { ...pkg.thumbnail, prompt: overrides.thumbnail ?? pkg.thumbnail.prompt },
      },
      {
        maxSimilarity: pkg.quality.maxSimilarity,
        duplicateTitle: false,
        requiresFact: Boolean(pkg.compliance.fact),
        hasCharacters: pkg.imagePrompt.prompt.includes("CHARACTER"),
      },
    );
  }, [edited, pkg, overrides.image, overrides.flow, overrides.thumbnail]);

  const date = plannedDate(start, pkg.dayNumber);
  const slot = slotFor(channel, pkg.videoNumber, preferences);
  const skipped = row?.upload_status === "skipped";
  const uploaded = row?.upload_status === "uploaded";

  return (
    <PageContainer className="max-w-7xl">
      <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/channels" className="hover:underline">
          Channels
        </Link>
        <ChevronRight className="size-3" />
        <Link href={`/channels/${channel.id}`} className="hover:underline">
          {channel.shortName}
        </Link>
        <ChevronRight className="size-3" />
        <span>
          Day {pkg.dayNumber} · Video {pkg.videoNumber}
        </span>
      </nav>

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <ChannelIcon icon={channel.icon} accent={channel.accent} />
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight wrap-break-word sm:text-2xl" data-testid="video-title">
              {pkg.seo.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Day {pkg.dayNumber} · Video {pkg.videoNumber} · {formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at{" "}
              {formatSlot(slot)} IST · {pkg.category}
            </p>
            <div className="flex flex-wrap gap-1.5" data-testid="video-badges">
              {lock ? <LockBadge state={lock} /> : null}
              <ProductionBadge status={row?.production_status ?? "pending"} />
              <UploadBadge status={row?.upload_status ?? "not_uploaded"} />
              <PublishingBadge status={row?.publishing_status ?? "not_published"} />
              <Badge variant="outline">Quality {quality.score}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <CopyButton text={allDetailsText(pkg, overrides)} label="all video details" variant="default" size="default">
            Copy All Video Details
          </CopyButton>
          {skipped ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" data-testid="restore-video">
                  <RotateCcw data-icon="inline-start" /> Restore Video
                </Button>
              }
              title="Restore this video?"
              description="It returns to its previous status, or to Pending, and the sequence is recalculated."
              confirmLabel="Restore"
              onConfirm={() => actions.restoreVideo(entry)}
            />
          ) : !uploaded ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" data-testid="skip-video">
                  <SkipForward data-icon="inline-start" /> Skip Video
                </Button>
              }
              title="Skip this video?"
              description={
                <>
                  <p>It is marked Skipped and the next video in the channel unlocks. Skipped videos never count as uploaded or completed.</p>
                  <p>The content stays here, and you can restore it at any time.</p>
                </>
              }
              confirmLabel="Skip video"
              withReason
              onConfirm={(reason) => actions.skipVideo(entry, reason || undefined)}
            />
          ) : null}
          <div className="flex gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Previous video" disabled={!prev}>
              {prev ? (
                <Link href={videoHref(prev)}>
                  <ChevronLeft />
                </Link>
              ) : (
                <span>
                  <ChevronLeft />
                </span>
              )}
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Next video" disabled={!next}>
              {next ? (
                <Link href={videoHref(next)}>
                  <ChevronRight />
                </Link>
              ) : (
                <span>
                  <ChevronRight />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {lock === "locked" && current ? (
        <Alert className="mb-4" data-testid="locked-banner">
          <Lock />
          <AlertTitle>Locked: not the next video yet</AlertTitle>
          <AlertDescription>
            <p>
              You can view and copy everything, but the checklist and upload actions unlock only when the earlier videos are
              uploaded or skipped. Next up: <Link className="font-medium underline" href={videoHref(current)}>Day {current.dayNumber} · V{current.videoNumber}</Link>.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      {lock === "current" ? (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/5" data-testid="current-banner">
          <Info />
          <AlertTitle>This is the next video for {channel.shortName}</AlertTitle>
          <AlertDescription>
            Copy the Image Prompt → generate the image → copy the Google Flow prompt → generate the video → thumbnail → copy the SEO →
            upload in YouTube Studio → paste the URL under Upload Details → Mark Uploaded.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 lg:order-1">
          <Tabs value={tab} onValueChange={setTab}>
            <div>
              <TabsList className="h-auto w-full flex-wrap justify-start">
                {TABS.map(([value, label]) => (
                  <TabsTrigger key={value} value={value} className="flex-none px-2.5 py-1">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Video concept</CardTitle>
                  <CardDescription>{pkg.concept}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {(
                      [
                        ["Video ID", pkg.id],
                        ["Channel", `${pkg.channelName} (${pkg.channelId})`],
                        ["Category", pkg.category],
                        ["Day / video", `Day ${pkg.dayNumber} · Video ${pkg.videoNumber} (#${pkg.sequence} of 180)`],
                        ["Description", pkg.description],
                        ["Target audience", pkg.targetAudience],
                        ["Target country", pkg.targetCountry],
                        ["Language", pkg.language],
                        ["Duration / format", `${pkg.durationSeconds} s · ${pkg.aspectRatio} ${pkg.format} · ${pkg.platform}`],
                        ["Generation platform", pkg.generationPlatform],
                        ["Planned publishing", `${formatDate(date)} at ${formatSlot(slot)} IST`],
                        ["Content status", `Ready · template ${pkg.templateVersion}${pkg.isFictional ? " · fictional" : ""}${pkg.madeForKids ? " · made for kids" : ""}`],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="space-y-0.5">
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd className="wrap-break-word">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Before you publish</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">AI disclosure: </span>
                    {pkg.compliance.disclosureNote}
                  </p>
                  <p>
                    <span className="font-medium">Audience: </span>
                    {pkg.compliance.madeForKidsNote}
                  </p>
                  <p>
                    <span className="font-medium">Audio license: </span>
                    {pkg.compliance.audioLicenseNote}
                  </p>
                  {pkg.compliance.fact ? (
                    <p>
                      <span className="font-medium">Fact check: </span>“{pkg.compliance.fact.statement}” Source: {pkg.compliance.fact.sourceName}. Verify it
                      against the source before publishing.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <QualityPanel report={quality} edited={edited} />
            </TabsContent>

            <TabsContent value="storyboard" className="mt-3">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle>Storyboard</CardTitle>
                    <CardDescription>One standalone 8-second generation: one subject, one action, one shot.</CardDescription>
                  </div>
                  <CopyButton text={storyboardText(pkg)} label="storyboard" />
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <ol className="grid gap-2 sm:grid-cols-3">
                    {pkg.storyboard.timeline.map((t) => (
                      <li key={t.range} className="rounded-lg border bg-muted/40 p-3">
                        <p className="text-xs font-semibold text-muted-foreground">{t.range}</p>
                        <p className="mt-1">{t.beat.replace(/^[^—]+— /, "")}</p>
                      </li>
                    ))}
                  </ol>
                  <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {(
                      [
                        ["Main concept", pkg.storyboard.mainConcept],
                        ["Opening hook", pkg.storyboard.openingHook],
                        ["Main subject", pkg.storyboard.mainSubject],
                        ["Main action", pkg.storyboard.mainAction],
                        ["Camera angle", pkg.storyboard.cameraAngle],
                        ["Camera movement", pkg.storyboard.cameraMovement],
                        ["Lighting", pkg.storyboard.lighting],
                        ["Environment / background", pkg.storyboard.environment],
                        ["Ending frame", pkg.storyboard.endingFrame],
                        ["Visual continuity", pkg.storyboard.visualContinuity],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="space-y-0.5">
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd className="wrap-break-word">{v}</dd>
                      </div>
                    ))}
                    <div className="space-y-0.5 sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Character appearance</dt>
                      <dd className="wrap-break-word">{pkg.storyboard.characterAppearance}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="image" className="mt-3">
              <PromptPanel
                entry={entry}
                promptType="image"
                title="Image generation prompt"
                copyLabel="Image Prompt"
                originalText={imagePromptText(pkg)}
                negativePrompt={pkg.imagePrompt.negativePrompt}
                progress={imageProgress}
                templateVersion={pkg.templateVersion}
              />
            </TabsContent>

            <TabsContent value="flow" className="mt-3">
              <PromptPanel
                entry={entry}
                promptType="flow"
                title="Complete Google Flow video + audio prompt"
                copyLabel="Google Flow Prompt"
                originalText={flowPromptText(pkg)}
                progress={flowProgress}
                templateVersion={pkg.templateVersion}
              >
                <Card size="sm" className="border-amber-500/40">
                  <CardContent className="space-y-3">
                    <CopyField
                      label="Short safe prompt: use this if Flow says “might violate our policies”"
                      value={flowLitePromptText(pkg)}
                      copyLabel="Short Flow Prompt"
                      maxHeight="max-h-60"
                      hint="About a quarter of the length: fewer details, fewer chances for a filter to object. Use the generated image as the start frame to keep the same face."
                    />
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Audio included in the prompt</CardTitle>
                    <CardDescription>The voice-over, music, sound effects and ambience above are generated together with the video. There’s no separate audio step.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{pkg.audio.mode === "music-only" ? "Music only" : pkg.audio.mode === "dialogue" ? "On-screen dialogue" : "Voice-over"}</Badge>
                      {pkg.audio.voice ? <Badge variant="outline">{pkg.audio.voice}</Badge> : null}
                      {pkg.audio.tone ? <Badge variant="outline">Tone: {pkg.audio.tone}</Badge> : null}
                    </div>
                    {pkg.audio.lines.length ? (
                      <ul className="space-y-1">
                        {pkg.audio.lines.map((l) => (
                          <li key={`${l.start}-${l.text}`} className="flex gap-2">
                            <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                              {l.start.toFixed(1)}–{l.end.toFixed(1)} s
                            </span>
                            <span className="text-base">
                              {l.speaker ? <span className="text-muted-foreground">{l.speaker}: </span> : null}
                              {l.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p>
                      <span className="text-muted-foreground">Music: </span>
                      {pkg.audio.music}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Sound effects: </span>
                      {pkg.audio.sfx.map((s) => `${s.at.toFixed(1)} s ${s.sound}`).join(" · ")}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Ambience: </span>
                      {pkg.audio.ambience}
                    </p>
                  </CardContent>
                </Card>
                <Alert>
                  <Info />
                  <AlertTitle>Google Flow notes</AlertTitle>
                  <AlertDescription>
                    <ul className="ml-4 list-disc space-y-1">
                      {pkg.flowPrompt.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                      <li>{pkg.compliance.audioLicenseNote}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </PromptPanel>
            </TabsContent>

            <TabsContent value="thumbnail" className="mt-3">
              <PromptPanel
                entry={entry}
                promptType="thumbnail"
                title="Thumbnail generation prompt"
                copyLabel="Thumbnail Prompt"
                originalText={thumbnailPromptText(pkg)}
                negativePrompt={pkg.thumbnail.negativePrompt}
                progress={thumbProgress}
                templateVersion={pkg.templateVersion}
              >
                <Card size="sm">
                  <CardContent className="space-y-3 text-sm">
                    <CopyField label="Thumbnail text (add it in an editor)" value={pkg.thumbnail.textSuggestion} copyLabel="thumbnail text" maxHeight="max-h-20" />
                    <p>
                      <span className="text-muted-foreground">Font style: </span>
                      {pkg.thumbnail.fontStyle}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Text placement: </span>
                      {pkg.thumbnail.textPlacement}
                    </p>
                    <p>
                      <span className="text-muted-foreground">First-frame hook (Shorts feed): </span>
                      {pkg.thumbnail.firstFrameHook}
                    </p>
                  </CardContent>
                </Card>
              </PromptPanel>
            </TabsContent>

            <TabsContent value="seo" className="mt-3">
              <SeoTab pkg={pkg} />
            </TabsContent>

            <TabsContent value="upload" className="mt-3">
              <UploadTab key={uploadFormKey(row)} pkg={pkg} entry={entry} row={row} lock={lock} />
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              <HistoryTab videoId={pkg.id} dayNumber={pkg.dayNumber} channelId={pkg.channelId} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4 lg:order-2">
          <ChecklistCard entry={entry} row={row} lock={lock} />
          <Card size="sm">
            <CardHeader>
              <CardTitle>Quick copy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <CopyButton text={imagePromptText(pkg, overrides.image)} label="Image Prompt" className="justify-start">
                Copy Image Prompt
              </CopyButton>
              <CopyButton text={flowPromptText(pkg, overrides.flow)} label="Google Flow Video + Audio Prompt" className="justify-start">
                Copy Google Flow Prompt
              </CopyButton>
              <CopyButton text={flowLitePromptText(pkg)} label="Short Flow Prompt" className="justify-start">
                Copy Short Flow Prompt
              </CopyButton>
              <CopyButton text={thumbnailPromptText(pkg, overrides.thumbnail)} label="Thumbnail Prompt" className="justify-start">
                Copy Thumbnail Prompt
              </CopyButton>
              <CopyButton text={pkg.seo.title} label="YouTube title" className="justify-start">
                Copy YouTube Title
              </CopyButton>
              <CopyButton text={pkg.seo.description} label="description" className="justify-start">
                Copy Description
              </CopyButton>
              <CopyButton text={pkg.seo.tags.join(", ")} label="tags" className="justify-start">
                Copy Tags
              </CopyButton>
              <CopyButton text={pkg.seo.hashtags.join(" ")} label="hashtags" className="justify-start">
                Copy Hashtags
              </CopyButton>
              {pkg.seo.pinnedComment ? (
                <CopyButton text={pkg.seo.pinnedComment} label="pinned comment" className="justify-start">
                  Copy Pinned Comment
                </CopyButton>
              ) : null}
              <Button variant="secondary" className="justify-start" onClick={() => setTab("upload")}>
                Go to Upload Details
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
