-- =============================================================================
-- AI Shorts Studio — workspace progress, device pairing, activity history.
-- Static content (prompts, SEO, …) is NOT stored here; only per-workspace progress.
-- Every client write goes through SECURITY DEFINER RPCs that check membership and
-- enforce the video state machine; tables are read-only for clients via RLS.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Workspace' check (char_length(name) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  schedule_start_date date not null default ((now() at time zone 'Asia/Kolkata')::date),
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  content_version text not null default 'v1',
  progress_epoch integer not null default 1,
  field_clock jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 64),
  device_label text not null default 'Device' check (char_length(device_label) between 1 and 80),
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null
);
-- A device (anonymous auth user) belongs to at most one workspace at a time.
create unique index workspace_members_one_active_per_user
  on public.workspace_members (user_id) where revoked_at is null;
create index workspace_members_workspace_idx on public.workspace_members (workspace_id);

create table public.workspace_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  code_hash text not null unique check (char_length(code_hash) = 64),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null,
  invalidated_at timestamptz
);
create index workspace_pairing_codes_workspace_idx on public.workspace_pairing_codes (workspace_id);

create table public.pairing_attempts (
  id bigint generated always as identity primary key,
  user_id uuid,
  ip_hash text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index pairing_attempts_user_idx on public.pairing_attempts (user_id, created_at desc);
create index pairing_attempts_ip_idx on public.pairing_attempts (ip_hash, created_at desc);

create table public.video_progress (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id text not null check (channel_id in ('future-ai', 'ai-fashion', 'galaxy-space', 'kids-learning', 'ai-facts', 'ai-animals')),
  video_id text not null,
  day_number smallint not null check (day_number between 1 and 90),
  video_number smallint not null check (video_number between 1 and 2),
  production_status text not null default 'pending' check (production_status in (
    'pending', 'in_progress', 'image_generated', 'video_generated', 'thumbnail_ready', 'ready_for_upload', 'completed', 'failed')),
  upload_status text not null default 'not_uploaded' check (upload_status in ('not_uploaded', 'uploaded', 'upload_failed', 'skipped')),
  publishing_status text not null default 'not_published' check (publishing_status in (
    'not_published', 'scheduled_manually', 'published', 'private', 'unlisted')),
  checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist) = 'object'),
  skip_scope text check (skip_scope in ('video', 'day')),
  skip_reason text check (char_length(skip_reason) <= 500),
  skipped_at timestamptz,
  pre_skip jsonb,
  youtube_url text check (char_length(youtube_url) <= 300),
  youtube_video_id text check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  uploaded_at date,
  published_at date,
  notes text check (char_length(notes) <= 2000),
  analytics jsonb check (analytics is null or jsonb_typeof(analytics) = 'object'),
  field_clock jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_by_device text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_progress_unique_video unique (workspace_id, video_id),
  constraint video_progress_id_matches check (
    video_id = channel_id || '-d' || lpad(day_number::text, 3, '0') || '-v' || video_number::text),
  constraint video_progress_skip_consistent check ((upload_status = 'skipped') = (skip_scope is not null))
);
-- One YouTube video can only be recorded against one planned video (no duplicate upload records).
create unique index video_progress_youtube_unique
  on public.video_progress (workspace_id, youtube_video_id) where youtube_video_id is not null;
create index video_progress_sequence_idx
  on public.video_progress (workspace_id, channel_id, day_number, video_number);

create table public.day_skips (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id text not null,
  day_number smallint not null check (day_number between 1 and 90),
  reason text check (char_length(reason) <= 500),
  skipped_at timestamptz not null default now(),
  restored_at timestamptz,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint day_skips_unique_day unique (workspace_id, channel_id, day_number)
);

create table public.prompt_progress (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id text not null,
  video_id text not null,
  prompt_type text not null check (prompt_type in ('image', 'flow', 'thumbnail')),
  testing_status text not null default 'untested' check (testing_status in ('untested', 'testing', 'approved', 'failed')),
  approved_version text check (char_length(approved_version) <= 40),
  custom_text text check (char_length(custom_text) <= 12000),
  custom_version integer not null default 0,
  feedback text check (char_length(feedback) <= 2000),
  failure_reason text check (char_length(failure_reason) <= 1000),
  field_clock jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint prompt_progress_unique unique (workspace_id, video_id, prompt_type)
);

create table public.activity_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_op_id uuid,
  channel_id text,
  day_number smallint,
  video_id text,
  action_type text not null check (action_type in (
    'workspace_created', 'video_started', 'checklist_updated', 'image_generated', 'video_generated',
    'video_completed', 'video_uploaded', 'upload_failed', 'upload_reverted', 'video_published',
    'publishing_status_changed', 'video_skipped', 'day_skipped', 'video_restored', 'day_restored',
    'prompt_updated', 'prompt_status_changed', 'status_changed', 'youtube_url_updated', 'notes_added',
    'analytics_updated', 'settings_updated', 'device_connected', 'device_disconnected',
    'pairing_code_regenerated', 'backup_imported', 'progress_reset')),
  previous_status text,
  new_status text,
  notes text check (char_length(notes) <= 2000),
  details jsonb,
  device_id text,
  created_at timestamptz not null default now(),
  client_created_at timestamptz
);
-- Idempotency: an offline op that is retried never creates a second history entry.
create unique index activity_history_client_op_unique
  on public.activity_history (workspace_id, client_op_id) where client_op_id is not null;
