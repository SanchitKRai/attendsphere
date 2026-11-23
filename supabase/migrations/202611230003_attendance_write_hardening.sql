-- AttendSphere security hardening: attendance writes must go through the validated RPC.
-- Apply after 202611230002_admin_approval_rpc.sql.

drop policy if exists "attendance_insert_own" on public.attendance_records;
drop policy if exists "attendance_update_own" on public.attendance_records;

revoke insert, update, delete on public.attendance_records from anon, authenticated;

-- SECURITY DEFINER is required because direct table write privileges are removed.
-- The function performs its own identity, approval, and session-status checks.
create or replace function public.mark_my_attendance(
  p_class_session_id uuid,
  p_status public.attendance_status
)
returns public.attendance_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.class_sessions%rowtype;
  saved_record public.attendance_records%rowtype;
begin
  if not public.is_approved_student() then
    raise exception 'Approved student account required';
  end if;

  select * into session_row
  from public.class_sessions
  where id = p_class_session_id
  for update;

  if not found then
    raise exception 'Class session not found';
  end if;

  if session_row.status <> 'scheduled' then
    raise exception 'Cancelled sessions cannot receive attendance';
  end if;

  insert into public.attendance_records (
    class_session_id, student_id, status, updated_by
  )
  values (
    p_class_session_id, (select auth.uid()), p_status, (select auth.uid())
  )
  on conflict (class_session_id, student_id)
  do update set
    status = excluded.status,
    marked_at = now(),
    updated_at = now(),
    updated_by = (select auth.uid())
  returning * into saved_record;

  return saved_record;
end;
$$;

revoke all on function public.mark_my_attendance(uuid, public.attendance_status) from public, anon;
grant execute on function public.mark_my_attendance(uuid, public.attendance_status) to authenticated;
