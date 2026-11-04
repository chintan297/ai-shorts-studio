/**
 * Lightweight static catalog shared by client components: channel definitions and the
 * per-video index (titles, days, categories). Full packages are loaded server-side only.
 */
import channelsJson from "@data/channels.json";
import indexJson from "@data/content/index.json";
import type { Channel, ChannelId, VideoIndexEntry } from "./schema";

export const CHANNELS = channelsJson as Channel[];
export const VIDEO_INDEX = indexJson as VideoIndexEntry[];

const byChannel = new Map<ChannelId, VideoIndexEntry[]>();
const byId = new Map<string, VideoIndexEntry>();
for (const entry of VIDEO_INDEX) {
  byId.set(entry.id, entry);
  const list = byChannel.get(entry.channelId) ?? [];
  list.push(entry);
  byChannel.set(entry.channelId, list);
}
for (const list of byChannel.values()) list.sort((a, b) => a.sequence - b.sequence);

export function getChannel(id: string): Channel | undefined {
  return CHANNELS.find((c) => c.id === id);
}

export function channelEntries(id: ChannelId): VideoIndexEntry[] {
  return byChannel.get(id) ?? [];
}

export function indexEntry(videoId: string): VideoIndexEntry | undefined {
  return byId.get(videoId);
}

export function dayEntries(channelId: ChannelId, day: number): VideoIndexEntry[] {
  return channelEntries(channelId).filter((e) => e.dayNumber === day);
}

export const videoHref = (entry: Pick<VideoIndexEntry, "channelId" | "id">) => `/channels/${entry.channelId}/videos/${entry.id}`;
