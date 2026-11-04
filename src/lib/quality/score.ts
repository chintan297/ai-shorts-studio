import {
  VIDEO_DURATION_SECONDS,
  qualitySectionKeys,
  type QualityCheck,
  type QualityReport,
  type QualitySectionKey,
  type TimedLine,
  type VideoPackage,
} from "@/lib/content/schema";

export const APPROVAL_THRESHOLD = 70;
export const MAX_SIMILARITY = 0.6;
export const MAX_VOICE_WORDS = 20;
export const MAX_WORDS_PER_SECOND = 3;

export interface QualityContext {
  /** Highest concept similarity (0..1) against other videos in the same channel. */
  maxSimilarity: number;
  duplicateTitle: boolean;
  requiresFact: boolean;
  hasCharacters: boolean;
}

const BANNED_AUDIO = [
  /in the style of/i,
  /song by/i,
  /lyrics/i,
  /remix/i,
  /cover version/i,
  /bollywood (song|track|hit)/i,
  /famous song/i,
  /trending (song|audio)/i,
];

const MISLEADING_TITLE = [/guarantee/i, /100%\s*real/i, /real footage/i, /\bproof\b/i];

/**
 * Words that commonly trip Google Flow / Veo / image-generator safety filters. The filters read the whole prompt,
 * so even "no nudity" can get a prompt refused. Prompts must describe what we want, never list what to avoid here.
 */
export const FILTER_RISK_TERMS =
  /\b(nude|nudity|naked|nipples?|lingerie|underwear|panties|thong|sexual\w*|sexy|seductive|sensual|erotic|cleavage|topless|see-?through|upskirt|sexualized|teen\w*|school-?girls?|childlike|gore|gory|bloody|weapons?|gun|guns|kill\w*|suicide|terror\w*|drugs?|cocaine|alcohol)\b/i;

