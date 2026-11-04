import { describe, expect, it } from "vitest";
import { OpRejected, applyOp, deriveProductionStatus, extractYoutubeId } from "@/lib/progress/transitions";
import type { Op, OpInput, ProgressState } from "@/lib/progress/types";

const NOW = "2026-11-04T10:00:00.000Z";
const ctx = { now: NOW, today: "2026-11-04" };
const empty = (): ProgressState => ({ videos: {}, daySkips: {}, prompts: {}, settings: null, workspaceName: "W" });

let seq = 0;
function op(input: OpInput, client_ts = NOW): Op {
  return { ...input, op_id: `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`, client_ts, device_id: "device-test", epoch: 1 };
}
const v = (day: number, n: number) => ({
  channel_id: "future-ai",
  video_id: `future-ai-d${String(day).padStart(3, "0")}-v${n}`,
  day_number: day,
  video_number: n,
});
const run = (state: ProgressState, ...ops: Op[]) => ops.reduce((s, o) => applyOp(s, o, ctx).state, state);

describe("production status", () => {
  it("derives the highest reached stage from the checklist", () => {
    expect(deriveProductionStatus({}, "pending")).toBe("pending");
    expect(deriveProductionStatus({ youtubeDetailsReady: true }, "pending")).toBe("in_progress");
    expect(deriveProductionStatus({ imageGenerated: true }, "pending")).toBe("image_generated");
    expect(deriveProductionStatus({ imageGenerated: true, videoGenerated: true }, "pending")).toBe("video_generated");
    expect(deriveProductionStatus({ thumbnailReady: true }, "pending")).toBe("thumbnail_ready");
    expect(deriveProductionStatus({ readyForUpload: true }, "pending")).toBe("ready_for_upload");
    expect(deriveProductionStatus({ readyForUpload: true }, "failed")).toBe("failed");
  });

  it("checklist ticks update the status and record the right activity", () => {
    const out = applyOp(empty(), op({ type: "checklist", ...v(1, 1), payload: { item: "imageGenerated", value: true } }), ctx);
    expect(out.state.videos["future-ai-d001-v1"]?.production_status).toBe("image_generated");
    expect(out.activity?.action_type).toBe("image_generated");
  });
});

describe("upload sequence", () => {
  it("locks a video until every earlier video is uploaded or skipped", () => {
    expect(() => applyOp(empty(), op({ type: "mark_uploaded", ...v(1, 2), payload: { youtube_url: "https://youtu.be/abcdefghijk" } }), ctx)).toThrow(OpRejected);
    const s = run(empty(), op({ type: "mark_uploaded", ...v(1, 1), payload: { youtube_url: "https://youtu.be/abcdefghijk", youtube_video_id: "abcdefghijk" } }));
    expect(s.videos["future-ai-d001-v1"]?.upload_status).toBe("uploaded");
    expect(s.videos["future-ai-d001-v1"]?.production_status).toBe("completed");
    // now video 2 is allowed
    const s2 = run(s, op({ type: "mark_uploaded", ...v(1, 2), payload: {} }));
    expect(s2.videos["future-ai-d001-v2"]?.upload_status).toBe("uploaded");
  });

  it("a skipped video unlocks the next one; a failed upload does not", () => {
    const failed = run(empty(), op({ type: "mark_upload_failed", ...v(1, 1), payload: {} }));
    expect(() => applyOp(failed, op({ type: "mark_uploaded", ...v(1, 2), payload: {} }), ctx)).toThrow(/sequence_locked/);
    const skipped = run(empty(), op({ type: "skip_video", ...v(1, 1), payload: { reason: "holiday" } }));
    expect(applyOp(skipped, op({ type: "mark_uploaded", ...v(1, 2), payload: {} }), ctx).state.videos["future-ai-d001-v2"]?.upload_status).toBe("uploaded");
  });

  it("rejects recording the same YouTube video twice", () => {
    const s = run(empty(), op({ type: "mark_uploaded", ...v(1, 1), payload: { youtube_video_id: "abcdefghijk" } }));
    expect(() => applyOp(s, op({ type: "mark_uploaded", ...v(1, 2), payload: { youtube_video_id: "abcdefghijk" } }), ctx)).toThrow(/duplicate_youtube_video/);
  });

  it("revert is only allowed while no later video is uploaded", () => {
    const s = run(
      empty(),
      op({ type: "mark_uploaded", ...v(1, 1), payload: {} }),
      op({ type: "mark_uploaded", ...v(1, 2), payload: {} }),
    );
    expect(() => applyOp(s, op({ type: "revert_upload", ...v(1, 1), payload: {} }), ctx)).toThrow(/later_videos_uploaded/);
    const reverted = run(s, op({ type: "revert_upload", ...v(1, 2), payload: {} }));
    expect(reverted.videos["future-ai-d001-v2"]?.upload_status).toBe("not_uploaded");
  });
});

