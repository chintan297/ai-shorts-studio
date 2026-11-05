import { z } from "zod";

export const CHANNEL_IDS = [
  "future-ai",
  "ai-fashion",
  "galaxy-space",
  "kids-learning",
  "ai-facts",
  "ai-animals",
] as const;

export const channelIdSchema = z.enum(CHANNEL_IDS);
export type ChannelId = z.infer<typeof channelIdSchema>;

export const DAYS_PER_CHANNEL = 90;
export const VIDEOS_PER_DAY = 2;
export const VIDEOS_PER_CHANNEL = DAYS_PER_CHANNEL * VIDEOS_PER_DAY;
export const VIDEO_DURATION_SECONDS = 8;

const nonEmpty = z.string().trim().min(1);

// ---------------------------------------------------------------------------
// Channel definitions (data/channels.json)
// ---------------------------------------------------------------------------

export const identityTraitSchema = z.object({ label: nonEmpty, value: nonEmpty });

export const channelIdentitySchema = z.object({
  title: nonEmpty,
  summary: nonEmpty,
  traits: z.array(identityTraitSchema).min(1),
});

export const channelSchema = z.object({
  id: channelIdSchema,
  name: nonEmpty,
  shortName: nonEmpty,
  niche: nonEmpty,
  description: nonEmpty,
  icon: nonEmpty,
  accent: nonEmpty,
  categories: z.array(nonEmpty).min(5),
  visualStyle: z.array(nonEmpty).min(3),
  targetAudience: nonEmpty,
  language: nonEmpty,
  targetCountry: nonEmpty,
  madeForKids: z.boolean(),
  syntheticDisclosure: z.enum(["required", "not-required"]),
  defaultSlots: z.tuple([nonEmpty, nonEmpty]),
  narrator: nonEmpty,
  identities: z.array(channelIdentitySchema),
});
export type Channel = z.infer<typeof channelSchema>;

// ---------------------------------------------------------------------------
// Seeds (content-src/seeds/**) – one hand-written seed per video
// ---------------------------------------------------------------------------

export const timedLineSchema = z.object({
  start: z.number().min(0).max(VIDEO_DURATION_SECONDS),
  end: z.number().min(0).max(VIDEO_DURATION_SECONDS),
  text: nonEmpty,
  speaker: z.string().optional(),
});
export type TimedLine = z.infer<typeof timedLineSchema>;

export const soundCueSchema = z.object({
  at: z.number().min(0).max(VIDEO_DURATION_SECONDS),
  sound: nonEmpty,
});
export type SoundCue = z.infer<typeof soundCueSchema>;

export const seedSchema = z.object({
  category: nonEmpty,
  concept: nonEmpty,
  hook: nonEmpty,
  subject: nonEmpty,
  environment: nonEmpty,
  action: nonEmpty,
  payoff: nonEmpty,
  camera: z.object({ angle: nonEmpty, movement: nonEmpty, lens: nonEmpty }),
  lighting: nonEmpty,
  colorGrade: nonEmpty,
  vfx: z.string().optional(),
  look: z
    .object({
      outfit: nonEmpty,
      accessories: nonEmpty,
      hairStyling: nonEmpty,
      pose: nonEmpty,
      expression: nonEmpty,
    })
    .optional(),
  characters: z.array(nonEmpty).optional(),
  audio: z.object({
    mode: z.enum(["voiceover", "dialogue", "music-only"]),
    voice: z.string().optional(),
    tone: z.string().optional(),
    lines: z.array(timedLineSchema),
    music: nonEmpty,
    sfx: z.array(soundCueSchema).min(1),
    ambience: nonEmpty,
  }),
  /** `overlay`: Latin-script headline (1–4 words) rendered inside the thumbnail; set from content-src/thumbnail-text. */
  thumbnail: z.object({ text: nonEmpty, concept: nonEmpty, overlay: z.string().optional() }),
  seo: z.object({
    title: nonEmpty,
    altTitles: z.tuple([nonEmpty, nonEmpty, nonEmpty]),
    summaryHi: nonEmpty,
    summaryEn: nonEmpty,
    primaryKeywords: z.array(nonEmpty).min(2),
    secondaryKeywords: z.array(nonEmpty).min(2),
    hashtags: z.array(nonEmpty).min(1).max(3),
    engagementQuestion: z.string().optional(),
    playlist: nonEmpty,
  }),
  fact: z.object({ statement: nonEmpty, sourceName: nonEmpty }).optional(),
  isFictional: z.boolean().optional(),
});
export type VideoSeed = z.infer<typeof seedSchema>;

// ---------------------------------------------------------------------------
// Composed video packages (data/content/<channel>.json)
// ---------------------------------------------------------------------------

export const qualitySectionKeys = [
  "originality",
  "hook",
  "visual",
  "promptClarity",
  "flowCompatibility",
  "characterConsistency",
  "audio",
  "seo",
  "thumbnail",
  "policy",
] as const;
export type QualitySectionKey = (typeof qualitySectionKeys)[number];

