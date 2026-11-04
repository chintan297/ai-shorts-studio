import {
  VIDEO_DURATION_SECONDS,
  VIDEOS_PER_DAY,
  videoIdFor,
  type Channel,
  type QualityReport,
  type VideoPackage,
  type VideoSeed,
} from "./schema";

export const TEMPLATE_VERSION = "v1";
export const GENERATION_PLATFORM = "Google Flow (Veo 3.1 — video + native audio)";

export interface CastMember {
  name: string;
  description: string;
}

/** Everything a channel needs to turn seeds into complete, copy-ready packages. */
export interface ChannelTemplate {
  channel: Channel;
  /** Recurring characters that seeds may reference by key. */
  cast?: Record<string, CastMember>;
  /** Permanent identity text injected into every image + Flow prompt (fashion model). */
  permanentIdentity?: string;
  imageStyle: string;
  videoStyle: string;
  consistencyRules: string;
  motionRules: string;
  imageNegatives: string[];
  videoNegatives: string[];
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

const SHARED_VIDEO_NEGATIVES = [
  "no on-screen text, subtitles, captions or watermarks",
  "no logos or brand names",
  "no scene cuts, transitions or sudden scene changes",
  "no flicker or frame-to-frame texture boiling",
  "no camera shake or jitter",
  "no morphing or melting shapes",
  "no extra fingers, extra hands or extra limbs",
  "no distorted anatomy",
  "no face or identity changes between frames",
  "no floating or disconnected objects",
  "no broken physics",
  "no unnatural or frozen expressions",
  "no copyrighted or recognizable music, no song lyrics",
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

function videoNegatives(tpl: ChannelTemplate): string {
  const shared = tpl.learningSymbolsAllowed
    ? [
        "no subtitles, captions or watermarks; no text except the single learning letter, number or shape named in this prompt, drawn correctly",
        ...SHARED_VIDEO_NEGATIVES.slice(1),
      ]
    : SHARED_VIDEO_NEGATIVES;
  return [...shared, ...tpl.videoNegatives].join("; ");
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n.toFixed(1)}` : `${n}`);

function castText(tpl: ChannelTemplate, seed: VideoSeed): string | null {
  if (!seed.characters?.length || !tpl.cast) return null;
  return seed.characters
    .map((key) => {
      const member = tpl.cast?.[key];
      if (!member) throw new Error(`Unknown character "${key}" for ${tpl.channel.id}`);
      return `${member.name}: ${member.description}`;
    })
    .join(" ");
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
  const lines = [
    `${tpl.imageStyle} Vertical 9:16 portrait image, 1080×1920.`,
    `This image is the FIRST FRAME of an 8-second video: ${seed.hook}`,
    `MAIN SUBJECT: ${seed.subject}.`,
  ];
  const identity = [tpl.permanentIdentity, castText(tpl, seed)].filter(Boolean).join(" ");
  if (identity) lines.push(`CHARACTER (keep identical in every image): ${identity}`);
  if (seed.look) {
    lines.push(
      `OUTFIT: ${seed.look.outfit}.`,
      `ACCESSORIES: ${seed.look.accessories}.`,
      `HAIR: ${seed.look.hairStyling}.`,
      `POSE: ${seed.look.pose}.`,
      `EXPRESSION: ${seed.look.expression}.`,
    );
  }
  lines.push(
    `ENVIRONMENT & BACKGROUND: ${seed.environment}.`,
    `CAMERA: ${seed.camera.angle}, ${seed.camera.lens} lens.`,
    `LIGHTING: ${seed.lighting}.`,
    `COLOR GRADE: ${seed.colorGrade}.`,
    "COMPOSITION: main subject in the central vertical band, clean negative space at the top and bottom 12% for YouTube Shorts UI, clear subject separation from the background.",
    "QUALITY: ultra-detailed, sharp focus on the subject, natural textures, high dynamic range, professional color accuracy.",
    `CONSISTENCY: ${tpl.consistencyRules}`,
  );
  return {
    prompt: lines.join("\n"),
    negativePrompt: imageNegatives(tpl),
  };
}

function audioBlock(tpl: ChannelTemplate, seed: VideoSeed): string {
  const { audio } = seed;
  const voice = audio.voice ?? tpl.defaultVoice;
  const tone = audio.tone ?? tpl.defaultTone;
  const out: string[] = ["AUDIO — generate together with the video, fully synchronized:"];

  if (audio.mode === "music-only" || audio.lines.length === 0) {
    out.push("• Voice: none — no voice-over and no dialogue in this clip.");
  } else {
    out.push(
      `• Voice: ${voice}. Language: Hindi (natural Hinglish, Indian accent). Tone: ${tone}. Pace: unhurried, about 2 words per second, crisp and clear pronunciation. The voice is the loudest audio layer.`,
    );
    if (audio.mode === "voiceover") {
      out.push("• Voice-over (off-screen narrator — nobody on screen speaks, no lip movement):");
    } else {
      out.push("• Dialogue (spoken on screen — lip movement must match the words exactly):");
    }
    for (const line of audio.lines) {
      const who = line.speaker ? `${line.speaker}: ` : "";
      out.push(`   – ${fmt(line.start)}–${fmt(line.end)} s — ${who}"${line.text}"`);
    }
  }

  const musicMix =
    audio.mode === "music-only" || audio.lines.length === 0
      ? "Music is the lead layer at a moderate, pleasant volume."
      : "Mix the music about 25% quieter than the voice (roughly −18 dB under it) so every word stays clear.";
  out.push(
    `• Background music: ORIGINAL instrumental score — ${audio.music}. No vocals, no lyrics, no humming; it must not imitate or resemble any existing song, artist or commercial melody. ${musicMix} Gentle swell on the payoff around 6 s, then a natural fade-out from 7.0 s to 8.0 s.`,
    "• Sound effects (original, synchronized with the visuals):",
    ...audio.sfx.map((cue) => `   – ${fmt(cue.at)} s — ${cue.sound}`),
    `• Ambience: ${audio.ambience}; subtle and continuous under everything.`,
    "• Ending: all audio layers resolve and fade to silence by 8.0 s — no abrupt cut.",
  );
  return out.join("\n");
}

/**
 * Compact version of the Flow prompt (~700–1,000 chars): fewer descriptors means fewer things for a content
 * filter to object to. Character consistency then comes from using the generated image as the start frame.
 */
function liteFlowPrompt(tpl: ChannelTemplate, seed: VideoSeed): string {
  const { audio } = seed;
  const lines = [
    `Vertical 9:16 video, 8 seconds, one continuous shot. ${seed.concept}`,
    `Look: ${tpl.videoStyle.split(":")[0]}.`,
    seed.look ? `Outfit: ${seed.look.outfit}. Accessories: ${seed.look.accessories}. Hair: ${seed.look.hairStyling}.` : `Subject: ${seed.subject}.`,
    `Setting: ${seed.environment}.`,
    `Start: ${seed.hook}`,
    `Middle: ${seed.action}`,
    `End: ${seed.payoff}`,
    `Camera: ${seed.camera.angle}; ${seed.camera.movement}; ${seed.camera.lens}. Lighting: ${seed.lighting}.`,
  ];
  const spoken = audio.mode === "music-only" ? [] : audio.lines;
  const sound: string[] = [];
  if (spoken.length) {
    const who = audio.mode === "dialogue" ? "On-screen speech in Hindi" : "Off-screen narrator speaking Hindi";
    sound.push(`${who}: ${spoken.map((l) => `“${l.text}”`).join(" then ")}`);
  }
  sound.push(`original instrumental music (${audio.music}, no vocals)`);
  sound.push(audio.sfx.map((c) => c.sound).join(", "));
  sound.push(audio.ambience);
  lines.push(`Audio: ${sound.join("; ")}.`);
  lines.push("Smooth stabilized motion, natural physics, consistent look throughout, no text or logos on screen.");
  return lines.join("\n");
}

function flowPrompt(tpl: ChannelTemplate, seed: VideoSeed): VideoPackage["flowPrompt"] {
  const appearance = characterAppearance(tpl, seed);
  const lines = [
    "GOOGLE FLOW (Veo 3.1) — VIDEO + AUDIO PROMPT",
    "Duration: exactly 8 seconds · Aspect ratio: 9:16 vertical (1080×1920) · One continuous shot, no cuts.",
    "Start frame: use the image generated from this video's Image Prompt (Frames to Video).",
    "",
    `CONCEPT: ${seed.concept}`,
    `STYLE: ${tpl.videoStyle}`,
    `MAIN SUBJECT: ${seed.subject}.`,
    `APPEARANCE: ${appearance}`,
  ];
  if (seed.look) {
    lines.push(
      `POSE & BODY MOVEMENT: starts in this pose — ${seed.look.pose}. ${tpl.motionRules}`,
      `FACIAL EXPRESSION: ${seed.look.expression}.`,
    );
  }
  lines.push(
    `ENVIRONMENT & BACKGROUND: ${seed.environment}.`,
    "",
    "TIMELINE (8.0 s total):",
    `• 0.0–2.0 s — HOOK: ${seed.hook}`,
    `• 2.0–6.0 s — MAIN ACTION: ${seed.action}`,
    `• 6.0–8.0 s — PAYOFF & ENDING FRAME: ${seed.payoff} Hold the final composition steady for the last half second.`,
    "",
    `CAMERA: ${seed.camera.angle}. Movement: ${seed.camera.movement}. Lens: ${seed.camera.lens}. Smooth, stabilized, cinematic motion; no shake, no sudden zooms.`,
    `LIGHTING & COLOR: ${seed.lighting}. Color grade: ${seed.colorGrade}.`,
  );
  if (seed.vfx) lines.push(`VISUAL EFFECTS: ${seed.vfx}.`);
  lines.push(
    `MOTION & PHYSICS: realistic physics and natural motion speed (not sped-up, not slow-motion unless stated). ${seed.look ? "" : tpl.motionRules}`.trim(),
    `CONSISTENCY: ${tpl.consistencyRules}`,
    "",
    audioBlock(tpl, seed),
    "",
    `AVOID: ${videoNegatives(tpl)}.`,
  );

  const notes = [
    "In Flow, pick a Veo 3.x model that generates audio and set the aspect ratio to 9:16 before generating.",
    "Flow generates about 8 seconds per clip, and this package is timed for exactly 8 seconds. Use Extend only if you deliberately want a 10-second version.",
    "Best consistency: generate the image first, then use Frames to Video with that image as the start frame.",
  ];
  if (seed.audio.mode === "voiceover") {
    notes.push(
      "Hindi speech quality is not guaranteed by Veo. The voice is kept off-screen so there's no lip-sync to break. If pronunciation is poor, regenerate or record the line yourself.",
    );
  }
  if (seed.audio.mode === "dialogue") {
    notes.push(
      "On-screen dialogue lip-sync can drift, especially in Hindi. Check the mouth movement closely and regenerate if it doesn't match.",
    );
  }
  notes.push(
    "If your Flow mode outputs silent video, don't add commercial music. Use an original track from YouTube Studio's Audio Library.",
  );
  return { prompt: lines.join("\n"), lite: liteFlowPrompt(tpl, seed), notes };
}

function thumbnail(tpl: ChannelTemplate, seed: VideoSeed): VideoPackage["thumbnail"] {
  const identity = [tpl.permanentIdentity, castText(tpl, seed)].filter(Boolean).join(" ");
  const textPlacement = "Upper third, centered, inside the Shorts safe area (away from the bottom UI)";
  const prompt = [
    "Eye-catching YouTube Shorts cover frame, vertical 9:16 (1080×1920), designed to stop the scroll.",
    `THUMBNAIL CONCEPT: ${seed.thumbnail.concept}`,
    `SUBJECT: ${seed.subject}${seed.look ? `, expression: ${seed.look.expression}` : ""}.`,
    identity ? `CHARACTER (identical to the video): ${identity}` : "",
    `BACKGROUND: ${seed.environment}, simplified and softly blurred for depth.`,
    "COMPOSITION: subject large and close, filling the middle and lower two-thirds; leave clean, uncluttered space in the upper third for the title text.",
    `LIGHTING: ${seed.lighting}, with extra rim light to separate the subject from the background.`,
    `COLORS: ${tpl.thumbnailPalette}; strong visual contrast between subject, background and text area.`,
    `TEXT: do NOT render text in the image. Add "${seed.thumbnail.text}" afterwards in an editor (Canva / YouTube editor) — ${tpl.thumbnailFont}; placement: ${textPlacement}.`,
    "QUALITY: crisp, high detail, professional finish.",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    prompt,
    negativePrompt: imageNegatives(tpl, ["clutter", "busy background"]),
    concept: seed.thumbnail.concept,
    textSuggestion: seed.thumbnail.text,
    fontStyle: tpl.thumbnailFont,
    textPlacement,
    firstFrameHook: `The first 0.5 s must already show the hook, with no fade-in from black: ${seed.hook}`,
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
