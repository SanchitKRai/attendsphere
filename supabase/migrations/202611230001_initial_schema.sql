-- AttendSphere initial schema
-- Apply in a new Supabase project using the SQL Editor.
-- This migration is intentionally timetable-agnostic: no timetable/session seed data.

create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'admin');
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.subject_category as enum ('CORE', 'SEC', 'VAC', 'AEC', 'GE_DSE');
create type public.class_type as enum ('theory', 'practical', 'tutorial', 'other');
create type public.calendar_event_type as enum (
  'teaching_day', 'vacation', 'college_holiday', 'exam',
  'preparation_leave', 'other'
);
create type public.session_status as enum ('scheduled', 'cancelled');
create type public.attendance_status as enum ('present', 'absent');
create type public.cancellation_request_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  student_identifier text unique,
  role public.app_role not null default 'student',
  approval_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null check (char_length(trim(name)) between 2 and 200),
  category public.subject_category not null,
  semester_number smallint not null default 4 check (semester_number between 1 and 12),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  class_type public.class_type not null,
  venue text,
  effective_from date not null,
  effective_until date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_valid_time check (end_time > start_time),
  constraint timetable_valid_dates check (effective_until is null or effective_until >= effective_from)
);

create table public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 200),
  event_type public.calendar_event_type not null,
  start_date date not null,
  end_date date not null,
  excludes_classes boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_valid_dates check (end_date >= start_date)
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  timetable_entry_id uuid references public.timetable_entries(id) on delete set null,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  class_type public.class_type not null,
  status public.session_status not null default 'scheduled',
  cancellation_reason text,
  cancellation_confirmed_by uuid references public.profiles(id) on delete set null,
  cancellation_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_valid_time check (end_time > start_time),
  constraint session_cancellation_metadata check (
    (status = 'scheduled' and cancellation_confirmed_at is null)
    or (status = 'cancelled' and cancellation_confirmed_at is not null)
  )
);

create unique index class_sessions_timetable_date_unique
  on public.class_sessions(timetable_entry_id, session_date)
  where timetable_entry_id is not null;

create index class_sessions_date_idx on public.class_sessions(session_date);
create index class_sessions_subject_date_idx on public.class_sessions(subject_id, session_date);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  status public.attendance_status not null,
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (class_session_id, student_id)
);

create index attendance_student_idx on public.attendance_records(student_id);
create index attendance_session_idx on public.attendance_records(class_session_id);

create table public.cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  status public.cancellation_request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  constraint cancellation_review_metadata check (
    (status = 'pending' and reviewed_at is null)
    or (status <> 'pending' and reviewed_at is not null)
  )
);

create index cancellation_requests_status_idx on public.cancellation_requests(status);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- Keep updated_at consistent.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function public.set_updated_at();
create trigger timetable_entries_set_updated_at before update on public.timetable_entries
for each row execute function public.set_updated_at();
create trigger academic_calendar_events_set_updated_at before update on public.academic_calendar_events
for each row execute function public.set_updated_at();
create trigger class_sessions_set_updated_at before update on public.class_sessions
for each row execute function public.set_updated_at();
create trigger attendance_records_set_updated_at before update on public.attendance_records
for each row execute function public.set_updated_at();

-- Privileged check is SECURITY DEFINER to avoid RLS recursion on profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.app_role
      and p.approval_status = 'approved'::public.approval_status
  );
$$;

create or replace function public.is_approved_student()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'student'::public.app_role
      and p.approval_status = 'approved'::public.approval_status
  );
$$;

-- New Auth users are always pending students. Client metadata cannot assign roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'New student'
  );

  insert into public.profiles (id, full_name, role, approval_status)
  values (new.id, requested_name, 'student', 'pending');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A user cannot modify privileged fields on their own profile.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id
     and not public.is_admin()
     and (
       new.role is distinct from old.role
       or new.approval_status is distinct from old.approval_status
       or new.student_identifier is distinct from old.student_identifier
     ) then
    raise exception 'You cannot change role, approval status, or student identifier';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Secure RPC for a student to mark only their own scheduled class attendance.
create or replace function public.mark_my_attendance(
  p_class_session_id uuid,
  p_status public.attendance_status
)
returns public.attendance_records
language plpgsql
security invoker
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

-- A student may report a cancellation, but cannot cancel a cohort session.
create or replace function public.report_class_cancellation(
  p_class_session_id uuid,
  p_reason text
)
returns public.cancellation_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_row public.class_sessions%rowtype;
  request_row public.cancellation_requests%rowtype;
begin
  if not public.is_approved_student() then
    raise exception 'Approved student account required';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Please provide a cancellation reason';
  end if;

  select * into session_row
  from public.class_sessions
  where id = p_class_session_id;

  if not found or session_row.status <> 'scheduled' then
    raise exception 'Scheduled class session not found';
  end if;

  insert into public.cancellation_requests (
    class_session_id, requested_by, reason
  )
  values (
    p_class_session_id, (select auth.uid()), trim(p_reason)
  )
  returning * into request_row;

  return request_row;
