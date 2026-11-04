"use client";

import { RotateCcw, SkipForward } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useSync } from "@/hooks/use-sync";
import type { ChannelId } from "@/lib/content/schema";
import { actions } from "@/lib/sync/actions";
import { daySkipKey } from "@/lib/progress/types";
import { dayEntries } from "@/lib/content/catalog";

/** Skip Day / Restore Day buttons with confirmation. Never deletes content; uploaded videos are preserved. */
export function DayActions({ channelId, day, size = "sm" }: { channelId: ChannelId; day: number; size?: "sm" | "xs" }) {
  const daySkip = useSync((s) => s.progress.daySkips[daySkipKey(channelId, day)]);
  const videos = useSync((s) => s.progress.videos);
  const entries = dayEntries(channelId, day);
  const active = Boolean(daySkip && !daySkip.restored_at);
  const allUploaded = entries.length > 0 && entries.every((e) => videos[e.id]?.upload_status === "uploaded");
  const anyDaySkipped = entries.some((e) => videos[e.id]?.skip_scope === "day");

  if (active || anyDaySkipped) {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="outline" size={size} data-testid={`restore-day-${day}`}>
            <RotateCcw data-icon="inline-start" /> Restore Day
          </Button>
        }
        title={`Restore day ${day}?`}
        description="Videos skipped by this day-skip return to their previous status (or Pending). Videos you skipped individually stay skipped."
        confirmLabel="Restore day"
        onConfirm={() => actions.restoreDay(channelId, day)}
      />
    );
  }
  if (allUploaded) return null;
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size={size} data-testid={`skip-day-${day}`}>
          <SkipForward data-icon="inline-start" /> Skip Day
        </Button>
      }
      title={`Skip day ${day}?`}
      description={
        <>
          <p>All videos of this day that aren&apos;t uploaded will be marked Skipped. Uploaded videos are kept as they are.</p>
          <p>The content isn&apos;t deleted, and you can restore the day at any time.</p>
        </>
      }
      confirmLabel="Skip day"
      withReason
      onConfirm={(reason) => actions.skipDay(channelId, day, reason || undefined)}
    />
  );
}