export const qualityCheckSchema = z.object({
  id: nonEmpty,
  section: z.enum(qualitySectionKeys),
  label: nonEmpty,
  passed: z.boolean(),
  mandatory: z.boolean(),
  suggestion: z.string().optional(),
});
export type QualityCheck = z.infer<typeof qualityCheckSchema>;

export const qualityReportSchema = z.object({
  score: z.number().min(0).max(100),
  maxSimilarity: z.number().min(0).max(1),
  sections: z.record(z.enum(qualitySectionKeys), z.number().min(0).max(10)),
  checks: z.array(qualityCheckSchema),
  approved: z.boolean(),
});
export type QualityReport = z.infer<typeof qualityReportSchema>;

export const storyboardSchema = z.object({
  mainConcept: nonEmpty,
  openingHook: nonEmpty,
  mainSubject: nonEmpty,
  characterAppearance: nonEmpty,
  background: nonEmpty,
  mainAction: nonEmpty,
  cameraAngle: nonEmpty,
  cameraMovement: nonEmpty,
  lighting: nonEmpty,
  environment: nonEmpty,
  endingFrame: nonEmpty,
  visualContinuity: nonEmpty,
  timeline: z.array(z.object({ range: nonEmpty, beat: nonEmpty })).min(3),
});

export const videoPackageSchema = z.object({
  id: nonEmpty,
  channelId: channelIdSchema,
  channelName: nonEmpty,
  category: nonEmpty,
  dayNumber: z.number().int().min(1).max(DAYS_PER_CHANNEL),
  videoNumber: z.number().int().min(1).max(VIDEOS_PER_DAY),
  sequence: z.number().int().min(1).max(VIDEOS_PER_CHANNEL),
  concept: nonEmpty,
  description: nonEmpty,
  targetAudience: nonEmpty,
  targetCountry: nonEmpty,
  language: nonEmpty,
  durationSeconds: z.literal(VIDEO_DURATION_SECONDS),
  aspectRatio: z.literal("9:16"),
  format: z.literal("Vertical"),
  platform: z.literal("YouTube Shorts"),
  generationPlatform: nonEmpty,
  plannedSlot: z.string().regex(/^\d{2}:\d{2}$/),
  contentStatus: z.literal("ready"),
  templateVersion: nonEmpty,
  isFictional: z.boolean(),
  madeForKids: z.boolean(),
  storyboard: storyboardSchema,
  imagePrompt: z.object({ prompt: nonEmpty, negativePrompt: nonEmpty }),
  flowPrompt: z.object({ prompt: nonEmpty, notes: z.array(nonEmpty) }),
  audio: z.object({
    mode: z.enum(["voiceover", "dialogue", "music-only"]),
    voice: z.string().nullable(),
    tone: z.string().nullable(),
    lines: z.array(timedLineSchema),
    music: nonEmpty,
    sfx: z.array(soundCueSchema),
    ambience: nonEmpty,
  }),
  thumbnail: z.object({
    prompt: nonEmpty,
    negativePrompt: nonEmpty,
    concept: nonEmpty,
    textSuggestion: nonEmpty,
    fontStyle: nonEmpty,
    textPlacement: nonEmpty,
    firstFrameHook: nonEmpty,
  }),
  seo: z.object({
    title: nonEmpty,
    altTitles: z.tuple([nonEmpty, nonEmpty, nonEmpty]),
    description: nonEmpty,
    primaryKeywords: z.array(nonEmpty),
    secondaryKeywords: z.array(nonEmpty),
    tags: z.array(nonEmpty),
    hashtags: z.array(nonEmpty),
    pinnedComment: z.string().nullable(),
    engagementQuestion: z.string().nullable(),
    playlist: nonEmpty,
  }),
  compliance: z.object({
    syntheticDisclosure: z.enum(["required", "not-required"]),
    disclosureNote: nonEmpty,
    madeForKidsNote: nonEmpty,
    audioLicenseNote: nonEmpty,
    fact: z.object({ statement: nonEmpty, sourceName: nonEmpty }).nullable(),
  }),
  quality: qualityReportSchema,
});
export type VideoPackage = z.infer<typeof videoPackageSchema>;

/** Lightweight entry used by lists, calendars and dashboards. */
export const videoIndexEntrySchema = z.object({
  id: nonEmpty,
  channelId: channelIdSchema,
  dayNumber: z.number().int(),
  videoNumber: z.number().int(),
  sequence: z.number().int(),
  title: nonEmpty,
  concept: nonEmpty,
  category: nonEmpty,
  plannedSlot: nonEmpty,
  qualityScore: z.number(),
});
export type VideoIndexEntry = z.infer<typeof videoIndexEntrySchema>;

export function videoIdFor(channelId: ChannelId, day: number, videoNumber: number): string {
  return `${channelId}-d${String(day).padStart(3, "0")}-v${videoNumber}`;
}

export function parseVideoId(
  id: string,
): { channelId: ChannelId; dayNumber: number; videoNumber: number } | null {
  const match = /^(.+)-d(\d{3})-v(\d)$/.exec(id);
  if (!match) return null;
  const channel = channelIdSchema.safeParse(match[1]);
  if (!channel.success) return null;
  return {
    channelId: channel.data,
    dayNumber: Number(match[2]),
    videoNumber: Number(match[3]),
  };
}