end;
$$;

-- Admin can confirm a cancellation for the whole cohort.
create or replace function public.admin_cancel_class_session(
  p_class_session_id uuid,
  p_reason text
)
returns public.class_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_row public.class_sessions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.class_sessions
  set status = 'cancelled',
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), ''),
      cancellation_confirmed_by = (select auth.uid()),
      cancellation_confirmed_at = now(),
      updated_at = now()
  where id = p_class_session_id
  returning * into session_row;

  if not found then
    raise exception 'Class session not found';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, reason
  )
  values (
    (select auth.uid()), 'class_cancelled', 'class_session',
    p_class_session_id, to_jsonb(session_row), p_reason
  );

  return session_row;
end;
$$;

-- Enable RLS on every application table.
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.academic_calendar_events enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.cancellation_requests enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: students see their own profile; admin sees cohort profiles.
create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_admin"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Subjects: approved students can view active semester subjects; admin manages.
create policy "subjects_select_approved"
on public.subjects for select to authenticated
using (
  public.is_admin()
  or (public.is_approved_student() and is_active = true)
);
create policy "subjects_admin_manage"
on public.subjects for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Timetable and calendar are visible to approved students and admin.
create policy "timetable_select_approved"
on public.timetable_entries for select to authenticated
using (public.is_admin() or (public.is_approved_student() and is_active = true));
create policy "timetable_admin_manage"
on public.timetable_entries for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "calendar_select_approved"
on public.academic_calendar_events for select to authenticated
using (public.is_admin() or public.is_approved_student());
create policy "calendar_admin_manage"
on public.academic_calendar_events for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Students see all cohort sessions; only admin can create/update/cancel sessions.
create policy "sessions_select_approved"
on public.class_sessions for select to authenticated
using (public.is_admin() or public.is_approved_student());
create policy "sessions_admin_manage"
on public.class_sessions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Attendance: student sees own records only; admin sees all.
create policy "attendance_select_self_or_admin"
on public.attendance_records for select to authenticated
using (student_id = (select auth.uid()) or public.is_admin());

-- The RPC is the supported write interface for students.
create policy "attendance_insert_own"
on public.attendance_records for insert to authenticated
with check (
  student_id = (select auth.uid())
  and public.is_approved_student()
);
create policy "attendance_update_own"
on public.attendance_records for update to authenticated
using (student_id = (select auth.uid()) and public.is_approved_student())
with check (student_id = (select auth.uid()) and public.is_approved_student());
create policy "attendance_admin_manage"
on public.attendance_records for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Cancellation request submitter sees own request; admins see all.
create policy "cancellation_requests_select_self_or_admin"
on public.cancellation_requests for select to authenticated
using (requested_by = (select auth.uid()) or public.is_admin());
create policy "cancellation_requests_insert_own"
on public.cancellation_requests for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and public.is_approved_student()
  and status = 'pending'
);
create policy "cancellation_requests_admin_update"
on public.cancellation_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Audit records are visible only to admin and are append-only from app roles.
create policy "audit_logs_select_admin"
on public.audit_logs for select to authenticated
using (public.is_admin());
create policy "audit_logs_insert_admin"
on public.audit_logs for insert to authenticated
with check (public.is_admin());

-- Explicit table privileges complement RLS.
revoke all on public.profiles from anon, authenticated;
revoke all on public.subjects from anon, authenticated;
revoke all on public.timetable_entries from anon, authenticated;
revoke all on public.academic_calendar_events from anon, authenticated;
revoke all on public.class_sessions from anon, authenticated;
revoke all on public.attendance_records from anon, authenticated;
revoke all on public.cancellation_requests from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.timetable_entries to authenticated;
grant select, insert, update, delete on public.academic_calendar_events to authenticated;
grant select, insert, update, delete on public.class_sessions to authenticated;
grant select, insert, update on public.attendance_records to authenticated;
grant select, insert, update on public.cancellation_requests to authenticated;
grant select, insert on public.audit_logs to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved_student() to authenticated;
grant execute on function public.mark_my_attendance(uuid, public.attendance_status) to authenticated;
grant execute on function public.report_class_cancellation(uuid, text) to authenticated;
grant execute on function public.admin_cancel_class_session(uuid, text) to authenticated;

-- Bootstrap the first super-admin manually after creating the first Auth user.
-- Replace the email below with the exact account you control, then run:
--
-- update public.profiles p
-- set role = 'admin', approval_status = 'approved'
-- from auth.users u
-- where p.id = u.id and u.email = 'YOUR_AUTH_EMAIL';
--
-- Do not expose this operation through a public client/API.
