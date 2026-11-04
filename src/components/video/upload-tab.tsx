"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, Save, Undo2, UploadCloud, XCircle } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PUBLISHING_LABEL, PublishingBadge, UploadBadge } from "@/components/common/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSchedule } from "@/hooks/use-progress";
import type { VideoIndexEntry, VideoPackage } from "@/lib/content/schema";
import type { LockState } from "@/lib/progress/sequence";
import { extractYoutubeId } from "@/lib/progress/transitions";
import { PUBLISHING_STATUSES, type Analytics, type PublishingStatus, type VideoProgressRow } from "@/lib/progress/types";
import { actions } from "@/lib/sync/actions";

/** Form state resets when the synced upload fields change (see `uploadFormKey`). */
export function uploadFormKey(row: VideoProgressRow | undefined) {
  return [row?.youtube_url, row?.youtube_video_id, row?.uploaded_at, row?.published_at, row?.notes, row?.upload_status].join("|");
}

export function UploadTab({ pkg, entry, row, lock }: { pkg: VideoPackage; entry: VideoIndexEntry; row: VideoProgressRow | undefined; lock: LockState | undefined }) {
  const { today } = useSchedule();
  const [url, setUrl] = useState(row?.youtube_url ?? "");
  const [videoId, setVideoId] = useState(row?.youtube_video_id ?? "");
  const [uploadedAt, setUploadedAt] = useState(row?.uploaded_at ?? today);
  const [publishedAt, setPublishedAt] = useState(row?.published_at ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");

  const uploadStatus = row?.upload_status ?? "not_uploaded";
  const publishing = row?.publishing_status ?? "not_published";
  const skipped = uploadStatus === "skipped";
  const uploaded = uploadStatus === "uploaded";
  const locked = lock === "locked";
  const idValid = !videoId || /^[A-Za-z0-9_-]{11}$/.test(videoId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Upload status <UploadBadge status={uploadStatus} /> <PublishingBadge status={publishing} />
          </CardTitle>
          <CardDescription>
            Upload the video yourself in YouTube Studio or the YouTube app, then record it here. Saving a URL does not mark the
            video as uploaded; that needs the explicit confirmation below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {locked ? (
            <Alert>
              <AlertTriangle />
              <AlertTitle>Locked</AlertTitle>
              <AlertDescription>Upload or skip the earlier videos in this channel first. Failed uploads keep the sequence locked.</AlertDescription>
            </Alert>
          ) : null}
          {skipped ? (
            <Alert>
              <AlertTitle>This video is skipped</AlertTitle>
              <AlertDescription>Restore it to record an upload. Skipped videos never count as uploaded.</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="yt-url">YouTube video URL</Label>
              <Input
                id="yt-url"
                inputMode="url"
                placeholder="https://youtube.com/shorts/…"
                value={url}
                disabled={skipped}
                data-testid="youtube-url"
                onChange={(e) => {
                  setUrl(e.target.value);
                  const id = extractYoutubeId(e.target.value);
                  if (id) setVideoId(id);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yt-id">YouTube video ID</Label>
              <Input id="yt-id" value={videoId} disabled={skipped} onChange={(e) => setVideoId(e.target.value.trim())} aria-invalid={!idValid} className="font-mono" />
              {!idValid ? <p className="text-xs text-destructive">A YouTube video ID has 11 characters (letters, numbers, - or _).</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yt-uploaded">Actual upload date</Label>
              <Input id="yt-uploaded" type="date" value={uploadedAt} disabled={skipped} onChange={(e) => setUploadedAt(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={skipped || !idValid}
              onClick={() =>
                void actions.saveUploadDetails(entry, {
                  youtube_url: url.trim() || null,
                  youtube_video_id: videoId || null,
                  uploaded_at: uploadedAt || null,
                })
              }
            >
              <Save data-icon="inline-start" /> Save details
            </Button>
            {!uploaded ? (
              <MarkUploadedDialog
                entry={entry}
                title={pkg.seo.title}
                madeForKids={pkg.madeForKids}
                syntheticRequired={pkg.compliance.syntheticDisclosure === "required"}
                initialUrl={url.trim()}
                initialVideoId={videoId}
                initialUploadedAt={uploadedAt || today}
                disabled={locked || skipped || !idValid}
              />
            ) : null}
            {!uploaded && !skipped ? (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" className="text-destructive" disabled={locked} data-testid="mark-upload-failed">
                    <XCircle data-icon="inline-start" /> Mark Upload Failed
                  </Button>
                }
                title="Mark this upload as failed?"
                description="The video stays in the sequence and the next video stays locked until this one is uploaded or skipped."
                confirmLabel="Mark failed"
                withReason
                destructive
                onConfirm={(reason) => actions.markUploadFailed(entry, reason || undefined)}
              />
            ) : null}
            {uploaded ? (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost">
                    <Undo2 data-icon="inline-start" /> Revert upload
                  </Button>
                }
                title="Revert this upload?"
                description="Use this only if you marked the video uploaded by mistake. It's allowed only while no later video in the channel is uploaded."
                confirmLabel="Revert"
                withReason
                onConfirm={(reason) => actions.revertUpload(entry, reason || undefined)}
              />
            ) : null}
            {row?.youtube_url ? (
              <Button asChild variant="ghost">
                <a href={row.youtube_url} target="_blank" rel="noreferrer noopener">
                  <ExternalLink data-icon="inline-start" /> Open on YouTube
                </a>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
          <CardDescription>Track this by hand after you’ve confirmed the video’s visibility in YouTube Studio.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[220px_200px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Publishing status</Label>
            <Select
              value={publishing}
              disabled={!uploaded}
              onValueChange={(v) => void actions.setPublishing(entry, v as PublishingStatus, v === "published" ? publishedAt || today : undefined)}
            >
              <SelectTrigger className="w-full" data-testid="publishing-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PUBLISHING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PUBLISHING_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pub-date">Publishing date</Label>
            <Input id="pub-date" type="date" value={publishedAt} disabled={!uploaded} onChange={(e) => setPublishedAt(e.target.value)} />
          </div>
          <Button variant="outline" disabled={!uploaded || !publishedAt} onClick={() => void actions.saveUploadDetails(entry, { published_at: publishedAt })}>
            Save date
          </Button>
          {!uploaded ? <p className="text-xs text-muted-foreground sm:col-span-3">Available after the video is marked uploaded.</p> : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Anything to remember about this video…" />
          <Button size="sm" variant="outline" disabled={notes === (row?.notes ?? "")} onClick={() => void actions.setNotes(entry, notes)}>
            <Save data-icon="inline-start" /> Save notes
          </Button>
        </CardContent>
      </Card>

      {uploaded ? <AnalyticsCard entry={entry} analytics={row?.analytics ?? null} /> : null}
    </div>
  );
}

/**
 * Explicit "I uploaded this" confirmation. The URL can be pasted right in the dialog, so the
 * Upload Manager can record an upload without opening the workspace.
 */
export function MarkUploadedDialog({
  entry,
  title,
  madeForKids,
  syntheticRequired,
  initialUrl = "",
  initialVideoId = "",
  initialUploadedAt,
  disabled,
  trigger,
}: {
  entry: VideoIndexEntry;
  title: string;
  madeForKids: boolean;
  syntheticRequired: boolean;
  initialUrl?: string;
  initialVideoId?: string;
  initialUploadedAt: string;
  disabled: boolean;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initialUrl);
  const [videoId, setVideoId] = useState(initialVideoId);
  const [uploadedAt, setUploadedAt] = useState(initialUploadedAt);
  const [checks, setChecks] = useState({ uploaded: false, settings: false, audio: false });
  const confirmItems = [
    { key: "uploaded" as const, label: "I uploaded this video to YouTube myself and the URL is correct." },
    {
      key: "settings" as const,
      label: `I set the audience to ${madeForKids ? "“Made for kids”" : "“Not made for kids”"}${
        syntheticRequired ? " and “Altered or synthetic content: Yes”" : ""
      } in YouTube Studio.`,
    },
    { key: "audio" as const, label: "I checked the rights for the music and sound in this video (generated audio licensing isn’t verified by this app)." },
  ];
  const allChecked = Object.values(checks).every(Boolean);
  const idValid = !videoId || /^[A-Za-z0-9_-]{11}$/.test(videoId);
  const canConfirm = allChecked && Boolean(url.trim()) && idValid && Boolean(uploadedAt);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setUrl(initialUrl);
          setVideoId(initialVideoId || extractYoutubeId(initialUrl) || "");
          setUploadedAt(initialUploadedAt);
          setChecks({ uploaded: false, settings: false, audio: false });
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button disabled={disabled} data-testid="mark-uploaded">
            <UploadCloud data-icon="inline-start" /> Mark Uploaded…
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm manual upload</DialogTitle>
          <DialogDescription>
            Day {entry.dayNumber} · Video {entry.videoNumber}: {title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor={`dlg-url-${entry.id}`}>YouTube video URL</Label>
            <Input
              id={`dlg-url-${entry.id}`}
              inputMode="url"
              placeholder="https://youtube.com/shorts/…"
              value={url}
              data-testid="dialog-youtube-url"
              onChange={(e) => {
                setUrl(e.target.value);
                const id = extractYoutubeId(e.target.value);
                if (id) setVideoId(id);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`dlg-id-${entry.id}`}>Video ID</Label>
              <Input id={`dlg-id-${entry.id}`} value={videoId} onChange={(e) => setVideoId(e.target.value.trim())} aria-invalid={!idValid} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`dlg-date-${entry.id}`}>Upload date</Label>
              <Input id={`dlg-date-${entry.id}`} type="date" value={uploadedAt} onChange={(e) => setUploadedAt(e.target.value)} />
            </div>
          </div>
          {!idValid ? <p className="text-xs text-destructive">A YouTube video ID has 11 characters.</p> : null}
          {confirmItems.map((item) => (
            <label key={item.key} className="flex cursor-pointer items-start gap-3">
              <Checkbox
                className="mt-0.5"
                checked={checks[item.key]}
                data-testid={`confirm-${item.key}`}
                onCheckedChange={(v) => setChecks((c) => ({ ...c, [item.key]: v === true }))}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={!canConfirm}
            data-testid="confirm-upload-button"
            onClick={async () => {
              const ok = await actions.markUploaded(entry, { youtube_url: url.trim(), youtube_video_id: videoId || null, uploaded_at: uploadedAt });
              if (ok) setOpen(false);
            }}
          >
            <CheckCircle2 data-icon="inline-start" /> Confirm uploaded
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalyticsCard({ entry, analytics }: { entry: VideoIndexEntry; analytics: Analytics | null }) {
  const fields: Array<{ key: keyof Analytics; label: string }> = [
    { key: "views", label: "Views" },
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Comments" },
    { key: "subscribersGained", label: "Subscribers gained" },
    { key: "averageViewDurationSeconds", label: "Avg. view duration (s)" },
    { key: "retentionPercent", label: "Retention (%)" },
  ];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, analytics?.[f.key] !== undefined ? String(analytics[f.key]) : ""])),
  );
  const engagement =
    analytics?.views && analytics.views > 0
      ? `${(((analytics.likes ?? 0) + (analytics.comments ?? 0)) / analytics.views * 100).toFixed(1)}% engagement`
      : null;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Performance (optional, manual)</CardTitle>
        <CardDescription>
          Copy the numbers from YouTube Studio if you want to track them. Nothing is fetched automatically, and no numbers are made up.
          {analytics?.recordedAt ? ` Last updated ${analytics.recordedAt}.` : ""} {engagement}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`an-${f.key}`}>{f.label}</Label>
              <Input
                id={`an-${f.key}`}
                type="number"
                min={0}
                inputMode="decimal"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const data: Analytics = { recordedAt: new Date().toISOString().slice(0, 10) };
            for (const f of fields) {
              const n = Number(values[f.key]);
              if (values[f.key] !== "" && Number.isFinite(n) && n >= 0) (data as Record<string, number | string>)[f.key] = n;
            }
            void actions.setAnalytics(entry, data);
          }}
        >
          <Save data-icon="inline-start" /> Save performance
        </Button>
      </CardContent>
    </Card>
  );
}
