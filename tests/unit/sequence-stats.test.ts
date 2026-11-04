import { describe, expect, it } from "vitest";
import type { VideoIndexEntry } from "@/lib/content/schema";
import { addDays, planDayFor, plannedDate } from "@/lib/content/schedule";
import { channelSequence, dayStatus } from "@/lib/progress/sequence";
import { computeStats } from "@/lib/progress/stats";
import { emptyVideoRow } from "@/lib/progress/transitions";
import type { VideoProgressRow } from "@/lib/progress/types";

const entries: VideoIndexEntry[] = Array.from({ length: 6 }, (_, i) => ({
  id: `ai-facts-d00${Math.floor(i / 2) + 1}-v${(i % 2) + 1}`,
  channelId: "ai-facts",
  dayNumber: Math.floor(i / 2) + 1,
  videoNumber: (i % 2) + 1,
  sequence: i + 1,
  title: `T${i}`,
  concept: "c",
  category: "x",
  plannedSlot: "12:00",
  qualityScore: 100,
}));
const row = (id: string, patch: Partial<VideoProgressRow>): VideoProgressRow => ({ ...emptyVideoRow(id, "2026-11-04T00:00:00Z"), ...patch });

describe("channelSequence", () => {
  it("unlocks only the first unresolved video", () => {
    const seq = channelSequence(entries, {});
    expect(seq.nextId).toBe("ai-facts-d001-v1");
    expect(Object.values(seq.states).filter((s) => s === "current")).toHaveLength(1);
    expect(seq.states["ai-facts-d001-v2"]).toBe("locked");
  });

  it("uploaded and skipped videos advance the sequence; failed ones don't", () => {
    const videos = {
      "ai-facts-d001-v1": row("ai-facts-d001-v1", { upload_status: "uploaded" }),
      "ai-facts-d001-v2": row("ai-facts-d001-v2", { upload_status: "skipped", skip_scope: "video" }),
      "ai-facts-d002-v1": row("ai-facts-d002-v1", { upload_status: "upload_failed" }),
    };
    const seq = channelSequence(entries, videos);
    expect(seq.nextId).toBe("ai-facts-d002-v1");
    expect(seq.states["ai-facts-d002-v2"]).toBe("locked");
  });
});

describe("computeStats", () => {
  it("never counts skipped videos as completed or uploaded", () => {
    const videos = {
      "ai-facts-d001-v1": row("ai-facts-d001-v1", { upload_status: "uploaded", production_status: "completed", publishing_status: "published" }),
      "ai-facts-d001-v2": row("ai-facts-d001-v2", { upload_status: "skipped", skip_scope: "day" }),
      "ai-facts-d002-v1": row("ai-facts-d002-v1", { upload_status: "upload_failed" }),
    };
    expect(computeStats(entries, videos)).toEqual({
      total: 6,
      completed: 1,
      uploaded: 1,
      published: 1,
      skipped: 1,
      failed: 1,
      pending: 3,
      completionPercent: 16.7,
    });
  });
});

describe("dayStatus", () => {
  it("summarizes a day", () => {
    expect(dayStatus([undefined, undefined], undefined)).toBe("pending");
    expect(dayStatus([row("ai-facts-d001-v1", { upload_status: "uploaded" }), row("ai-facts-d001-v2", { upload_status: "uploaded" })], undefined)).toBe("uploaded");
    expect(
      dayStatus([row("ai-facts-d001-v1", { upload_status: "uploaded" }), row("ai-facts-d001-v2", { upload_status: "skipped", skip_scope: "day" })], {
        channel_id: "ai-facts",
        day_number: 1,
        reason: null,
        skipped_at: "x",
        restored_at: null,
        version: 1,
        updated_at: "x",
      }),
    ).toBe("skipped");
  });
});

describe("schedule", () => {
  it("maps plan days to dates", () => {
    expect(plannedDate("2026-11-04", 1)).toBe("2026-11-04");
    expect(plannedDate("2026-11-04", 90)).toBe("2027-02-01");
    expect(planDayFor("2026-11-04", "2026-11-06")).toBe(3);
    expect(addDays("", 3)).toBe("");
  });
});
