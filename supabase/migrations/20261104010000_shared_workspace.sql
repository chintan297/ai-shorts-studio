-- =============================================================================
-- Optional "shared workspace" mode: one workspace that every device joins automatically
-- (no pairing code). Enabled in the app with NEXT_PUBLIC_SHARED_WORKSPACE=true.
-- Trade-off (chosen by the owner): anyone who opens the site joins this workspace.
-- Pairing-code mode keeps working for personal workspaces.
-- =============================================================================

alter table public.workspaces add column is_shared boolean not null default false;
-- At most one shared workspace can exist.
create unique index workspaces_single_shared on public.workspaces (is_shared) where is_shared;

do $$
declare
  v_ws uuid;
begin
  if not exists (select 1 from public.workspaces where is_shared) then
    insert into public.workspaces (name, is_shared) values ('My Workspace', true) returning id into v_ws;
    insert into public.workspace_settings (workspace_id) values (v_ws);
    insert into public.activity_history (workspace_id, action_type, notes)
    values (v_ws, 'workspace_created', 'Shared workspace created');
  end if;
end $$;

-- Membership now also reports whether the active workspace is the shared one.
create or replace function public.get_my_membership()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.workspace_members;
  v_shared boolean;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'none'); end if;
  select * into v_member from public.workspace_members where user_id = auth.uid() and revoked_at is null;
  if found then
    select w.is_shared into v_shared from public.workspaces w where w.id = v_member.workspace_id;
    return jsonb_build_object('status', 'active', 'workspace_id', v_member.workspace_id,
                              'member_id', v_member.id, 'role', v_member.role, 'shared', coalesce(v_shared, false));
  end if;
  if exists (select 1 from public.workspace_members where user_id = auth.uid()) then
    return jsonb_build_object('status', 'revoked');
  end if;
  return jsonb_build_object('status', 'none');
end;
$$;

-- Joins (or re-joins) the shared workspace. A device leaves any personal workspace it was in;
-- an empty, single-device personal workspace is deleted.
create or replace function public.join_shared_workspace(p_device_id text, p_device_label text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_shared uuid;
  v_current public.workspace_members;
  v_member public.workspace_members;
  v_label text := left(coalesce(nullif(p_device_label, ''), 'Device'), 80);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select id into v_shared from public.workspaces where is_shared;
  if v_shared is null then raise exception 'no_shared_workspace'; end if;

  select * into v_current from public.workspace_members where user_id = v_uid and revoked_at is null;
  if found and v_current.workspace_id = v_shared then
    update public.workspace_members set last_active_at = now() where id = v_current.id;
    return jsonb_build_object('workspace_id', v_shared, 'member_id', v_current.id, 'joined', false);
  end if;

  if found then
    update public.workspace_members set revoked_at = now(), revoked_by = v_uid where id = v_current.id;
    if not exists (select 1 from public.workspace_members where workspace_id = v_current.workspace_id and revoked_at is null)
       and not exists (select 1 from public.video_progress where workspace_id = v_current.workspace_id)
       and not exists (select 1 from public.day_skips where workspace_id = v_current.workspace_id)
       and not exists (select 1 from public.prompt_progress where workspace_id = v_current.workspace_id) then
      delete from public.workspaces where id = v_current.workspace_id and not is_shared;
    end if;
  end if;

  insert into public.workspace_members (workspace_id, user_id, device_id, device_label, role)
  values (v_shared, v_uid, left(coalesce(p_device_id, ''), 64), v_label, 'member')
  returning * into v_member;
  insert into public.activity_history (workspace_id, action_type, device_id, notes)
  values (v_shared, 'device_connected', left(coalesce(p_device_id, ''), 64), 'Connected: ' || v_label);
  return jsonb_build_object('workspace_id', v_shared, 'member_id', v_member.id, 'joined', true);
end;
$$;

revoke execute on function public.join_shared_workspace(text, text) from public, anon;
grant execute on function public.join_shared_workspace(text, text) to authenticated;
