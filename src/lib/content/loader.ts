import "server-only";
import aiAnimals from "@data/content/ai-animals.json";
import aiFacts from "@data/content/ai-facts.json";
import aiFashion from "@data/content/ai-fashion.json";
import futureAi from "@data/content/future-ai.json";
import galaxySpace from "@data/content/galaxy-space.json";
import kidsLearning from "@data/content/kids-learning.json";
import type { ChannelId, VideoPackage } from "./schema";

const PACKAGES: Record<ChannelId, VideoPackage[]> = {
  "future-ai": futureAi as VideoPackage[],
  "ai-fashion": aiFashion as VideoPackage[],
  "galaxy-space": galaxySpace as VideoPackage[],
  "kids-learning": kidsLearning as VideoPackage[],
  "ai-facts": aiFacts as VideoPackage[],
  "ai-animals": aiAnimals as VideoPackage[],
};

export function getPackage(channelId: string, videoId: string): VideoPackage | undefined {
  return PACKAGES[channelId as ChannelId]?.find((p) => p.id === videoId);
}

export function allVideoParams(): Array<{ channelId: string; videoId: string }> {
  return Object.entries(PACKAGES).flatMap(([channelId, list]) => list.map((p) => ({ channelId, videoId: p.id })));
}
