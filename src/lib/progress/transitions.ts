/**
 * Client copy of the progress state machine. The authoritative copy is the SQL function
 * `public._apply_op` (supabase/migrations/*_init.sql). Keep the two in sync.
 *
 * Used for optimistic UI updates (and as the "server" in local-only mock mode).
 */
import { parseVideoId, type ChannelId } from "@/lib/content/schema";
import {
  daySkipKey,
  promptKey,
  type ActionType,
  type Checklist,
  type ChecklistKey,
  type DaySkipRow,
  type Op,
  type ProductionStatus,
  type ProgressState,
  type PromptProgressRow,
  type PromptType,
  type PublishingStatus,
  type TestingStatus,
  type VideoProgressRow,
  CHECKLIST_ITEMS,
  PUBLISHING_STATUSES,
  TESTING_STATUSES,
} from "./types";

export class OpRejected extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

export interface ActivityDraft {
  action_type: ActionType;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  details: Record<string, unknown> | null;
}

export interface ApplyOutcome {
  state: ProgressState;
  status: "applied" | "stale";
  activity: ActivityDraft | null;
  videos: VideoProgressRow[];
}

const CHECKLIST_KEYS = new Set<string>(CHECKLIST_ITEMS.map((i) => i.key));

export function deriveProductionStatus(checklist: Checklist, current: ProductionStatus): ProductionStatus {
  if (current === "completed" || current === "failed") return current;
  if (checklist.readyForUpload) return "ready_for_upload";
  if (checklist.thumbnailReady) return "thumbnail_ready";
  if (checklist.videoGenerated || checklist.videoReviewed) return "video_generated";
  if (checklist.imageGenerated || checklist.imageReviewed) return "image_generated";
  if (Object.values(checklist).some(Boolean)) return "in_progress";
  if (current === "in_progress") return "in_progress";
  return "pending";
}

export function lwwAllows(clock: Record<string, string>, field: string, ts: string): boolean {
  const prev = clock[field];
  return prev === undefined || Date.parse(prev) <= Date.parse(ts);
}

export function emptyVideoRow(videoId: string, now: string): VideoProgressRow {
  const parsed = parseVideoId(videoId);
  if (!parsed) throw new OpRejected("invalid_value");
  return {
    channel_id: parsed.channelId,
    video_id: videoId,
    day_number: parsed.dayNumber,
    video_number: parsed.videoNumber,
    production_status: "pending",
    upload_status: "not_uploaded",
    publishing_status: "not_published",
    checklist: {},
    skip_scope: null,
    skip_reason: null,
    skipped_at: null,
    pre_skip: null,
    youtube_url: null,
    youtube_video_id: null,
    uploaded_at: null,
    published_at: null,
    notes: null,
    analytics: null,
    field_clock: {},
    version: 0,
    updated_at: now,
    updated_by_device: null,
  };
}

