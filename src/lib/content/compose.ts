import {
  VIDEO_DURATION_SECONDS,
  VIDEOS_PER_DAY,
  videoIdFor,
  type Channel,
  type QualityReport,
  type VideoPackage,
  type VideoSeed,
} from "./schema";

export const TEMPLATE_VERSION = "v2";
export const GENERATION_PLATFORM = "Google Flow (Veo 3.1 — video + native audio)";

export interface CastMember {
  name: string;
  description: string;
  /**
   * How prompts refer to this character instead of the name (e.g. "the Indian model"). Image/video filters
   * treat full names as possible real people, so realistic characters are never named inside prompts.
   */
  promptLabel?: string;
}

/** Everything a channel needs to turn seeds into complete, copy-ready packages. */
export interface ChannelTemplate {
  channel: Channel;
  /** Recurring characters that seeds may reference by key. */
  cast?: Record<string, CastMember>;
  /** Permanent identity text injected into every image + Flow prompt (fashion model). */
  permanentIdentity?: string;
  /** What the clip is, for the opening line of the Flow prompt (e.g. "fashion reel"). */
  genre: string;
  imageStyle: string;
  videoStyle: string;
  /** Current Shorts look for this niche (grade, texture, energy). Positive wording only. */
  trendLook: string;
  consistencyRules: string;
  motionRules: string;
  imageNegatives: string[];
  thumbnailPalette: string;
  thumbnailFont: string;
  defaultVoice: string;
  defaultTone: string;
  baseTags: string[];
  baseHashtags: string[];
  disclosureLine: string;
  ctaLines: string[];
  pinnedTemplates: Array<(question: string) => string>;
  /** Kids learning videos may show the single letter / number / shape being taught. */
  learningSymbolsAllowed?: boolean;
  /** Every seed must reference at least one cast member (e.g. the fashion models). */
  requiresCharacters?: boolean;
  /** Content-policy guard: the build fails if a seed's text matches any of these. */
  forbiddenTerms?: RegExp[];
  /** Whether a seed must carry a verifiable fact + source. */
  requiresFact: (seed: VideoSeed) => boolean;
}

const SHARED_IMAGE_NEGATIVES = [
  "extra fingers",
  "missing fingers",
  "fused fingers",
  "extra hands",
  "extra limbs",
  "distorted anatomy",
  "deformed face",
  "asymmetrical eyes",
  "blurry",
  "low resolution",
  "jpeg artifacts",
  "oversaturated",
  "text",
  "letters",
  "watermark",
  "logo",
  "brand names",
  "signature",
  "frame border",
  "cropped subject",
];

export const AUDIO_LICENSE_NOTE =
  "This app cannot verify the license of AI-generated audio. Before publishing, check the Google generative-AI terms that apply to your account. If you are unsure, mute the generated music and add a track from YouTube Studio's Audio Library instead. Never add commercial songs.";

const LEARNING_SYMBOL_NEGATIVES = ["misspelled letters", "wrong numbers", "mirrored letters", "extra text"];

