import { describe, expect, it } from "vitest";
import index from "@data/content/index.json";
import aiAnimals from "@data/content/ai-animals.json";
import aiFacts from "@data/content/ai-facts.json";
import aiFashion from "@data/content/ai-fashion.json";
import futureAi from "@data/content/future-ai.json";
import galaxySpace from "@data/content/galaxy-space.json";
import kidsLearning from "@data/content/kids-learning.json";
import { backupSchema, buildBackup } from "@/lib/backup/schema";
import { allDetailsText } from "@/lib/content/copy-format";
import { videoPackageSchema, type VideoPackage } from "@/lib/content/schema";
import { emptyVideoRow } from "@/lib/progress/transitions";

const ALL = [futureAi, aiFashion, galaxySpace, kidsLearning, aiFacts, aiAnimals].flat() as VideoPackage[];

describe("static content library", () => {
  it("every package validates and passed the quality gate", () => {
    for (const pkg of ALL) {
      const parsed = videoPackageSchema.safeParse(pkg);
      expect(parsed.success, `${pkg.id}: ${parsed.error?.message}`).toBe(true);
      expect(pkg.quality.approved, pkg.id).toBe(true);
    }
  });

  it("ids and titles are unique and the index matches the packages", () => {
    expect(new Set(ALL.map((p) => p.id)).size).toBe(ALL.length);
    expect(new Set(ALL.map((p) => p.seo.title.toLowerCase())).size).toBe(ALL.length);
    expect(index).toHaveLength(ALL.length);
  });

  it("each channel is a contiguous day 1… sequence with 2 videos per day", () => {
    for (const list of [futureAi, aiFashion, galaxySpace, kidsLearning, aiFacts, aiAnimals] as VideoPackage[][]) {
      list.forEach((p, i) => {
        expect(p.sequence).toBe(i + 1);
        expect(p.dayNumber).toBe(Math.floor(i / 2) + 1);
        expect(p.videoNumber).toBe((i % 2) + 1);
      });
    }
  });

  it("kids packages are made for kids and have no comment prompts", () => {
    for (const pkg of kidsLearning as VideoPackage[]) {
      expect(pkg.madeForKids).toBe(true);
      expect(pkg.seo.pinnedComment).toBeNull();
    }
  });

  it("every Flow prompt carries audio instructions with copyright-safe music", () => {
    for (const pkg of ALL) {
      expect(pkg.flowPrompt.prompt).toMatch(/AUDIO — generate together with the video/);
      expect(pkg.flowPrompt.prompt).toMatch(/ORIGINAL instrumental/);
      expect(pkg.flowPrompt.prompt).toMatch(/exactly 8 seconds/);
    }
  });
});

describe("copy all video details", () => {
  it("contains every section and no internal metadata", () => {
    const pkg = ALL[0]!;
    const text = allDetailsText(pkg);
    for (const heading of ["STORYBOARD", "IMAGE PROMPT", "GOOGLE FLOW VIDEO + AUDIO PROMPT", "THUMBNAIL PROMPT", "YOUTUBE TITLE", "DESCRIPTION", "TAGS", "HASHTAGS", "PINNED COMMENT"]) {
      expect(text).toContain(heading);
    }
    expect(text).not.toContain(pkg.id);
    expect(text).not.toContain("quality");
  });

  it("uses custom prompt overrides when present", () => {
    const text = allDetailsText(ALL[0]!, { flow: "MY CUSTOM FLOW PROMPT" });
    expect(text).toContain("MY CUSTOM FLOW PROMPT");
  });
});

describe("backup", () => {
  it("round-trips through the schema and contains no secrets", () => {
    const now = "2026-11-04T10:00:00.000Z";
    const video = { ...emptyVideoRow("future-ai-d001-v1", now), upload_status: "skipped" as const, skip_scope: "video" as const };
    const backup = buildBackup({
      workspaceName: "W",
      settings: {
        workspace_id: "ws",
        preferences: { categoryDecisions: { x: "approved" } },
        schedule_start_date: "2026-11-04",
        timezone: "Asia/Kolkata",
        content_version: "v1",
        progress_epoch: 1,
        field_clock: {},
        version: 1,
        updated_at: now,
      },
      videos: [video],
      daySkips: [],
      prompts: [],
      activity: [],
    });
    expect(backupSchema.safeParse(JSON.parse(JSON.stringify(backup))).success).toBe(true);
    const raw = JSON.stringify(backup);
    expect(raw).not.toMatch(/access_token|refresh_token|code_hash|workspace_id/);
  });

  it("rejects inconsistent records", () => {
    const bad = {
      app: "ai-shorts-studio",
      backupVersion: 1,
      exportedAt: "2026-11-04T10:00:00.000Z",
      contentVersion: "v1",
      workspaceName: "W",
      settings: { preferences: {}, scheduleStartDate: "2026-11-04", timezone: "Asia/Kolkata" },
      videoProgress: [{ ...emptyVideoRow("future-ai-d001-v1", "2026-11-04T10:00:00.000Z"), video_id: "future-ai-d002-v1" }],
      daySkips: [],
      promptProgress: [],
      activity: [],
    };
    expect(backupSchema.safeParse(bad).success).toBe(false);
    expect(backupSchema.safeParse({ ...bad, backupVersion: 2 }).success).toBe(false);
  });
});