export function countWords(text: string): number {
  return text
    .replace(/[“”"'.,!?।…:;()\-–—]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function voiceLinesValid(lines: TimedLine[]): boolean {
  const sorted = [...lines].sort((a, b) => a.start - b.start);
  return sorted.every((line, i) => {
    const prev = sorted[i - 1];
    return (
      line.start >= 0 &&
      line.end <= VIDEO_DURATION_SECONDS &&
      line.start < line.end &&
      (!prev || prev.end <= line.start)
    );
  });
}

type Pkg = Omit<VideoPackage, "quality">;

export function scorePackage(pkg: Pkg, ctx: QualityContext): QualityReport {
  const checks: QualityCheck[] = [];
  const add = (
    section: QualitySectionKey,
    id: string,
    label: string,
    passed: boolean,
    mandatory: boolean,
    suggestion?: string,
  ) => checks.push({ id, section, label, passed, mandatory, ...(passed ? {} : { suggestion }) });

  const flow = pkg.flowPrompt.prompt;
  const image = pkg.imagePrompt.prompt;
  const sb = pkg.storyboard;
  const voiceLines = pkg.audio.mode === "music-only" ? [] : pkg.audio.lines;
  const voiceWords = voiceLines.reduce((sum, line) => sum + countWords(line.text), 0);

  // Originality
  add("originality", "O1", "Concept is distinct from the other videos in this channel", ctx.maxSimilarity < MAX_SIMILARITY, true, "Rewrite the concept, subject or environment so it doesn't overlap with another video.");
  add("originality", "O2", "Strongly original concept (low overlap)", ctx.maxSimilarity < 0.4, false, "Make the environment or action more distinctive.");
  add("originality", "O3", "Title is unique across the library", !ctx.duplicateTitle, true, "Give this video its own title.");

  // Hook
  const hookWords = countWords(sb.openingHook);
  add("hook", "H1", "Opening hook is concrete (5–60 words)", hookWords >= 5 && hookWords <= 60, true, "Describe exactly what's on screen in the first 2 seconds.");
  add("hook", "H2", "A sound effect lands in the first 1.5 s", pkg.audio.sfx.some((cue) => cue.at <= 1.5), false, "Add an opening SFX cue at 0–1.5 s.");
  add("hook", "H3", "Hook starts instantly (no fade-in)", !/fade[s]? in|from black/i.test(sb.openingHook), false, "Start on a strong frame, not a fade from black.");

  // Visual
  add("visual", "V1", "Camera angle, movement, lens, lighting and grade are defined", [sb.cameraAngle, sb.cameraMovement, sb.lighting].every((v) => v.length > 3) && /lens/i.test(image), true, "Fill in all the camera and lighting fields.");
  add("visual", "V2", "Image prompt is composed for 9:16", /9:16/.test(image), true);
  add("visual", "V3", "Camera motion is smooth (no handheld shake)", !/shaky|handheld shake|whip pan/i.test(sb.cameraMovement), false, "Use a smooth, stabilized move.");

  // Prompt clarity
  const placeholder = /\{|\}|TODO|lorem|undefined|null\b/i;
  add("promptClarity", "P1", "Flow prompt is complete but not bloated", flow.length >= 1200 && flow.length <= 6500, true, "Flow prompt should be 1,200–6,500 characters.");
  add("promptClarity", "P2", "Image prompt is complete", image.length >= 400 && image.length <= 3500, false, "Image prompt should be 400–3,500 characters.");
  const copied = [flow, image, pkg.imagePrompt.negativePrompt, pkg.thumbnail.prompt, pkg.thumbnail.negativePrompt].join("\n");
  const risky = FILTER_RISK_TERMS.exec(copied)?.[0];
  add("promptClarity", "P4", `Prompts contain no safety-filter trigger words${risky ? ` (found “${risky}”)` : ""}`, !risky, true, "Rewrite that part positively and tastefully; never mention banned content, even to exclude it.");
  add("promptClarity", "P3", "No placeholders or unresolved values", !placeholder.test(flow) && !placeholder.test(image) && !placeholder.test(pkg.thumbnail.prompt), true, "Remove the placeholder text.");

  // Google Flow compatibility
  add("flowCompatibility", "F1", "8-second, 9:16 single generation", pkg.durationSeconds === 8 && /exactly 8 seconds/.test(flow) && /9:16/.test(flow), true);
  add("flowCompatibility", "F2", "Voice timings fit inside 0–8 s without overlap", voiceLinesValid(voiceLines), true, "Fix the voice line timestamps.");
  add("flowCompatibility", "F3", `Voice script fits in 8 s (≤ ${MAX_VOICE_WORDS} words)`, voiceWords <= MAX_VOICE_WORDS && voiceLines.every((l) => countWords(l.text) / (l.end - l.start) <= MAX_WORDS_PER_SECOND), true, "Shorten the voice-over or widen its time window.");
  add("flowCompatibility", "F4", "One continuous shot (no multi-clip story)", /One continuous shot, no cuts/.test(flow), true);
  add("flowCompatibility", "F5", "Voice ends before the final fade (≤ 7.5 s)", voiceLines.every((l) => l.end <= 7.5), false, "End the voice by 7.5 s so the audio can fade naturally.");

  // Character consistency
  add("characterConsistency", "C1", "Character identity is repeated in the image and Flow prompts", !ctx.hasCharacters || (image.includes("CHARACTER") && flow.includes("APPEARANCE")), true, "Inject the character bible into both prompts.");
  add("characterConsistency", "C2", "Consistency rules are present in both prompts", image.includes("CONSISTENCY:") && flow.includes("CONSISTENCY:"), true);

  // Audio
  const audioText = [pkg.audio.music, pkg.audio.ambience, ...pkg.audio.sfx.map((s) => s.sound)].join(" ");
  add("audio", "A1", "Music, sound effects and ambience are all specified", pkg.audio.music.length > 5 && pkg.audio.sfx.length > 0 && pkg.audio.ambience.length > 3, true);
  add("audio", "A2", "Copyright-safe music instruction (original, no vocals/lyrics)", /ORIGINAL instrumental/.test(flow) && /must not imitate/.test(flow), true);
  add("audio", "A3", "No copyrighted-song references", !BANNED_AUDIO.some((re) => re.test(audioText)), true, "Remove references to existing songs or artists.");
  add("audio", "A4", "Natural audio ending (fade by 8 s)", /fade to silence by 8\.0 s/.test(flow), false);
  add("audio", "A5", "Voice type, language, tone and pace are defined", pkg.audio.mode === "music-only" || (/Language: Hindi/.test(flow) && /Pace:/.test(flow)), true);

  // SEO
  const titleLength = [...pkg.seo.title].length;
  const alts = pkg.seo.altTitles.map((t) => t.toLowerCase());
  add("seo", "S1", "Title length 15–70 characters", titleLength >= 15 && titleLength <= 70, true, "Keep Shorts titles short and specific.");
  add("seo", "S2", "Three distinct alternative titles", new Set([pkg.seo.title.toLowerCase(), ...alts]).size === 4, true);
  add("seo", "S3", "Description has substance (≥ 200 characters)", pkg.seo.description.length >= 200, false, "Add a sentence of context to the description.");
  add("seo", "S4", "3–5 relevant hashtags", pkg.seo.hashtags.length >= 3 && pkg.seo.hashtags.length <= 5, true);
  add("seo", "S5", "5+ tags within YouTube's 500-character limit", pkg.seo.tags.length >= 5 && pkg.seo.tags.join(",").length <= 500, true);
  const seoText = `${pkg.seo.title} ${pkg.seo.description}`.toLowerCase();
  add("seo", "S6", "A primary keyword appears in the title or description", pkg.seo.primaryKeywords.some((k) => k.toLowerCase().split(/\s+/).every((word) => seoText.includes(word))), false, "Use a primary keyword naturally in the title or the English summary line.");
  add("seo", "S7", "No misleading clickbait wording", !MISLEADING_TITLE.some((re) => re.test(pkg.seo.title) || pkg.seo.altTitles.some((t) => re.test(t))), true, "Remove the exaggerated claims.");

  // Thumbnail
  add("thumbnail", "T1", "Thumbnail text is short (≤ 5 words)", countWords(pkg.thumbnail.textSuggestion) <= 5, true, "Cut the thumbnail text to 5 words or fewer.");
  add("thumbnail", "T2", "Thumbnail concept and negative prompt are present", pkg.thumbnail.concept.length > 10 && pkg.thumbnail.negativePrompt.length > 10, true);
  add("thumbnail", "T3", "First-frame hook is defined for the Shorts feed", pkg.thumbnail.firstFrameHook.length > 20, false);

  // Policy
  add("policy", "PO1", "AI disclosure is in the description", /\bAI\b/.test(pkg.seo.description), true, "Add the AI-generated disclosure line.");
  add("policy", "PO2", "Audience setting matches the channel", pkg.madeForKids === (pkg.channelId === "kids-learning"), true);
  add("policy", "PO3", "Fact-based video names its source", !ctx.requiresFact || Boolean(pkg.compliance.fact?.sourceName), true, "Add the fact and a named authoritative source.");
  add("policy", "PO4", "Fictional content is labelled as fictional", !pkg.isFictional || /fictional/i.test(pkg.seo.description), true);
  add("policy", "PO5", "Comment settings fit the audience", pkg.madeForKids ? pkg.seo.pinnedComment === null : Boolean(pkg.seo.pinnedComment && pkg.seo.engagementQuestion), true, "Non-kids videos need a pinned comment and an engagement question. Made-for-kids videos must have none.");

  const sections = Object.fromEntries(
    qualitySectionKeys.map((key) => {
      const sectionChecks = checks.filter((c) => c.section === key);
      const total = sectionChecks.reduce((sum, c) => sum + (c.mandatory ? 2 : 1), 0);
      const passed = sectionChecks.reduce((sum, c) => sum + (c.passed ? (c.mandatory ? 2 : 1) : 0), 0);
      return [key, total === 0 ? 10 : Math.round((passed / total) * 100) / 10];
    }),
  ) as Record<QualitySectionKey, number>;

  const score = Math.round(Object.values(sections).reduce((a, b) => a + b, 0));
  const mandatoryFailed = checks.some((c) => c.mandatory && !c.passed);
  return {
    score,
    maxSimilarity: Math.round(ctx.maxSimilarity * 1000) / 1000,
    sections,
    checks,
    approved: !mandatoryFailed && score >= APPROVAL_THRESHOLD,
  };
}

export const SECTION_LABELS: Record<QualitySectionKey, string> = {
  originality: "Originality",
  hook: "Hook quality",
  visual: "Visual quality",
  promptClarity: "Prompt clarity",
  flowCompatibility: "Google Flow compatibility",
  characterConsistency: "Character consistency",
  audio: "Audio quality",
  seo: "SEO relevance",
  thumbnail: "Thumbnail quality",
  policy: "YouTube policy compliance",
};