function imageNegatives(tpl: ChannelTemplate, extra: string[] = []): string {
  const shared = tpl.learningSymbolsAllowed
    ? [...SHARED_IMAGE_NEGATIVES.filter((n) => n !== "text" && n !== "letters"), ...LEARNING_SYMBOL_NEGATIVES]
    : SHARED_IMAGE_NEGATIVES;
  return [...shared, ...extra, ...tpl.imageNegatives].join(", ");
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n.toFixed(1)}` : `${n}`);

function castMembers(tpl: ChannelTemplate, seed: VideoSeed): CastMember[] {
  if (!seed.characters?.length || !tpl.cast) return [];
  return seed.characters.map((key) => {
    const member = tpl.cast?.[key];
    if (!member) throw new Error(`Unknown character "${key}" for ${tpl.channel.id}`);
    return member;
  });
}

/** Human-readable cast text (storyboard / UI): uses the characters' names. */
function castText(tpl: ChannelTemplate, seed: VideoSeed): string | null {
  const members = castMembers(tpl, seed);
  return members.length ? members.map((m) => `${m.name}: ${m.description}`).join(" ") : null;
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Cast text for prompts: realistic characters are described, never named. */
function castPromptText(tpl: ChannelTemplate, seed: VideoSeed): string | null {
  const members = castMembers(tpl, seed);
  if (!members.length) return null;
  return members
    .map((m) => (m.promptLabel ? `${capitalize(m.promptLabel)} is ${m.description}` : `${m.name}: ${m.description}`))
    .join(" ");
}

/** Replaces names of characters that have a promptLabel ("Meher's" → "the Indian model's"). */
export function depersonalize(tpl: ChannelTemplate, text: string): string {
  let out = text;
  for (const m of Object.values(tpl.cast ?? {})) {
    if (!m.promptLabel) continue;
    const first = m.name.split(" ")[0] ?? m.name;
    const re = new RegExp(`\\b(?:${escapeRe(m.name)}|${escapeRe(first)})\\b`, "g");
    out = out.replace(re, (_match, offset: number, whole: string) => {
      const sentenceStart = /(^|[.!?•\n]\s*)$/.test(whole.slice(0, offset));
      return sentenceStart ? capitalize(m.promptLabel!) : m.promptLabel!;
    });
  }
  return out;
}

/** Character / subject appearance text shared by storyboard, image and Flow prompts. */
export function characterAppearance(tpl: ChannelTemplate, seed: VideoSeed): string {
  const parts: string[] = [];
  if (tpl.permanentIdentity) parts.push(tpl.permanentIdentity);
  const cast = castText(tpl, seed);
  if (cast) parts.push(cast);
  if (seed.look) {
    parts.push(
      `Outfit: ${seed.look.outfit}. Accessories: ${seed.look.accessories}. Hair styling: ${seed.look.hairStyling}.`,
    );
  }
  if (parts.length === 0) parts.push(seed.subject);
  return parts.join(" ");
}

function storyboard(tpl: ChannelTemplate, seed: VideoSeed): VideoPackage["storyboard"] {
  return {
    mainConcept: seed.concept,
    openingHook: seed.hook,
    mainSubject: seed.subject,
    characterAppearance: characterAppearance(tpl, seed),
    background: seed.environment,
    mainAction: seed.look ? `${seed.action} Pose: ${seed.look.pose}.` : seed.action,
    cameraAngle: seed.camera.angle,
    cameraMovement: seed.camera.movement,
    lighting: seed.lighting,
    environment: seed.environment,
    endingFrame: seed.payoff,
    visualContinuity: tpl.consistencyRules,
    timeline: [
      { range: "0.0–2.0 s", beat: `Hook — ${seed.hook}` },
      { range: "2.0–6.0 s", beat: `Main action — ${seed.action}` },
      { range: "6.0–8.0 s", beat: `Payoff & ending frame — ${seed.payoff}` },
    ],
  };
}

function imagePrompt(tpl: ChannelTemplate, seed: VideoSeed): VideoPackage["imagePrompt"] {
  const p = (t: string) => depersonalize(tpl, t);
  const lines = [
    `${tpl.imageStyle} Vertical 9:16 portrait image, 1080×1920.`,
    `This image is the FIRST FRAME of an 8-second video: ${p(seed.hook)}`,
    `MAIN SUBJECT: ${p(seed.subject)}.`,
  ];
  const identity = [tpl.permanentIdentity, castPromptText(tpl, seed)].filter(Boolean).join(" ");
  if (identity) lines.push(`CHARACTER (keep identical in every image): ${identity}`);
  if (seed.look) {
    lines.push(
      `OUTFIT: ${p(seed.look.outfit)}.`,
      `ACCESSORIES: ${p(seed.look.accessories)}.`,
      `HAIR: ${p(seed.look.hairStyling)}.`,
      `POSE: ${p(seed.look.pose)}.`,
      `EXPRESSION: ${p(seed.look.expression)}.`,
    );
  }
  lines.push(
    `ENVIRONMENT & BACKGROUND: ${p(seed.environment)}.`,
    `CAMERA: ${seed.camera.angle}, ${seed.camera.lens} lens.`,
    `LIGHTING: ${seed.lighting}.`,
    `COLOR GRADE: ${seed.colorGrade}.`,
    `LOOK: ${tpl.trendLook}.`,
    "COMPOSITION: main subject in the central vertical band, clean space at the top and bottom 12% for the YouTube Shorts interface, clear subject separation from the background.",
    "QUALITY: ultra-detailed, sharp focus on the subject, natural textures, high dynamic range, professional color accuracy.",
    `CONSISTENCY: ${tpl.consistencyRules}`,
  );
  return {
    prompt: lines.join("\n"),
    negativePrompt: imageNegatives(tpl),
  };
}

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const withArticle = (t: string) => `${/^[aeiou]/i.test(t) ? "an" : "a"} ${t}`;

/** One sentence-style sound direction (Veo generates the audio together with the video). */
function soundDirection(tpl: ChannelTemplate, seed: VideoSeed): string {
  const p = (t: string) => depersonalize(tpl, t);
  const { audio } = seed;
  const parts: string[] = [];
  const spoken = audio.mode === "music-only" ? [] : audio.lines;
  if (spoken.length && audio.mode === "voiceover") {
    const voice = lowerFirst(audio.voice ?? tpl.defaultVoice);
    const tone = audio.tone ?? tpl.defaultTone;
    parts.push(
      `Off-screen voice-over by ${withArticle(voice)}, speaking Hindi in ${withArticle(tone)} tone: ${spoken
        .map((l) => `at ${fmt(l.start)}s "${l.text}"`)
        .join(", then ")}.`,
    );
  } else if (spoken.length) {
    const voice = p(audio.voice ?? tpl.defaultVoice);
    parts.push(
      `Spoken dialogue in Hindi with matching lip movement (${voice}; ${audio.tone ?? tpl.defaultTone}): ${spoken
        .map((l) => `${p(l.speaker ?? "the character")} at ${fmt(l.start)}s: "${l.text}"`)
        .join("; ")}.`,
    );
  } else {
    parts.push("No voice: music and natural sound only.");
  }
  parts.push(
    `Music: original instrumental, ${audio.music}, no vocals, with a gentle lift at the 6-second reveal and a soft fade-out by 8 seconds.`,
    `Sound effects: ${audio.sfx.map((c) => `${c.sound} (${fmt(c.at)}s)`).join(", ")}.`,
    `Ambience: ${audio.ambience}.`,
  );
  return parts.join(" ");
}

/** Payoffs that already end on a held frame ("…, holding steady.") skip the closing hold sentence. */
const HELD_FRAME =
  /\b(?:frame|shot|camera|scene|image|view|moment)s? (?:then )?(?:holds?|rests?|settles?)\b|\bhold(?:s|ing)? (?:steady|still)\b|\b(?:and|then) holds?\b(?! (?:a|an|the|its|his|her|their|up|out|half|on to|onto)\b)/i;

/**
 * The single Google Flow (Veo 3.1) prompt. Built the way Google recommends for Veo: scene, subject, action
 * beats, camera, look and sound, in positive wording only. It never lists unwanted things (filters read the
 * whole prompt) and never names a realistic person.
 */
function flowPrompt(tpl: ChannelTemplate, seed: VideoSeed): VideoPackage["flowPrompt"] {
  const p = (t: string) => depersonalize(tpl, t);
  const who = castPromptText(tpl, seed);
  const duo = (seed.characters?.length ?? 0) > 1;
  const plural = (t: string) => (duo ? t.replace(/^She stays/, "Both models stay").replace(/^The model keeps/, "Each model keeps") : t);
  const lens = /\blens\b|framing/i.test(seed.camera.lens) ? seed.camera.lens : `${seed.camera.lens} lens`;
  const lines = [
    `A scroll-stopping 8-second vertical (9:16) ${tpl.genre}, filmed as one smooth continuous take. ${p(seed.concept)}`,
    "",
    `SCENE: ${p(seed.environment)}.`,
    who ? `CHARACTER: ${who}` : `SUBJECT: ${p(seed.subject)}.`,
  ];
  if (seed.look) {
    lines.push(
      `STYLING: Outfit: ${p(seed.look.outfit)}. Accessories: ${p(seed.look.accessories)}. Hair: ${p(seed.look.hairStyling)}. Starting pose: ${p(seed.look.pose)}. Expression: ${p(seed.look.expression)}.`,
    );
  }
  lines.push(
    "",
    "ACTION:",
    `0–2s: ${p(seed.hook)}`,
    `2–6s: ${p(seed.action)}`,
    `6–8s: ${p(seed.payoff)}${HELD_FRAME.test(seed.payoff) ? "" : " The final frame holds steady."}`,
    `Movement: ${plural(tpl.motionRules)}`,
    "",
    `CAMERA: ${seed.camera.angle}; ${lowerFirst(seed.camera.movement)}; ${lens}; smooth and stabilized.`,
    `LOOK: ${tpl.videoStyle.split(":")[0]}. ${capitalize(tpl.trendLook)}. Lighting: ${lowerFirst(seed.lighting)}. Color grade: ${lowerFirst(seed.colorGrade)}.${seed.vfx ? ` Effects: ${lowerFirst(p(seed.vfx))}.` : ""}`,
    "",
    `SOUND: ${soundDirection(tpl, seed)}`,
    "",
    `KEEP CONSISTENT: ${plural(tpl.consistencyRules)} Clean frame without captions, subtitles or logos.`,
  );

  const notes = [
    "Flow settings: choose Veo 3.1, aspect ratio Portrait (9:16). Each clip is 8 seconds.",
    who
      ? "Same face every time: use Frames to Video (or Ingredients to Video) with the image you made from the Image Prompt."
      : "Best quality: use Frames to Video with the image you made from the Image Prompt as the first frame.",
  ];
  if (seed.audio.mode === "voiceover") {
    notes.push("Hindi voice: if the pronunciation isn't clear, generate again, or record the line yourself and add it in YouTube.");
  }
  if (seed.audio.mode === "dialogue") {
    notes.push("Check that the lip movement matches the Hindi words; generate again if it drifts.");
  }
  notes.push(
    "If Flow says “might violate our policies”: wait 5–10 minutes and try the same prompt once more (busy servers fail too). If it fails again, report the video number.",
    "Silent result? Add a track from YouTube Studio's Audio Library, never a commercial song.",
  );
  return { prompt: lines.join("\n"), notes };
}

const EMOJI = /\p{Extended_Pictographic}|\uFE0F|\u200D/gu;

/** Text rendered inside the thumbnail: the seed's Latin-script overlay, or its emoji-free thumbnail text. */
export function thumbnailHeadline(seed: VideoSeed): string {
  return (seed.thumbnail.overlay ?? seed.thumbnail.text).replace(EMOJI, "").replace(/\s+/g, " ").trim();
}

function thumbnail(tpl: ChannelTemplate, seed: VideoSeed): VideoPackage["thumbnail"] {
  const p = (t: string) => depersonalize(tpl, t);
  const who = castPromptText(tpl, seed);
  const headline = thumbnailHeadline(seed);
  const textPlacement = "Upper third, centered, inside the Shorts safe area (away from the bottom buttons)";
  const prompt = [
    `Scroll-stopping YouTube Shorts cover image, vertical 9:16 (1080×1920). ${p(seed.thumbnail.concept)}.`,
    who ? `CHARACTER (same as in the video): ${who}` : `SUBJECT: ${p(seed.subject)}.`,
    seed.look ? `STYLING: Outfit: ${p(seed.look.outfit)}. Accessories: ${p(seed.look.accessories)}. Expression: ${p(seed.look.expression)}.` : "",
    `BACKGROUND: ${p(seed.environment)}, simplified and softly blurred for depth.`,
    `HEADLINE TEXT: the words "${headline}" written in ${tpl.thumbnailFont}, large and centered in the upper third, spelled exactly as written, crisp and easy to read on a phone. This headline is the only text in the image.`,
    "COMPOSITION: subject big and close in the middle and lower two-thirds, clean uncluttered space behind the headline, strong contrast between subject, background and text.",
    `LIGHTING & COLORS: ${seed.lighting}, with a rim light that separates the subject from the background; palette: ${tpl.thumbnailPalette}.`,
    `LOOK: ${capitalize(tpl.trendLook)}. Sharp, high detail, polished professional finish.`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    prompt,
    negativePrompt: [
      "blurry",
      "low resolution",
      "misspelled words",
      "extra words",
      "distorted letters",
      "watermark",
      "logo",
      "extra fingers",
      "distorted face",
      "cluttered background",
      ...tpl.imageNegatives,
    ].join(", "),
    concept: seed.thumbnail.concept,
    textSuggestion: headline,
    fontStyle: tpl.thumbnailFont,
    textPlacement,
    firstFrameHook: `The first 0.5 s already shows the hook, starting on a strong frame: ${seed.hook}`,
  };
}

function uniqueCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/** YouTube counts tag characters plus separators; keep a safety margin under the 500 limit. */
export function tagsCharCount(tags: string[]): number {
  return tags.reduce((sum, tag) => sum + tag.length + (tag.includes(" ") ? 2 : 0), 0) + Math.max(0, tags.length - 1);
}

function capTags(tags: string[], limit = 450): string[] {
  const out: string[] = [];
  for (const tag of tags) {
    if (tagsCharCount([...out, tag]) > limit) continue;
    out.push(tag);
  }
  return out;
}

function seo(tpl: ChannelTemplate, seed: VideoSeed, sequence: number): VideoPackage["seo"] {
  const { channel } = tpl;
  const normalizeHashtag = (tag: string) => (tag.startsWith("#") ? tag : `#${tag}`).replace(/\s+/g, "");
  const hashtags = uniqueCaseInsensitive([
    ...seed.seo.hashtags.slice(0, 2).map(normalizeHashtag),
    ...tpl.baseHashtags.map(normalizeHashtag),
    "#Shorts",
  ]).slice(0, 5);

  const descriptionParts = [seed.seo.summaryHi, seed.seo.summaryEn];
  if (seed.fact) descriptionParts.push(`📚 Fact: ${seed.fact.statement}\nSource: ${seed.fact.sourceName}`);
  if (seed.isFictional) {
    descriptionParts.push(
      "⚠️ काल्पनिक AI दृश्य — this is a fictional, AI-generated visualization, not real footage.",
    );
  }
  descriptionParts.push(tpl.disclosureLine);
  descriptionParts.push(tpl.ctaLines[sequence % tpl.ctaLines.length] ?? tpl.ctaLines[0] ?? "");
  descriptionParts.push(hashtags.join(" "));

  const comments = !channel.madeForKids;
  const question = comments ? (seed.seo.engagementQuestion ?? null) : null;
  const pinnedTemplate = tpl.pinnedTemplates[sequence % tpl.pinnedTemplates.length];
  const pinnedComment = comments && question && pinnedTemplate ? pinnedTemplate(question) : null;

  return {
    title: seed.seo.title,
    altTitles: seed.seo.altTitles,
    description: descriptionParts.filter(Boolean).join("\n\n"),
    primaryKeywords: seed.seo.primaryKeywords,
    secondaryKeywords: seed.seo.secondaryKeywords,
    tags: capTags(
      uniqueCaseInsensitive([...seed.seo.primaryKeywords, ...seed.seo.secondaryKeywords, ...tpl.baseTags]),
    ),
    hashtags,
    pinnedComment,
    engagementQuestion: question,
    playlist: seed.seo.playlist,
  };
}

