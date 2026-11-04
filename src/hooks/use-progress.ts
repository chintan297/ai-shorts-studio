"use client";

import { useMemo, useSyncExternalStore } from "react";
import { channelEntries } from "@/lib/content/catalog";
import { planDayFor, todayIn } from "@/lib/content/schedule";
import type { ChannelId } from "@/lib/content/schema";
import { channelSequence } from "@/lib/progress/sequence";
import { useSync } from "./use-sync";

export function useVideos() {
  return useSync((s) => s.progress.videos);
}

export function useSettings() {
  return useSync((s) => s.progress.settings);
}

export function useReady() {
  return useSync((s) => s.phase === "ready");
}

function subscribeMinute(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

/** Today's date in the workspace time zone. `null` while prerendering on the server (dates are client-only). */
export function useToday(timeZone: string): string | null {
  return useSyncExternalStore(subscribeMinute, () => todayIn(timeZone), () => null);
}

/** Today's date (workspace time zone), the schedule start date and today's plan day number. */
export function useSchedule() {
  const settings = useSettings();
  const tz = settings?.timezone ?? "Asia/Kolkata";
  const today = useToday(tz) ?? "";
  const start = settings?.schedule_start_date ?? today;
  const planDay = start && today ? planDayFor(start, today) : 0;
  return { today, start, planDay, preferences: settings?.preferences ?? {}, timezone: tz };
}

export function useChannelSequence(channelId: ChannelId) {
  const videos = useVideos();
  return useMemo(() => channelSequence(channelEntries(channelId), videos), [channelId, videos]);
}