create index activity_history_recent_idx on public.activity_history (workspace_id, created_at desc);
create index activity_history_video_idx on public.activity_history (workspace_id, video_id, created_at desc);
create index activity_history_channel_idx on public.activity_history (workspace_id, channel_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Membership helpers + RLS
-- -----------------------------------------------------------------------------

create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.workspace_id
  from public.workspace_members m
  where m.user_id = auth.uid() and m.revoked_at is null
  limit 1;
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_pairing_codes enable row level security;
alter table public.pairing_attempts enable row level security;
alter table public.video_progress enable row level security;
alter table public.day_skips enable row level security;
alter table public.prompt_progress enable row level security;
alter table public.activity_history enable row level security;

create policy "members read their workspace" on public.workspaces
  for select to authenticated using (id = (select public.current_workspace_id()));
create policy "members read settings" on public.workspace_settings
  for select to authenticated using (workspace_id = (select public.current_workspace_id()));
create policy "members read devices" on public.workspace_members
  for select to authenticated using (workspace_id = (select public.current_workspace_id()));
create policy "members read video progress" on public.video_progress
  for select to authenticated using (workspace_id = (select public.current_workspace_id()));
create policy "members read day skips" on public.day_skips
  for select to authenticated using (workspace_id = (select public.current_workspace_id()));
create policy "members read prompt progress" on public.prompt_progress
  for select to authenticated using (workspace_id = (select public.current_workspace_id()));
create policy "members read activity" on public.activity_history
  for select to authenticated using (workspace_id = (select public.current_workspace_id()));
-- workspace_pairing_codes / pairing_attempts: no policies → no client access at all.

-- Defense in depth: clients never write tables directly.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.workspace_pairing_codes, public.pairing_attempts from anon, authenticated;
revoke select on all tables in schema public from anon;

-- -----------------------------------------------------------------------------
-- Pure helpers
-- -----------------------------------------------------------------------------

-- Keep in sync with src/lib/progress/transitions.ts → deriveProductionStatus().
create or replace function public.derive_production_status(p_checklist jsonb, p_current text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_current in ('completed', 'failed') then p_current
    when (p_checklist ->> 'readyForUpload')::boolean is true then 'ready_for_upload'
    when (p_checklist ->> 'thumbnailReady')::boolean is true then 'thumbnail_ready'
    when (p_checklist ->> 'videoGenerated')::boolean is true or (p_checklist ->> 'videoReviewed')::boolean is true then 'video_generated'
    when (p_checklist ->> 'imageGenerated')::boolean is true or (p_checklist ->> 'imageReviewed')::boolean is true then 'image_generated'
    when exists (select 1 from jsonb_each(p_checklist) e where e.value = 'true'::jsonb) then 'in_progress'
    when p_current = 'in_progress' then 'in_progress'
    else 'pending'
  end;
$$;

-- Last-writer-wins per field: true when a write stamped p_ts may overwrite p_field.
create or replace function public.lww_allows(p_clock jsonb, p_field text, p_ts timestamptz)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_clock ->> p_field) is null or (p_clock ->> p_field)::timestamptz <= p_ts;
$$;

create or replace function public._lock_video(p_ws uuid, p_channel text, p_video text, p_day int, p_vno int)
returns public.video_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.video_progress;
begin
  insert into public.video_progress (workspace_id, channel_id, video_id, day_number, video_number)
  values (p_ws, p_channel, p_video, p_day, p_vno)
  on conflict (workspace_id, video_id) do nothing;
  select * into v_row from public.video_progress
  where workspace_id = p_ws and video_id = p_video
  for update;
  return v_row;
end;
$$;

-- Skips one locked row (used by skip_video and skip_day). Caller has checked it isn't uploaded.
create or replace function public._skip_video(p_row public.video_progress, p_scope text, p_reason text, p_device text)
returns public.video_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.video_progress;
begin
  update public.video_progress set
    pre_skip = jsonb_build_object(
      'production_status', p_row.production_status,
      'upload_status', p_row.upload_status,
      'publishing_status', p_row.publishing_status),
    upload_status = 'skipped',
    skip_scope = p_scope,
    skip_reason = nullif(left(p_reason, 500), ''),
    skipped_at = now(),
    version = version + 1,
    updated_at = now(),
    updated_by_device = p_device
  where id = p_row.id
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public._restore_video(p_row public.video_progress, p_device text)
returns public.video_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.video_progress;
  v_upload text := coalesce(p_row.pre_skip ->> 'upload_status', 'not_uploaded');
begin
  if v_upload not in ('not_uploaded', 'upload_failed') then v_upload := 'not_uploaded'; end if;
  update public.video_progress set
    upload_status = v_upload,
    production_status = coalesce(
      nullif(p_row.pre_skip ->> 'production_status', 'completed'),
      public.derive_production_status(p_row.checklist, 'pending')),
    publishing_status = 'not_published',
    skip_scope = null,
    skip_reason = null,
    skipped_at = null,
    pre_skip = null,
    version = version + 1,
    updated_at = now(),
    updated_by_device = p_device
  where id = p_row.id
  returning * into v_row;
  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- The operation applier (single source of truth for progress transitions)
-- Keep in sync with src/lib/progress/transitions.ts (optimistic client copy).
-- -----------------------------------------------------------------------------

create or replace function public._apply_op(p_ws uuid, p_epoch int, p_op jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_op_id uuid := (p_op ->> 'op_id')::uuid;
  v_type text := p_op ->> 'type';
  v_payload jsonb := coalesce(p_op -> 'payload', '{}'::jsonb);
  v_ts timestamptz := least(coalesce((p_op ->> 'client_ts')::timestamptz, now()), now());
  v_device text := left(p_op ->> 'device_id', 64);
  v_channel text := p_op ->> 'channel_id';
  v_video text := p_op ->> 'video_id';
  v_day int := (p_op ->> 'day_number')::int;
  v_vno int := (p_op ->> 'video_number')::int;
  v_row public.video_progress;
  v_rows jsonb := '[]'::jsonb;
  v_prompt public.prompt_progress;
  v_settings public.workspace_settings;
  v_day_skip public.day_skips;
  v_clock jsonb;
  v_prev text;
  v_new text;
  v_action text;
  v_notes text;
  v_details jsonb;
  v_status text := 'applied';
  v_count int;
  v_item text;
  v_key text;
  v_value jsonb;
  v_video_entry jsonb;
  v_out jsonb := jsonb_build_object('op_id', v_op_id);
  v_tz text;
begin
  if v_op_id is null then raise exception 'invalid_op_id'; end if;
  if exists (select 1 from public.activity_history where workspace_id = p_ws and client_op_id = v_op_id) then
    return v_out || jsonb_build_object('status', 'duplicate');
  end if;
  if coalesce((p_op ->> 'epoch')::int, -1) <> p_epoch then raise exception 'stale_epoch'; end if;

  -- ---------------------------------------------------------------- per-video
  if v_type in ('checklist', 'set_production_status', 'save_upload_details', 'mark_uploaded',
                'mark_upload_failed', 'revert_upload', 'set_publishing_status', 'skip_video',
                'restore_video', 'set_notes', 'set_analytics') then
    v_row := public._lock_video(p_ws, v_channel, v_video, v_day, v_vno);
    v_clock := v_row.field_clock;

    if v_type = 'checklist' then
      v_item := v_payload ->> 'item';
      if v_item not in ('imageGenerated', 'imageReviewed', 'videoGenerated', 'videoReviewed',
                        'thumbnailReady', 'youtubeDetailsReady', 'readyForUpload') then
        raise exception 'invalid_checklist_item';
      end if;
      if not public.lww_allows(v_clock, 'checklist.' || v_item, v_ts) then
        v_status := 'stale';
      else
        v_prev := v_row.production_status;
        v_row.checklist := jsonb_set(v_row.checklist, array[v_item], to_jsonb(coalesce((v_payload ->> 'value')::boolean, false)));
        v_row.production_status := public.derive_production_status(v_row.checklist, v_row.production_status);
        v_new := v_row.production_status;
        v_clock := v_clock || jsonb_build_object('checklist.' || v_item, v_ts);
        v_action := case
          when (v_payload ->> 'value')::boolean and v_item = 'imageGenerated' then 'image_generated'
          when (v_payload ->> 'value')::boolean and v_item = 'videoGenerated' then 'video_generated'
          when v_prev = 'pending' and v_new <> 'pending' then 'video_started'
          else 'checklist_updated' end;
        v_details := jsonb_build_object('item', v_item, 'value', (v_payload ->> 'value')::boolean);
      end if;

    elsif v_type = 'set_production_status' then
      if v_row.upload_status = 'uploaded' then raise exception 'already_uploaded'; end if;
      if not public.lww_allows(v_clock, 'production_status', v_ts) then
        v_status := 'stale';
      else
        v_prev := v_row.production_status;
        v_row.production_status := case v_payload ->> 'status'
          when 'failed' then 'failed'
          when 'in_progress' then public.derive_production_status(v_row.checklist, 'in_progress')
          when 'auto' then public.derive_production_status(v_row.checklist, 'pending')
          else null end;
        if v_row.production_status is null then raise exception 'invalid_production_status'; end if;
        v_new := v_row.production_status;
        v_clock := v_clock || jsonb_build_object('production_status', v_ts);
        v_action := case when v_prev = 'pending' and v_new = 'in_progress' then 'video_started' else 'status_changed' end;
        v_notes := left(v_payload ->> 'reason', 500);
      end if;

    elsif v_type = 'save_upload_details' then
      v_action := 'youtube_url_updated';
      for v_key in select unnest(array['youtube_url', 'youtube_video_id', 'uploaded_at', 'published_at']) loop
        if v_payload ? v_key and public.lww_allows(v_clock, v_key, v_ts) then
          v_clock := v_clock || jsonb_build_object(v_key, v_ts);
          case v_key
            when 'youtube_url' then v_row.youtube_url := nullif(v_payload ->> v_key, '');
            when 'youtube_video_id' then v_row.youtube_video_id := nullif(v_payload ->> v_key, '');
            when 'uploaded_at' then v_row.uploaded_at := nullif(v_payload ->> v_key, '')::date;
            when 'published_at' then v_row.published_at := nullif(v_payload ->> v_key, '')::date;
          end case;
        end if;
      end loop;
      v_details := jsonb_build_object('youtube_url', v_row.youtube_url, 'youtube_video_id', v_row.youtube_video_id);

    elsif v_type = 'mark_uploaded' then
      if v_row.upload_status = 'uploaded' then
        v_status := 'stale';
      elsif v_row.upload_status = 'skipped' then
        raise exception 'video_skipped';
      else
        select count(*) into v_count from public.video_progress p
        where p.workspace_id = p_ws and p.channel_id = v_row.channel_id
          and (p.day_number, p.video_number) < (v_row.day_number, v_row.video_number)
          and p.upload_status in ('uploaded', 'skipped');
        if v_count < (v_row.day_number - 1) * 2 + (v_row.video_number - 1) then
          raise exception 'sequence_locked';
        end if;
        v_prev := v_row.upload_status;
        v_row.upload_status := 'uploaded';
        v_row.production_status := 'completed';
        if v_payload ? 'youtube_url' then v_row.youtube_url := nullif(v_payload ->> 'youtube_url', ''); end if;
        if v_payload ? 'youtube_video_id' then v_row.youtube_video_id := nullif(v_payload ->> 'youtube_video_id', ''); end if;
        v_row.uploaded_at := coalesce(nullif(v_payload ->> 'uploaded_at', '')::date, v_row.uploaded_at, (now() at time zone 'Asia/Kolkata')::date);
        v_new := 'uploaded';
        v_clock := v_clock || jsonb_build_object('upload_status', v_ts, 'youtube_url', v_ts, 'youtube_video_id', v_ts, 'uploaded_at', v_ts);
        v_action := 'video_uploaded';
        v_details := jsonb_build_object('youtube_url', v_row.youtube_url, 'youtube_video_id', v_row.youtube_video_id, 'uploaded_at', v_row.uploaded_at);
      end if;

    elsif v_type = 'mark_upload_failed' then
      if v_row.upload_status not in ('not_uploaded', 'upload_failed') then raise exception 'invalid_transition'; end if;
      v_prev := v_row.upload_status;
      v_row.upload_status := 'upload_failed';
      v_new := 'upload_failed';
      v_clock := v_clock || jsonb_build_object('upload_status', v_ts);
      v_action := 'upload_failed';
      v_notes := left(v_payload ->> 'reason', 500);

    elsif v_type = 'revert_upload' then
      if v_row.upload_status <> 'uploaded' then raise exception 'not_uploaded'; end if;
      if exists (
        select 1 from public.video_progress p
        where p.workspace_id = p_ws and p.channel_id = v_row.channel_id
          and (p.day_number, p.video_number) > (v_row.day_number, v_row.video_number)
          and p.upload_status = 'uploaded'
      ) then
        raise exception 'later_videos_uploaded';
      end if;
      v_prev := v_row.upload_status;
      v_row.upload_status := 'not_uploaded';
      v_row.production_status := public.derive_production_status(v_row.checklist, 'pending');
      v_row.publishing_status := 'not_published';
      v_row.published_at := null;
      v_new := 'not_uploaded';
      v_clock := v_clock || jsonb_build_object('upload_status', v_ts, 'publishing_status', v_ts);
      v_action := 'upload_reverted';
      v_notes := left(v_payload ->> 'reason', 500);

    elsif v_type = 'set_publishing_status' then
      v_new := v_payload ->> 'status';
      if v_new not in ('not_published', 'scheduled_manually', 'published', 'private', 'unlisted') then
        raise exception 'invalid_publishing_status';
      end if;
      if v_new <> 'not_published' and v_row.upload_status <> 'uploaded' then raise exception 'not_uploaded'; end if;
      if not public.lww_allows(v_clock, 'publishing_status', v_ts) then
        v_status := 'stale';
      else
        select timezone into v_tz from public.workspace_settings where workspace_id = p_ws;
        v_prev := v_row.publishing_status;
        v_row.publishing_status := v_new;
        if v_new = 'published' then
          v_row.published_at := coalesce(nullif(v_payload ->> 'published_at', '')::date, v_row.published_at,
                                         (now() at time zone coalesce(v_tz, 'Asia/Kolkata'))::date);
        end if;
        v_clock := v_clock || jsonb_build_object('publishing_status', v_ts);
        v_action := case when v_new = 'published' then 'video_published' else 'publishing_status_changed' end;
      end if;

    elsif v_type = 'skip_video' then
      if v_row.upload_status = 'uploaded' then raise exception 'already_uploaded'; end if;
      if v_row.upload_status = 'skipped' then
        v_status := 'stale';
      else
        v_prev := v_row.upload_status;
        v_row := public._skip_video(v_row, 'video', v_payload ->> 'reason', v_device);
        v_new := 'skipped';
        v_action := 'video_skipped';
        v_notes := v_row.skip_reason;
      end if;

    elsif v_type = 'restore_video' then
      if v_row.upload_status <> 'skipped' then
        v_status := 'stale';
      else
        v_prev := 'skipped';
        v_row := public._restore_video(v_row, v_device);
        v_new := v_row.upload_status;
        v_action := 'video_restored';
      end if;

    elsif v_type = 'set_notes' then
      if not public.lww_allows(v_clock, 'notes', v_ts) then
        v_status := 'stale';
      else
        v_row.notes := nullif(left(v_payload ->> 'notes', 2000), '');
        v_clock := v_clock || jsonb_build_object('notes', v_ts);
        v_action := 'notes_added';
        v_notes := left(v_row.notes, 200);
      end if;

    elsif v_type = 'set_analytics' then
      if jsonb_typeof(v_payload -> 'analytics') is distinct from 'object' then raise exception 'invalid_analytics'; end if;
      if not public.lww_allows(v_clock, 'analytics', v_ts) then
        v_status := 'stale';
      else
        v_row.analytics := v_payload -> 'analytics';
        v_clock := v_clock || jsonb_build_object('analytics', v_ts);
        v_action := 'analytics_updated';
      end if;
    end if;

    -- Persist the in-memory row for the simple field ops (skip/restore already persisted).
    if v_status = 'applied' and v_type not in ('skip_video', 'restore_video') then
      update public.video_progress set
        production_status = v_row.production_status,
        upload_status = v_row.upload_status,
        publishing_status = v_row.publishing_status,
        checklist = v_row.checklist,
        youtube_url = v_row.youtube_url,
        youtube_video_id = v_row.youtube_video_id,
        uploaded_at = v_row.uploaded_at,
        published_at = v_row.published_at,
        notes = v_row.notes,
        analytics = v_row.analytics,
        field_clock = v_clock,
        version = version + 1,
        updated_at = now(),
        updated_by_device = v_device
      where id = v_row.id
      returning * into v_row;
    end if;
    v_rows := jsonb_build_array(to_jsonb(v_row));

  -- ---------------------------------------------------------------- per-day
  elsif v_type in ('skip_day', 'restore_day') then
    if v_channel is null or v_day is null then raise exception 'invalid_day'; end if;
    if jsonb_typeof(p_op -> 'videos') <> 'array' or jsonb_array_length(p_op -> 'videos') not between 1 and 2 then
      raise exception 'invalid_day_videos';
    end if;

    if v_type = 'skip_day' then
      insert into public.day_skips (workspace_id, channel_id, day_number, reason)
      values (p_ws, v_channel, v_day, nullif(left(v_payload ->> 'reason', 500), ''))
      on conflict (workspace_id, channel_id, day_number) do update set
        reason = excluded.reason, skipped_at = now(), restored_at = null,
        version = public.day_skips.version + 1, updated_at = now()
      returning * into v_day_skip;
      for v_video_entry in select * from jsonb_array_elements(p_op -> 'videos') loop
        v_row := public._lock_video(p_ws, v_channel, v_video_entry ->> 'video_id', v_day, (v_video_entry ->> 'video_number')::int);
        if v_row.upload_status not in ('uploaded', 'skipped') then
          v_row := public._skip_video(v_row, 'day', v_payload ->> 'reason', v_device);
        end if;
        v_rows := v_rows || jsonb_build_array(to_jsonb(v_row));
      end loop;
      v_action := 'day_skipped';
      v_new := 'skipped';
      v_notes := v_day_skip.reason;
    else
      update public.day_skips set restored_at = now(), version = version + 1, updated_at = now()
      where workspace_id = p_ws and channel_id = v_channel and day_number = v_day and restored_at is null
      returning * into v_day_skip;
      if v_day_skip.id is null then
        select * into v_day_skip from public.day_skips
        where workspace_id = p_ws and channel_id = v_channel and day_number = v_day;
      end if;
      for v_video_entry in select * from jsonb_array_elements(p_op -> 'videos') loop
        v_row := public._lock_video(p_ws, v_channel, v_video_entry ->> 'video_id', v_day, (v_video_entry ->> 'video_number')::int);
        if v_row.upload_status = 'skipped' and v_row.skip_scope = 'day' then
          v_row := public._restore_video(v_row, v_device);
        end if;
        v_rows := v_rows || jsonb_build_array(to_jsonb(v_row));
      end loop;
      v_action := 'day_restored';
      v_prev := 'skipped';
    end if;
    v_details := jsonb_build_object('videos', (select jsonb_agg(v ->> 'video_id') from jsonb_array_elements(p_op -> 'videos') v));
    v_out := v_out || jsonb_build_object('day_skip', to_jsonb(v_day_skip));

  -- ---------------------------------------------------------------- prompts
  elsif v_type = 'prompt_update' then
    if v_payload ->> 'prompt_type' not in ('image', 'flow', 'thumbnail') then raise exception 'invalid_prompt_type'; end if;
    insert into public.prompt_progress (workspace_id, channel_id, video_id, prompt_type)
    values (p_ws, v_channel, v_video, v_payload ->> 'prompt_type')
    on conflict (workspace_id, video_id, prompt_type) do nothing;
    select * into v_prompt from public.prompt_progress
    where workspace_id = p_ws and video_id = v_video and prompt_type = v_payload ->> 'prompt_type'
    for update;
    v_clock := v_prompt.field_clock;
    v_prev := v_prompt.testing_status;
    v_action := 'prompt_status_changed';

    if v_payload ? 'custom_text' and public.lww_allows(v_clock, 'custom_text', v_ts) then
      v_prompt.custom_text := nullif(v_payload ->> 'custom_text', '');
      v_prompt.custom_version := v_prompt.custom_version + 1;
      v_clock := v_clock || jsonb_build_object('custom_text', v_ts);
      v_action := 'prompt_updated';
      -- An edited prompt is a new, untested version.
      if v_prompt.testing_status = 'approved' then v_prompt.testing_status := 'testing'; end if;
    end if;
    if v_payload ? 'feedback' and public.lww_allows(v_clock, 'feedback', v_ts) then
      v_prompt.feedback := nullif(left(v_payload ->> 'feedback', 2000), '');
      v_clock := v_clock || jsonb_build_object('feedback', v_ts);
    end if;
    if v_payload ? 'failure_reason' and public.lww_allows(v_clock, 'failure_reason', v_ts) then
      v_prompt.failure_reason := nullif(left(v_payload ->> 'failure_reason', 1000), '');
      v_clock := v_clock || jsonb_build_object('failure_reason', v_ts);
    end if;
    if v_payload ? 'testing_status' and public.lww_allows(v_clock, 'testing_status', v_ts) then
      if v_payload ->> 'testing_status' not in ('untested', 'testing', 'approved', 'failed') then
        raise exception 'invalid_testing_status';
      end if;
      v_prompt.testing_status := v_payload ->> 'testing_status';
      v_clock := v_clock || jsonb_build_object('testing_status', v_ts);
      if v_prompt.testing_status = 'approved' then
        v_prompt.approved_version := case
          when v_prompt.custom_text is not null then 'custom-v' || v_prompt.custom_version
          else 'template-' || coalesce(nullif(left(v_payload ->> 'template_version', 20), ''), 'v1') end;
      end if;
    end if;
    update public.prompt_progress set
      custom_text = v_prompt.custom_text,
      custom_version = v_prompt.custom_version,
      feedback = v_prompt.feedback,
      failure_reason = v_prompt.failure_reason,
      testing_status = v_prompt.testing_status,
      approved_version = v_prompt.approved_version,
      field_clock = v_clock,
      version = version + 1,
      updated_at = now()
    where id = v_prompt.id
    returning * into v_prompt;
    v_new := v_prompt.testing_status;
    v_details := jsonb_build_object('prompt_type', v_prompt.prompt_type, 'custom_version', v_prompt.custom_version,
                                    'approved_version', v_prompt.approved_version, 'failure_reason', v_prompt.failure_reason);
    v_notes := left(v_prompt.feedback, 300);
    v_out := v_out || jsonb_build_object('prompt', to_jsonb(v_prompt));

  -- ---------------------------------------------------------------- settings
  elsif v_type = 'update_settings' then
    select * into v_settings from public.workspace_settings where workspace_id = p_ws for update;
    v_clock := v_settings.field_clock;
    if v_payload ? 'schedule_start_date' and public.lww_allows(v_clock, 'schedule_start_date', v_ts) then
      v_settings.schedule_start_date := (v_payload ->> 'schedule_start_date')::date;
      v_clock := v_clock || jsonb_build_object('schedule_start_date', v_ts);
    end if;
    if v_payload ? 'timezone' and public.lww_allows(v_clock, 'timezone', v_ts) then
      v_settings.timezone := left(v_payload ->> 'timezone', 64);
      v_clock := v_clock || jsonb_build_object('timezone', v_ts);
    end if;
    if jsonb_typeof(v_payload -> 'preferences') = 'object' then
      for v_key, v_value in select * from jsonb_each(v_payload -> 'preferences') loop
        if public.lww_allows(v_clock, 'pref.' || v_key, v_ts) then
          v_settings.preferences := v_settings.preferences || jsonb_build_object(v_key, v_value);
          v_clock := v_clock || jsonb_build_object('pref.' || v_key, v_ts);
        end if;
      end loop;
    end if;
    if v_payload ? 'name' and public.lww_allows(v_clock, 'name', v_ts) then
      update public.workspaces set name = left(coalesce(nullif(v_payload ->> 'name', ''), 'My Workspace'), 80), updated_at = now()
      where id = p_ws;
      v_clock := v_clock || jsonb_build_object('name', v_ts);
    end if;
    update public.workspace_settings set
      schedule_start_date = v_settings.schedule_start_date,
      timezone = v_settings.timezone,
      preferences = v_settings.preferences,
      field_clock = v_clock,
      version = version + 1,
      updated_at = now()
    where workspace_id = p_ws
    returning * into v_settings;
    v_action := 'settings_updated';
    v_details := v_payload;
    v_out := v_out || jsonb_build_object('settings', to_jsonb(v_settings));

  else
    raise exception 'unknown_op_type';
  end if;

  if v_status = 'stale' then
    return v_out || jsonb_build_object('status', 'stale', 'videos', v_rows);
  end if;

  insert into public.activity_history (
    workspace_id, client_op_id, channel_id, day_number, video_id, action_type,
    previous_status, new_status, notes, details, device_id, client_created_at)
  values (
    p_ws, v_op_id, v_channel, v_day, v_video, v_action,
    v_prev, v_new, v_notes, v_details, v_device, (p_op ->> 'client_ts')::timestamptz);

  return v_out || jsonb_build_object('status', 'applied', 'videos', v_rows);
end;
$$;

create or replace function public.apply_ops(p_ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid := public.current_workspace_id();
  v_epoch int;
  v_op jsonb;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_ws is null then raise exception 'not_member' using errcode = '42501'; end if;
  if jsonb_typeof(p_ops) <> 'array' or jsonb_array_length(p_ops) > 100 then raise exception 'invalid_ops'; end if;

  select progress_epoch into v_epoch from public.workspace_settings where workspace_id = v_ws;
  update public.workspace_members set last_active_at = now()
  where user_id = auth.uid() and revoked_at is null;

  for v_op in select * from jsonb_array_elements(p_ops) loop
    begin
      v_result := public._apply_op(v_ws, v_epoch, v_op);
    exception
      when unique_violation then
        v_result := jsonb_build_object('op_id', v_op ->> 'op_id', 'status', 'rejected', 'reason', 'duplicate_youtube_video');
      when check_violation then
        v_result := jsonb_build_object('op_id', v_op ->> 'op_id', 'status', 'rejected', 'reason', 'invalid_value');
      when others then
        v_result := jsonb_build_object('op_id', v_op ->> 'op_id', 'status', 'rejected', 'reason', sqlerrm);
    end;
    v_results := v_results || jsonb_build_array(v_result);
  end loop;
  return v_results;
end;
$$;

-- -----------------------------------------------------------------------------
-- Workspace + device RPCs (callable by signed-in anonymous devices)
-- -----------------------------------------------------------------------------

create or replace function public.get_my_membership()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.workspace_members;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'none'); end if;
  select * into v_member from public.workspace_members where user_id = auth.uid() and revoked_at is null;
  if found then
    return jsonb_build_object('status', 'active', 'workspace_id', v_member.workspace_id,
                              'member_id', v_member.id, 'role', v_member.role);
  end if;
  if exists (select 1 from public.workspace_members where user_id = auth.uid()) then
    return jsonb_build_object('status', 'revoked');
  end if;
  return jsonb_build_object('status', 'none');
end;
$$;

create or replace function public.create_workspace(p_device_id text, p_device_label text, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.workspace_members;
  v_ws uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_member from public.workspace_members where user_id = v_uid and revoked_at is null;
  if found then
    update public.workspace_members set last_active_at = now() where id = v_member.id;
    return jsonb_build_object('workspace_id', v_member.workspace_id, 'member_id', v_member.id, 'created', false);
  end if;
  -- A revoked device must explicitly choose to start over (it never silently gets a new workspace).
  if not p_force and exists (select 1 from public.workspace_members where user_id = v_uid) then
    raise exception 'device_revoked' using errcode = '42501';
  end if;

  insert into public.workspaces (created_by) values (v_uid) returning id into v_ws;
  insert into public.workspace_settings (workspace_id) values (v_ws);
  insert into public.workspace_members (workspace_id, user_id, device_id, device_label, role)
  values (v_ws, v_uid, p_device_id, left(coalesce(nullif(p_device_label, ''), 'Device'), 80), 'owner')
  returning * into v_member;
  insert into public.activity_history (workspace_id, action_type, device_id, notes)
  values (v_ws, 'workspace_created', p_device_id, 'Workspace created on ' || v_member.device_label);
  return jsonb_build_object('workspace_id', v_ws, 'member_id', v_member.id, 'created', true);
end;
$$;

create or replace function public.touch_device(p_device_label text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.workspace_members
  set last_active_at = now(),
      device_label = coalesce(left(nullif(p_device_label, ''), 80), device_label)
  where user_id = auth.uid() and revoked_at is null;
$$;

create or replace function public.revoke_device(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid := public.current_workspace_id();
  v_target public.workspace_members;
  v_me public.workspace_members;
begin
  if v_ws is null then raise exception 'not_member' using errcode = '42501'; end if;
  select * into v_me from public.workspace_members where user_id = auth.uid() and revoked_at is null;
  select * into v_target from public.workspace_members where id = p_member_id and workspace_id = v_ws and revoked_at is null for update;
  if not found then raise exception 'device_not_found'; end if;
  update public.workspace_members set revoked_at = now(), revoked_by = auth.uid() where id = v_target.id;
  insert into public.activity_history (workspace_id, action_type, device_id, notes, details)
  values (v_ws, 'device_disconnected', v_me.device_id,
          case when v_target.user_id = auth.uid() then 'This device left the workspace'
               else 'Removed device: ' || v_target.device_label end,
          jsonb_build_object('member_id', v_target.id, 'device_label', v_target.device_label));
end;
$$;

create or replace function public.reset_progress(p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid := public.current_workspace_id();
  v_settings public.workspace_settings;
begin
  if v_ws is null then raise exception 'not_member' using errcode = '42501'; end if;
  if p_confirm is distinct from 'RESET' then raise exception 'confirmation_required'; end if;
  delete from public.video_progress where workspace_id = v_ws;
  delete from public.day_skips where workspace_id = v_ws;
  delete from public.prompt_progress where workspace_id = v_ws;
  update public.workspace_settings set progress_epoch = progress_epoch + 1, version = version + 1, updated_at = now()
  where workspace_id = v_ws returning * into v_settings;
  insert into public.activity_history (workspace_id, action_type, notes, device_id)
  select v_ws, 'progress_reset', 'All progress was reset (static content untouched)', m.device_id
  from public.workspace_members m where m.user_id = auth.uid() and m.revoked_at is null;
  return to_jsonb(v_settings);
end;
$$;

-- Imports a validated backup (the client validates with zod first; constraints validate again here).
create or replace function public.import_backup(p_backup jsonb, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid := public.current_workspace_id();
  v_videos int := 0;
  v_days int := 0;
  v_prompts int := 0;
  v_activity int := 0;
  v_settings public.workspace_settings;
begin
  if v_ws is null then raise exception 'not_member' using errcode = '42501'; end if;
  if p_mode not in ('merge', 'replace') then raise exception 'invalid_mode'; end if;
  if (p_backup ->> 'backupVersion')::int is distinct from 1 then raise exception 'unsupported_backup_version'; end if;

  if p_mode = 'replace' then
    delete from public.video_progress where workspace_id = v_ws;
    delete from public.day_skips where workspace_id = v_ws;
    delete from public.prompt_progress where workspace_id = v_ws;
  end if;

  insert into public.video_progress as t (
    workspace_id, channel_id, video_id, day_number, video_number, production_status, upload_status,
    publishing_status, checklist, skip_scope, skip_reason, skipped_at, pre_skip, youtube_url,
    youtube_video_id, uploaded_at, published_at, notes, analytics, updated_at)
  select v_ws, r.channel_id, r.video_id, r.day_number, r.video_number, r.production_status, r.upload_status,
    r.publishing_status, coalesce(r.checklist, '{}'::jsonb), r.skip_scope, r.skip_reason, r.skipped_at, r.pre_skip,
    r.youtube_url, r.youtube_video_id, r.uploaded_at, r.published_at, r.notes, r.analytics, coalesce(r.updated_at, now())
  from jsonb_to_recordset(coalesce(p_backup -> 'videoProgress', '[]'::jsonb)) as r(
    channel_id text, video_id text, day_number smallint, video_number smallint, production_status text,
    upload_status text, publishing_status text, checklist jsonb, skip_scope text, skip_reason text,
    skipped_at timestamptz, pre_skip jsonb, youtube_url text, youtube_video_id text, uploaded_at date,
    published_at date, notes text, analytics jsonb, updated_at timestamptz)
  on conflict (workspace_id, video_id) do update set
    production_status = excluded.production_status, upload_status = excluded.upload_status,
    publishing_status = excluded.publishing_status, checklist = excluded.checklist,
    skip_scope = excluded.skip_scope, skip_reason = excluded.skip_reason, skipped_at = excluded.skipped_at,
    pre_skip = excluded.pre_skip, youtube_url = excluded.youtube_url, youtube_video_id = excluded.youtube_video_id,
    uploaded_at = excluded.uploaded_at, published_at = excluded.published_at, notes = excluded.notes,
    analytics = excluded.analytics, field_clock = '{}'::jsonb, version = t.version + 1, updated_at = now()
  where excluded.updated_at > t.updated_at;
  get diagnostics v_videos = row_count;

  insert into public.day_skips as t (workspace_id, channel_id, day_number, reason, skipped_at, restored_at, updated_at)
  select v_ws, r.channel_id, r.day_number, r.reason, coalesce(r.skipped_at, now()), r.restored_at, coalesce(r.updated_at, now())
  from jsonb_to_recordset(coalesce(p_backup -> 'daySkips', '[]'::jsonb)) as r(
    channel_id text, day_number smallint, reason text, skipped_at timestamptz, restored_at timestamptz, updated_at timestamptz)
  on conflict (workspace_id, channel_id, day_number) do update set
    reason = excluded.reason, skipped_at = excluded.skipped_at, restored_at = excluded.restored_at,
    version = t.version + 1, updated_at = now()
  where excluded.updated_at > t.updated_at;
  get diagnostics v_days = row_count;

  insert into public.prompt_progress as t (
    workspace_id, channel_id, video_id, prompt_type, testing_status, approved_version, custom_text,
    custom_version, feedback, failure_reason, updated_at)
  select v_ws, r.channel_id, r.video_id, r.prompt_type, r.testing_status, r.approved_version, r.custom_text,
    coalesce(r.custom_version, 0), r.feedback, r.failure_reason, coalesce(r.updated_at, now())
  from jsonb_to_recordset(coalesce(p_backup -> 'promptProgress', '[]'::jsonb)) as r(
    channel_id text, video_id text, prompt_type text, testing_status text, approved_version text,
    custom_text text, custom_version int, feedback text, failure_reason text, updated_at timestamptz)
  on conflict (workspace_id, video_id, prompt_type) do update set
    testing_status = excluded.testing_status, approved_version = excluded.approved_version,
    custom_text = excluded.custom_text, custom_version = excluded.custom_version, feedback = excluded.feedback,
    failure_reason = excluded.failure_reason, field_clock = '{}'::jsonb, version = t.version + 1, updated_at = now()
  where excluded.updated_at > t.updated_at;
  get diagnostics v_prompts = row_count;

  insert into public.activity_history (
    workspace_id, client_op_id, channel_id, day_number, video_id, action_type, previous_status,
    new_status, notes, details, device_id, created_at, client_created_at)
  select v_ws, r.client_op_id, r.channel_id, r.day_number, r.video_id, r.action_type, r.previous_status,
    r.new_status, r.notes, r.details, r.device_id, coalesce(r.created_at, now()), r.client_created_at
  from jsonb_to_recordset(coalesce(p_backup -> 'activity', '[]'::jsonb)) as r(
    client_op_id uuid, channel_id text, day_number smallint, video_id text, action_type text,
    previous_status text, new_status text, notes text, details jsonb, device_id text,
    created_at timestamptz, client_created_at timestamptz)
  where r.client_op_id is not null
     or not exists (
       select 1 from public.activity_history a
       where a.workspace_id = v_ws and a.created_at = r.created_at and a.action_type = r.action_type
         and a.video_id is not distinct from r.video_id)
  on conflict do nothing;
  get diagnostics v_activity = row_count;

  if jsonb_typeof(p_backup -> 'settings') = 'object' then
    update public.workspace_settings set
      preferences = coalesce(p_backup -> 'settings' -> 'preferences', preferences),
      schedule_start_date = coalesce((p_backup -> 'settings' ->> 'scheduleStartDate')::date, schedule_start_date),
      timezone = coalesce(left(p_backup -> 'settings' ->> 'timezone', 64), timezone)
    where workspace_id = v_ws;
  end if;

  update public.workspace_settings set progress_epoch = progress_epoch + 1, field_clock = '{}'::jsonb,
    version = version + 1, updated_at = now()
  where workspace_id = v_ws returning * into v_settings;

  insert into public.activity_history (workspace_id, action_type, notes, details, device_id)
  select v_ws, 'backup_imported', 'Backup imported (' || p_mode || ')',
    jsonb_build_object('videos', v_videos, 'days', v_days, 'prompts', v_prompts, 'activity', v_activity), m.device_id
  from public.workspace_members m where m.user_id = auth.uid() and m.revoked_at is null;

  return jsonb_build_object('videos', v_videos, 'days', v_days, 'prompts', v_prompts, 'activity', v_activity,
                            'settings', to_jsonb(v_settings));
end;
$$;

-- -----------------------------------------------------------------------------
-- Pairing (service_role only — called by the `pairing` Edge Function)
-- -----------------------------------------------------------------------------

create or replace function public.pairing_create(p_user uuid, p_code_hash text, p_ttl_seconds int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.workspace_members;
  v_expires timestamptz := now() + make_interval(secs => least(greatest(p_ttl_seconds, 60), 3600));
begin
  select * into v_member from public.workspace_members where user_id = p_user and revoked_at is null;
  if not found then raise exception 'not_member'; end if;
  -- Rotation: any older unredeemed code for this workspace stops working.
  update public.workspace_pairing_codes set invalidated_at = now()
  where workspace_id = v_member.workspace_id and redeemed_at is null and invalidated_at is null;
  insert into public.workspace_pairing_codes (workspace_id, code_hash, created_by, expires_at)
  values (v_member.workspace_id, p_code_hash, p_user, v_expires);
  insert into public.activity_history (workspace_id, action_type, device_id, notes)
  values (v_member.workspace_id, 'pairing_code_regenerated', v_member.device_id, 'New pairing code generated');
  return jsonb_build_object('workspace_id', v_member.workspace_id, 'expires_at', v_expires);
end;
$$;

create or replace function public.pairing_redeem(
  p_user uuid, p_code_hash text, p_device_id text, p_device_label text, p_ip_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.workspace_pairing_codes;
  v_current public.workspace_members;
  v_failures int;
  v_label text := left(coalesce(nullif(p_device_label, ''), 'Device'), 80);
begin
  select count(*) into v_failures from public.pairing_attempts
  where success = false and created_at > now() - interval '15 minutes'
    and (user_id = p_user or (p_ip_hash is not null and ip_hash = p_ip_hash));
  if v_failures >= 5 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  select * into v_code from public.workspace_pairing_codes
  where code_hash = p_code_hash and redeemed_at is null and invalidated_at is null and expires_at > now()
  for update;
  if not found then
    insert into public.pairing_attempts (user_id, ip_hash, success) values (p_user, p_ip_hash, false);
    return jsonb_build_object('status', 'invalid', 'remaining_attempts', greatest(0, 4 - v_failures));
  end if;

  update public.workspace_pairing_codes set redeemed_at = now(), redeemed_by = p_user where id = v_code.id;

  select * into v_current from public.workspace_members where user_id = p_user and revoked_at is null;
  if found and v_current.workspace_id = v_code.workspace_id then
    insert into public.pairing_attempts (user_id, ip_hash, success) values (p_user, p_ip_hash, true);
    return jsonb_build_object('status', 'ok', 'workspace_id', v_code.workspace_id);
  end if;
  if found then
    -- Leave the device's previous workspace; delete it if it was an empty, single-device workspace.
    update public.workspace_members set revoked_at = now(), revoked_by = p_user where id = v_current.id;
    if not exists (select 1 from public.workspace_members where workspace_id = v_current.workspace_id and revoked_at is null)
       and not exists (select 1 from public.video_progress where workspace_id = v_current.workspace_id)
       and not exists (select 1 from public.day_skips where workspace_id = v_current.workspace_id)
       and not exists (select 1 from public.prompt_progress where workspace_id = v_current.workspace_id) then
      delete from public.workspaces where id = v_current.workspace_id;
    end if;
  end if;

  insert into public.workspace_members (workspace_id, user_id, device_id, device_label, role)
  values (v_code.workspace_id, p_user, p_device_id, v_label, 'member');
  insert into public.pairing_attempts (user_id, ip_hash, success) values (p_user, p_ip_hash, true);
  insert into public.activity_history (workspace_id, action_type, device_id, notes)
  values (v_code.workspace_id, 'device_connected', p_device_id, 'Connected: ' || v_label);
  return jsonb_build_object('status', 'ok', 'workspace_id', v_code.workspace_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.current_workspace_id() to authenticated;
grant execute on function public.derive_production_status(jsonb, text) to authenticated;
grant execute on function public.get_my_membership() to authenticated;
grant execute on function public.create_workspace(text, text, boolean) to authenticated;
grant execute on function public.touch_device(text) to authenticated;
grant execute on function public.revoke_device(uuid) to authenticated;
grant execute on function public.apply_ops(jsonb) to authenticated;
grant execute on function public.reset_progress(text) to authenticated;
grant execute on function public.import_backup(jsonb, text) to authenticated;

grant execute on function public.pairing_create(uuid, text, int) to service_role;
grant execute on function public.pairing_redeem(uuid, text, text, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Realtime (postgres_changes respects the RLS select policies above)
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.video_progress,
  public.day_skips,
  public.prompt_progress,
  public.workspace_settings,
  public.workspace_members,
  public.activity_history;
