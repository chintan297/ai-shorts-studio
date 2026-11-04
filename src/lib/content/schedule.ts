import type { Channel, ChannelId } from "./schema";
import type { WorkspacePreferences } from "@/lib/progress/types";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** YYYY-MM-DD for "now" in the given IANA time zone. */
export function todayIn(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Returns "" for a missing/invalid date (e.g. before the workspace has loaded). */
export function addDays(date: string, days: number): string {
  const t = toUtc(date);
  if (!date || Number.isNaN(t)) return "";
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

/** Planned publishing date for day N of the 90-day plan. */
export function plannedDate(scheduleStart: string, dayNumber: number): string {
  return addDays(scheduleStart, dayNumber - 1);
}

/** Which plan day "today" is (may be < 1 before the start or > 90 after the end). */
export function planDayFor(scheduleStart: string, today: string): number {
  return Math.round((toUtc(today) - toUtc(scheduleStart)) / 86_400_000) + 1;
}

export function formatDate(date: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!date || Number.isNaN(toUtc(date))) return "—";
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(new Date(toUtc(date)));
}

export function slotFor(
  channel: Pick<Channel, "id" | "defaultSlots">,
  videoNumber: number,
  preferences?: WorkspacePreferences,
): string {
  const custom = preferences?.slots?.[channel.id as ChannelId];
  return (custom ?? channel.defaultSlots)[videoNumber - 1] ?? channel.defaultSlots[0];
}

export function formatSlot(slot: string): string {
  const [h = 0, m = 0] = slot.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