export function isResolved(row: VideoProgressRow | undefined): boolean {
  return row?.upload_status === "uploaded" || row?.upload_status === "skipped";
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
const dateOrNull = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

function skipRow(row: VideoProgressRow, scope: "video" | "day", reason: unknown, now: string): VideoProgressRow {
  return {
    ...row,
    pre_skip: {
      production_status: row.production_status,
      upload_status: row.upload_status,
      publishing_status: row.publishing_status,
    },
    upload_status: "skipped",
    skip_scope: scope,
    skip_reason: str(reason, 500),
    skipped_at: now,
  };
}

function restoreRow(row: VideoProgressRow): VideoProgressRow {
  const prevUpload = row.pre_skip?.upload_status;
  const prevProduction = row.pre_skip?.production_status;
  return {
    ...row,
    upload_status: prevUpload === "upload_failed" ? "upload_failed" : "not_uploaded",
    production_status:
      prevProduction && prevProduction !== "completed"
        ? prevProduction
        : deriveProductionStatus(row.checklist, "pending"),
    publishing_status: "not_published",
    skip_scope: null,
    skip_reason: null,
    skipped_at: null,
    pre_skip: null,
  };
}

/** Throws OpRejected for business-rule violations (same reasons as the SQL function). */
export function applyOp(state: ProgressState, op: Op, ctx: { now: string; today: string }): ApplyOutcome {
  const ts = Date.parse(op.client_ts) > Date.parse(ctx.now) ? ctx.now : op.client_ts;
  const p = op.payload;
  const bump = (row: VideoProgressRow): VideoProgressRow => ({
    ...row,
    version: row.version + 1,
    updated_at: ctx.now,
    updated_by_device: op.device_id,
  });
  const stale = (videos: VideoProgressRow[] = []): ApplyOutcome => ({ state, status: "stale", activity: null, videos });
  const activity = (
    action_type: ActionType,
    previous_status: string | null,
    new_status: string | null,
    notes: string | null = null,
    details: Record<string, unknown> | null = null,
  ): ActivityDraft => ({ action_type, previous_status, new_status, notes, details });

  // ------------------------------------------------------------- per-video ops
  if (op.type !== "skip_day" && op.type !== "restore_day" && op.type !== "prompt_update" && op.type !== "update_settings") {
    if (!op.video_id) throw new OpRejected("invalid_value");
    const existing = state.videos[op.video_id] ?? emptyVideoRow(op.video_id, ctx.now);
    let row: VideoProgressRow = { ...existing, checklist: { ...existing.checklist }, field_clock: { ...existing.field_clock } };
    let act: ActivityDraft;

    switch (op.type) {
      case "checklist": {
        const item = p.item as ChecklistKey;
        if (!CHECKLIST_KEYS.has(item)) throw new OpRejected("invalid_checklist_item");
        const field = `checklist.${item}`;
        if (!lwwAllows(row.field_clock, field, ts)) return stale([existing]);
        const value = p.value === true;
        const prev = row.production_status;
        row.checklist[item] = value;
        row.production_status = deriveProductionStatus(row.checklist, row.production_status);
        row.field_clock[field] = ts;
        const action: ActionType =
          value && item === "imageGenerated"
            ? "image_generated"
            : value && item === "videoGenerated"
              ? "video_generated"
              : prev === "pending" && row.production_status !== "pending"
                ? "video_started"
                : "checklist_updated";
        act = activity(action, prev, row.production_status, null, { item, value });
        break;
      }
      case "set_production_status": {
        if (row.upload_status === "uploaded") throw new OpRejected("already_uploaded");
        if (!lwwAllows(row.field_clock, "production_status", ts)) return stale([existing]);
        const prev = row.production_status;
        const next =
          p.status === "failed"
            ? "failed"
            : p.status === "in_progress"
              ? deriveProductionStatus(row.checklist, "in_progress")
              : p.status === "auto"
                ? deriveProductionStatus(row.checklist, "pending")
                : null;
        if (!next) throw new OpRejected("invalid_production_status");
        row.production_status = next;
        row.field_clock.production_status = ts;
        act = activity(prev === "pending" && next === "in_progress" ? "video_started" : "status_changed", prev, next, str(p.reason, 500));
        break;
      }
      case "save_upload_details": {
        for (const key of ["youtube_url", "youtube_video_id", "uploaded_at", "published_at"] as const) {
          if (!(key in p) || !lwwAllows(row.field_clock, key, ts)) continue;
          row.field_clock[key] = ts;
          if (key === "youtube_url") row.youtube_url = str(p[key], 300);
          if (key === "youtube_video_id") {
            const id = str(p[key], 11);
            if (id && !YOUTUBE_ID.test(id)) throw new OpRejected("invalid_value");
            row.youtube_video_id = id;
          }
          if (key === "uploaded_at") row.uploaded_at = dateOrNull(p[key]);
          if (key === "published_at") row.published_at = dateOrNull(p[key]);
        }
        assertUniqueYoutubeId(state, row);
        act = activity("youtube_url_updated", null, null, null, { youtube_url: row.youtube_url, youtube_video_id: row.youtube_video_id });
        break;
      }
      case "mark_uploaded": {
        if (row.upload_status === "uploaded") return stale([existing]);
        if (row.upload_status === "skipped") throw new OpRejected("video_skipped");
        if (!earlierVideosResolved(state, row.channel_id, row.day_number, row.video_number)) {
          throw new OpRejected("sequence_locked");
        }
        const prev = row.upload_status;
        row.upload_status = "uploaded";
        row.production_status = "completed";
        if ("youtube_url" in p) row.youtube_url = str(p.youtube_url, 300);
        if ("youtube_video_id" in p) {
          const id = str(p.youtube_video_id, 11);
          if (id && !YOUTUBE_ID.test(id)) throw new OpRejected("invalid_value");
          row.youtube_video_id = id;
        }
        row.uploaded_at = dateOrNull(p.uploaded_at) ?? row.uploaded_at ?? ctx.today;
        for (const f of ["upload_status", "youtube_url", "youtube_video_id", "uploaded_at"]) row.field_clock[f] = ts;
        assertUniqueYoutubeId(state, row);
        act = activity("video_uploaded", prev, "uploaded", null, {
          youtube_url: row.youtube_url,
          youtube_video_id: row.youtube_video_id,
          uploaded_at: row.uploaded_at,
        });
        break;
      }
      case "mark_upload_failed": {
        if (row.upload_status !== "not_uploaded" && row.upload_status !== "upload_failed") {
          throw new OpRejected("invalid_transition");
        }
        const prev = row.upload_status;
        row.upload_status = "upload_failed";
        row.field_clock.upload_status = ts;
        act = activity("upload_failed", prev, "upload_failed", str(p.reason, 500));
        break;
      }
      case "revert_upload": {
        if (row.upload_status !== "uploaded") throw new OpRejected("not_uploaded");
        const later = Object.values(state.videos).some(
          (v) =>
            v.channel_id === row.channel_id &&
            v.upload_status === "uploaded" &&
            (v.day_number > row.day_number || (v.day_number === row.day_number && v.video_number > row.video_number)),
        );
        if (later) throw new OpRejected("later_videos_uploaded");
        row.upload_status = "not_uploaded";
        row.production_status = deriveProductionStatus(row.checklist, "pending");
        row.publishing_status = "not_published";
        row.published_at = null;
        row.field_clock.upload_status = ts;
        row.field_clock.publishing_status = ts;
        act = activity("upload_reverted", "uploaded", "not_uploaded", str(p.reason, 500));
        break;
      }
      case "set_publishing_status": {
        const next = p.status as PublishingStatus;
        if (!PUBLISHING_STATUSES.includes(next)) throw new OpRejected("invalid_publishing_status");
        if (next !== "not_published" && row.upload_status !== "uploaded") throw new OpRejected("not_uploaded");
        if (!lwwAllows(row.field_clock, "publishing_status", ts)) return stale([existing]);
        const prev = row.publishing_status;
        row.publishing_status = next;
        if (next === "published") row.published_at = dateOrNull(p.published_at) ?? row.published_at ?? ctx.today;
        row.field_clock.publishing_status = ts;
        act = activity(next === "published" ? "video_published" : "publishing_status_changed", prev, next);
        break;
      }
      case "skip_video": {
        if (row.upload_status === "uploaded") throw new OpRejected("already_uploaded");
        if (row.upload_status === "skipped") return stale([existing]);
        const prev = row.upload_status;
        row = skipRow(row, "video", p.reason, ctx.now);
        act = activity("video_skipped", prev, "skipped", row.skip_reason);
        break;
      }
      case "restore_video": {
        if (row.upload_status !== "skipped") return stale([existing]);
        row = restoreRow(row);
        act = activity("video_restored", "skipped", row.upload_status);
        break;
      }
      case "set_notes": {
        if (!lwwAllows(row.field_clock, "notes", ts)) return stale([existing]);
        row.notes = str(p.notes, 2000);
        row.field_clock.notes = ts;
        act = activity("notes_added", null, null, row.notes?.slice(0, 200) ?? null);
        break;
      }
      case "set_analytics": {
        if (!p.analytics || typeof p.analytics !== "object") throw new OpRejected("invalid_analytics");
        if (!lwwAllows(row.field_clock, "analytics", ts)) return stale([existing]);
        row.analytics = p.analytics as VideoProgressRow["analytics"];
        row.field_clock.analytics = ts;
        act = activity("analytics_updated", null, null);
        break;
      }
      default:
        throw new OpRejected("unknown_op_type");
    }

    row = bump(row);
    return {
      state: { ...state, videos: { ...state.videos, [row.video_id]: row } },
      status: "applied",
      activity: act,
      videos: [row],
    };
  }

  // ------------------------------------------------------------- per-day ops
  if (op.type === "skip_day" || op.type === "restore_day") {
    const channelId = op.channel_id as ChannelId | undefined;
    const day = op.day_number;
    if (!channelId || !day || !op.videos?.length || op.videos.length > 2) throw new OpRejected("invalid_day_videos");
    const key = daySkipKey(channelId, day);
    const videos = { ...state.videos };
    const changed: VideoProgressRow[] = [];
    const prevSkip = state.daySkips[key];
    let daySkip: DaySkipRow;

    if (op.type === "skip_day") {
      daySkip = {
        channel_id: channelId,
        day_number: day,
        reason: str(p.reason, 500),
        skipped_at: ctx.now,
        restored_at: null,
        version: (prevSkip?.version ?? 0) + 1,
        updated_at: ctx.now,
      };
      for (const v of op.videos) {
        let row = videos[v.video_id] ?? emptyVideoRow(v.video_id, ctx.now);
        if (row.upload_status !== "uploaded" && row.upload_status !== "skipped") {
          row = bump(skipRow(row, "day", p.reason, ctx.now));
          videos[row.video_id] = row;
        }
        changed.push(row);
      }
    } else {
      daySkip = prevSkip
        ? { ...prevSkip, restored_at: prevSkip.restored_at ?? ctx.now, version: prevSkip.version + 1, updated_at: ctx.now }
        : { channel_id: channelId, day_number: day, reason: null, skipped_at: ctx.now, restored_at: ctx.now, version: 1, updated_at: ctx.now };
      for (const v of op.videos) {
        let row = videos[v.video_id] ?? emptyVideoRow(v.video_id, ctx.now);
        if (row.upload_status === "skipped" && row.skip_scope === "day") {
          row = bump(restoreRow(row));
          videos[row.video_id] = row;
        }
        changed.push(row);
      }
    }
    return {
      state: { ...state, videos, daySkips: { ...state.daySkips, [key]: daySkip } },
      status: "applied",
      activity: activity(
        op.type === "skip_day" ? "day_skipped" : "day_restored",
        op.type === "skip_day" ? null : "skipped",
        op.type === "skip_day" ? "skipped" : null,
        op.type === "skip_day" ? daySkip.reason : null,
        { videos: op.videos.map((v) => v.video_id) },
      ),
      videos: changed,
    };
  }

  // ------------------------------------------------------------- prompts
  if (op.type === "prompt_update") {
    const type = p.prompt_type as PromptType;
    if (!op.video_id || !["image", "flow", "thumbnail"].includes(type)) throw new OpRejected("invalid_prompt_type");
    const key = promptKey(op.video_id, type);
    const prev = state.prompts[key];
    const row: PromptProgressRow = prev
      ? { ...prev, field_clock: { ...prev.field_clock } }
      : {
          channel_id: op.channel_id as ChannelId,
          video_id: op.video_id,
          prompt_type: type,
          testing_status: "untested",
          approved_version: null,
          custom_text: null,
          custom_version: 0,
          feedback: null,
          failure_reason: null,
          field_clock: {},
          version: 0,
          updated_at: ctx.now,
        };
    const prevStatus = row.testing_status;
    let action: ActionType = "prompt_status_changed";
    if ("custom_text" in p && lwwAllows(row.field_clock, "custom_text", ts)) {
      row.custom_text = str(p.custom_text, 12000);
      row.custom_version += 1;
      row.field_clock.custom_text = ts;
      action = "prompt_updated";
      if (row.testing_status === "approved") row.testing_status = "testing";
    }
    if ("feedback" in p && lwwAllows(row.field_clock, "feedback", ts)) {
      row.feedback = str(p.feedback, 2000);
      row.field_clock.feedback = ts;
    }
    if ("failure_reason" in p && lwwAllows(row.field_clock, "failure_reason", ts)) {
      row.failure_reason = str(p.failure_reason, 1000);
      row.field_clock.failure_reason = ts;
    }
    if ("testing_status" in p && lwwAllows(row.field_clock, "testing_status", ts)) {
      const next = p.testing_status as TestingStatus;
      if (!TESTING_STATUSES.includes(next)) throw new OpRejected("invalid_testing_status");
      row.testing_status = next;
      row.field_clock.testing_status = ts;
      if (next === "approved") {
        row.approved_version = row.custom_text
          ? `custom-v${row.custom_version}`
          : `template-${typeof p.template_version === "string" ? p.template_version.slice(0, 20) : "v1"}`;
      }
    }
    row.version += 1;
    row.updated_at = ctx.now;
    return {
      state: { ...state, prompts: { ...state.prompts, [key]: row } },
      status: "applied",
      activity: activity(action, prevStatus, row.testing_status, row.feedback?.slice(0, 300) ?? null, {
        prompt_type: type,
        custom_version: row.custom_version,
        approved_version: row.approved_version,
        failure_reason: row.failure_reason,
      }),
      videos: [],
    };
  }

  // ------------------------------------------------------------- settings
  if (op.type === "update_settings") {
    if (!state.settings) return { state, status: "stale", activity: null, videos: [] };
    const settings = { ...state.settings, field_clock: { ...state.settings.field_clock }, preferences: { ...state.settings.preferences } };
    let workspaceName = state.workspaceName;
    if (typeof p.schedule_start_date === "string" && lwwAllows(settings.field_clock, "schedule_start_date", ts)) {
      settings.schedule_start_date = p.schedule_start_date;
      settings.field_clock.schedule_start_date = ts;
    }
    if (typeof p.timezone === "string" && lwwAllows(settings.field_clock, "timezone", ts)) {
      settings.timezone = p.timezone.slice(0, 64);
      settings.field_clock.timezone = ts;
    }
    if (p.preferences && typeof p.preferences === "object") {
      for (const [k, v] of Object.entries(p.preferences as Record<string, unknown>)) {
        if (!lwwAllows(settings.field_clock, `pref.${k}`, ts)) continue;
        settings.preferences[k] = v;
        settings.field_clock[`pref.${k}`] = ts;
      }
    }
    if (typeof p.name === "string" && lwwAllows(settings.field_clock, "name", ts)) {
      workspaceName = p.name.trim().slice(0, 80) || "My Workspace";
      settings.field_clock.name = ts;
    }
    settings.version += 1;
    settings.updated_at = ctx.now;
    return {
      state: { ...state, settings, workspaceName },
      status: "applied",
      activity: activity("settings_updated", null, null, null, p),
      videos: [],
    };
  }

  throw new OpRejected("unknown_op_type");
}

export function earlierVideosResolved(state: ProgressState, channelId: string, day: number, videoNumber: number): boolean {
  const required = (day - 1) * 2 + (videoNumber - 1);
  let resolved = 0;
  for (const v of Object.values(state.videos)) {
    if (v.channel_id !== channelId) continue;
    const earlier = v.day_number < day || (v.day_number === day && v.video_number < videoNumber);
    if (earlier && isResolved(v)) resolved++;
  }
  return resolved >= required;
}

function assertUniqueYoutubeId(state: ProgressState, row: VideoProgressRow) {
  if (!row.youtube_video_id) return;
  const clash = Object.values(state.videos).some(
    (v) => v.video_id !== row.video_id && v.youtube_video_id === row.youtube_video_id,
  );
  if (clash) throw new OpRejected("duplicate_youtube_video");
}

/** Extracts the 11-char video ID from youtube.com/watch?v=, youtu.be/, /shorts/ and /live/ URLs. */
export function extractYoutubeId(url: string): string | null {
  const trimmed = url.trim();
  if (YOUTUBE_ID.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1, 12);
      return YOUTUBE_ID.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "music.youtube.com" || host === "studio.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && YOUTUBE_ID.test(v)) return v;
      const match = /^\/(?:shorts|live|embed|video)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
      if (match?.[1]) return match[1];
    }
  } catch {
    return null;
  }
  return null;
}