function compliance(tpl: ChannelTemplate, seed: VideoSeed): VideoPackage["compliance"] {
  const { channel } = tpl;
  return {
    syntheticDisclosure: channel.syntheticDisclosure,
    disclosureNote:
      channel.syntheticDisclosure === "required"
        ? "YouTube Studio → Details → \"Altered or synthetic content\": select Yes, because these are realistic AI-generated visuals. Keep the AI disclosure line in the description."
        : "This is clearly animated cartoon content, so the \"Altered or synthetic content\" toggle isn't required. The description still states that the video is AI-made.",
    madeForKidsNote: channel.madeForKids
      ? "YouTube Studio → Audience: select \"Yes, it's made for kids\". YouTube disables comments, pinned comments and notification bells on made-for-kids videos."
      : "YouTube Studio → Audience: select \"No, it's not made for kids\".",
    audioLicenseNote: AUDIO_LICENSE_NOTE,
    fact: seed.fact ?? null,
  };
}

export type UnscoredPackage = Omit<VideoPackage, "quality">;

/** Seed index 0..179 → day 1..90, video 1..2. */
export function positionFor(index: number) {
  return {
    dayNumber: Math.floor(index / VIDEOS_PER_DAY) + 1,
    videoNumber: (index % VIDEOS_PER_DAY) + 1,
    sequence: index + 1,
  };
}

