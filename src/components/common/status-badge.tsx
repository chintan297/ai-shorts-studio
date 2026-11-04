import { Badge } from "@/components/ui/badge";
import type { LockState } from "@/lib/progress/sequence";
import type { ProductionStatus, PublishingStatus, TestingStatus, UploadStatus } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

export const PRODUCTION_LABEL: Record<ProductionStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  image_generated: "Image Generated",
  video_generated: "Video Generated",
  thumbnail_ready: "Thumbnail Ready",
  ready_for_upload: "Ready for Upload",
  completed: "Completed",
  failed: "Failed",
};

export const UPLOAD_LABEL: Record<UploadStatus, string> = {
  not_uploaded: "Not Uploaded",
  uploaded: "Uploaded",
  upload_failed: "Upload Failed",
  skipped: "Skipped",
};

export const PUBLISHING_LABEL: Record<PublishingStatus, string> = {
  not_published: "Not Published",
  scheduled_manually: "Scheduled Manually",
  published: "Published",
  private: "Private",
  unlisted: "Unlisted",
};

export const TESTING_LABEL: Record<TestingStatus, string> = {
  untested: "Untested",
  testing: "Testing",
  approved: "Approved",
  failed: "Failed",
};

const TONE = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  progress: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  ready: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  danger: "bg-red-500/10 text-red-700 dark:text-red-300",
  skipped: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 line-through decoration-1",
} as const;
type Tone = keyof typeof TONE;

const PRODUCTION_TONE: Record<ProductionStatus, Tone> = {
  pending: "neutral",
  in_progress: "progress",
  image_generated: "progress",
  video_generated: "progress",
  thumbnail_ready: "progress",
  ready_for_upload: "ready",
  completed: "success",
  failed: "danger",
};
const UPLOAD_TONE: Record<UploadStatus, Tone> = { not_uploaded: "neutral", uploaded: "success", upload_failed: "danger", skipped: "skipped" };
const PUBLISHING_TONE: Record<PublishingStatus, Tone> = {
  not_published: "neutral",
  scheduled_manually: "info",
  published: "success",
  private: "neutral",
  unlisted: "info",
};
const TESTING_TONE: Record<TestingStatus, Tone> = { untested: "neutral", testing: "info", approved: "success", failed: "danger" };
const LOCK_TONE: Record<LockState, Tone> = { uploaded: "success", skipped: "skipped", current: "ready", locked: "neutral" };
const LOCK_LABEL: Record<LockState, string> = { uploaded: "Uploaded", skipped: "Skipped", current: "Next up", locked: "Locked" };

function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", TONE[tone], className)}>
      {children}
    </Badge>
  );
}

export function ProductionBadge({ status, className }: { status: ProductionStatus; className?: string }) {
  return <Pill tone={PRODUCTION_TONE[status]} className={className}>{PRODUCTION_LABEL[status]}</Pill>;
}
export function UploadBadge({ status, className }: { status: UploadStatus; className?: string }) {
  return <Pill tone={UPLOAD_TONE[status]} className={className}>{UPLOAD_LABEL[status]}</Pill>;
}
export function PublishingBadge({ status, className }: { status: PublishingStatus; className?: string }) {
  return <Pill tone={PUBLISHING_TONE[status]} className={className}>{PUBLISHING_LABEL[status]}</Pill>;
}
export function TestingBadge({ status, className }: { status: TestingStatus; className?: string }) {
  return <Pill tone={TESTING_TONE[status]} className={className}>{TESTING_LABEL[status]}</Pill>;
}
export function LockBadge({ state, className }: { state: LockState; className?: string }) {
  return <Pill tone={LOCK_TONE[state]} className={className}>{LOCK_LABEL[state]}</Pill>;
}

/** Dot colors used by calendars (one dot per video). */
export function statusDotClass(state: LockState | undefined, failed: boolean, inProgress: boolean): string {
  if (state === "uploaded") return "bg-emerald-500";
  if (state === "skipped") return "bg-zinc-400 dark:bg-zinc-500";
  if (failed) return "bg-red-500";
  if (state === "current") return "bg-amber-500 ring-2 ring-amber-500/30";
  if (inProgress) return "bg-indigo-500";
  return "bg-muted-foreground/25";
}
