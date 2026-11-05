import type { VideoPackage } from "./schema";

export interface PromptOverrides {
  image?: string | null;
  flow?: string | null;
  thumbnail?: string | null;
}

export function imagePromptText(pkg: VideoPackage, override?: string | null): string {
  return override ?? `${pkg.imagePrompt.prompt}\n\nNegative prompt: ${pkg.imagePrompt.negativePrompt}`;
}

export function thumbnailPromptText(pkg: VideoPackage, override?: string | null): string {
  return override ?? `${pkg.thumbnail.prompt}\n\nNegative prompt: ${pkg.thumbnail.negativePrompt}`;
}

export function flowPromptText(pkg: VideoPackage, override?: string | null): string {
  return override ?? pkg.flowPrompt.prompt;
}

export function storyboardText(pkg: VideoPackage): string {
  const s = pkg.storyboard;
  return [
    `Main concept: ${s.mainConcept}`,
    `Opening hook: ${s.openingHook}`,
    `Main subject: ${s.mainSubject}`,
    `Background: ${s.background}`,
    `Main action: ${s.mainAction}`,
    `Camera: ${s.cameraAngle} · ${s.cameraMovement}`,
    `Lighting: ${s.lighting}`,
    `Ending frame: ${s.endingFrame}`,
    "Timeline:",
    ...s.timeline.map((t) => `  ${t.range} — ${t.beat}`),
  ].join("\n");
}

/** "Copy All Video Details": everything needed to produce and upload, no internal metadata. */
export function allDetailsText(pkg: VideoPackage, overrides: PromptOverrides = {}): string {
  const line = "─".repeat(40);
  const section = (title: string, body: string) => `${line}\n${title}\n${line}\n${body}`;
  return [
    `🎬 ${pkg.seo.title}`,
    `Concept: ${pkg.concept}`,
    section("STORYBOARD", storyboardText(pkg)),
    section("IMAGE PROMPT", imagePromptText(pkg, overrides.image)),
    section("GOOGLE FLOW VIDEO + AUDIO PROMPT", flowPromptText(pkg, overrides.flow)),
    section("THUMBNAIL PROMPT", thumbnailPromptText(pkg, overrides.thumbnail)),
    section("YOUTUBE TITLE", pkg.seo.title),
    section("DESCRIPTION", pkg.seo.description),
    section("TAGS", pkg.seo.tags.join(", ")),
    section("HASHTAGS", pkg.seo.hashtags.join(" ")),
    section("PINNED COMMENT", pkg.seo.pinnedComment ?? "N/A: comments are disabled on made-for-kids videos."),
  ].join("\n\n");
}