export function composePackage(tpl: ChannelTemplate, seed: VideoSeed, index: number): UnscoredPackage {
  const { channel } = tpl;
  const { dayNumber, videoNumber, sequence } = positionFor(index);
  return {
    id: videoIdFor(channel.id, dayNumber, videoNumber),
    channelId: channel.id,
    channelName: channel.name,
    category: seed.category,
    dayNumber,
    videoNumber,
    sequence,
    concept: seed.concept,
    description: seed.seo.summaryEn,
    targetAudience: channel.targetAudience,
    targetCountry: channel.targetCountry,
    language: channel.language,
    durationSeconds: VIDEO_DURATION_SECONDS,
    aspectRatio: "9:16",
    format: "Vertical",
    platform: "YouTube Shorts",
    generationPlatform: GENERATION_PLATFORM,
    plannedSlot: channel.defaultSlots[videoNumber - 1] ?? channel.defaultSlots[0],
    contentStatus: "ready",
    templateVersion: TEMPLATE_VERSION,
    isFictional: Boolean(seed.isFictional),
    madeForKids: channel.madeForKids,
    storyboard: storyboard(tpl, seed),
    imagePrompt: imagePrompt(tpl, seed),
    flowPrompt: flowPrompt(tpl, seed),
    audio: {
      ...seed.audio,
      voice: seed.audio.mode === "music-only" ? null : (seed.audio.voice ?? tpl.defaultVoice),
      tone: seed.audio.mode === "music-only" ? null : (seed.audio.tone ?? tpl.defaultTone),
    },
    thumbnail: thumbnail(tpl, seed),
    seo: seo(tpl, seed, sequence),
    compliance: compliance(tpl, seed),
  };
}

export function withQuality(pkg: UnscoredPackage, quality: QualityReport): VideoPackage {
  return { ...pkg, quality };
}