describe("skip & restore", () => {
  it("restores the previous status instead of resetting progress", () => {
    const s = run(
      empty(),
      op({ type: "checklist", ...v(1, 1), payload: { item: "videoGenerated", value: true } }),
      op({ type: "skip_video", ...v(1, 1), payload: {} }),
    );
    expect(s.videos["future-ai-d001-v1"]?.upload_status).toBe("skipped");
    const restored = run(s, op({ type: "restore_video", ...v(1, 1), payload: {} }));
    expect(restored.videos["future-ai-d001-v1"]).toMatchObject({ upload_status: "not_uploaded", production_status: "video_generated", skip_scope: null });
  });

  it("cannot skip an uploaded video", () => {
    const s = run(empty(), op({ type: "mark_uploaded", ...v(1, 1), payload: {} }));
    expect(() => applyOp(s, op({ type: "skip_video", ...v(1, 1), payload: {} }), ctx)).toThrow(/already_uploaded/);
  });

  it("skip day preserves uploaded videos and restore day only restores day-scoped skips", () => {
    const videos = [
      { video_id: "future-ai-d001-v1", video_number: 1 },
      { video_id: "future-ai-d001-v2", video_number: 2 },
    ];
    const s = run(
      empty(),
      op({ type: "mark_uploaded", ...v(1, 1), payload: {} }),
      op({ type: "skip_day", channel_id: "future-ai", day_number: 1, videos, payload: { reason: "travel" } }),
    );
    expect(s.videos["future-ai-d001-v1"]?.upload_status).toBe("uploaded");
    expect(s.videos["future-ai-d001-v2"]).toMatchObject({ upload_status: "skipped", skip_scope: "day", skip_reason: "travel" });
    expect(s.daySkips["future-ai:1"]?.restored_at).toBeNull();

    const r = run(s, op({ type: "restore_day", channel_id: "future-ai", day_number: 1, videos, payload: {} }));
    expect(r.videos["future-ai-d001-v1"]?.upload_status).toBe("uploaded");
    expect(r.videos["future-ai-d001-v2"]?.upload_status).toBe("not_uploaded");
    expect(r.daySkips["future-ai:1"]?.restored_at).not.toBeNull();
  });
});

describe("conflict handling (per-field last writer wins)", () => {
  it("an older offline edit doesn't overwrite a newer one", () => {
    const newer = run(empty(), op({ type: "set_notes", ...v(1, 1), payload: { notes: "new" } }, "2026-11-04T09:00:00.000Z"));
    const out = applyOp(newer, op({ type: "set_notes", ...v(1, 1), payload: { notes: "old" } }, "2026-11-04T08:00:00.000Z"), ctx);
    expect(out.status).toBe("stale");
    expect(out.state.videos["future-ai-d001-v1"]?.notes).toBe("new");
  });

  it("edits to different checklist items merge", () => {
    const s = run(
      empty(),
      op({ type: "checklist", ...v(1, 1), payload: { item: "imageGenerated", value: true } }, "2026-11-04T09:00:00.000Z"),
      op({ type: "checklist", ...v(1, 1), payload: { item: "imageReviewed", value: true } }, "2026-11-04T08:00:00.000Z"),
    );
    expect(s.videos["future-ai-d001-v1"]?.checklist).toEqual({ imageGenerated: true, imageReviewed: true });
  });
});

describe("publishing", () => {
  it("requires the video to be uploaded first", () => {
    expect(() => applyOp(empty(), op({ type: "set_publishing_status", ...v(1, 1), payload: { status: "published" } }), ctx)).toThrow(/not_uploaded/);
    const s = run(empty(), op({ type: "mark_uploaded", ...v(1, 1), payload: {} }), op({ type: "set_publishing_status", ...v(1, 1), payload: { status: "published" } }));
    expect(s.videos["future-ai-d001-v1"]).toMatchObject({ publishing_status: "published", published_at: "2026-11-04" });
  });
});

describe("extractYoutubeId", () => {
  it.each([
    ["https://youtube.com/shorts/AbCdEfGhIjK?feature=share", "AbCdEfGhIjK"],
    ["https://www.youtube.com/watch?v=AbCdEfGhIjK&t=1", "AbCdEfGhIjK"],
    ["https://youtu.be/AbCdEfGhIjK", "AbCdEfGhIjK"],
    ["https://studio.youtube.com/video/AbCdEfGhIjK/edit", "AbCdEfGhIjK"],
    ["AbCdEfGhIjK", "AbCdEfGhIjK"],
    ["https://example.com/watch?v=AbCdEfGhIjK", null],
    ["not a url", null],
  ])("%s → %s", (url, id) => expect(extractYoutubeId(url)).toBe(id));
});
