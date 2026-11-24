-- Hybrid privacy boundary:
-- Admins manage accounts and academic configuration, but cannot read
-- or mutate individual student attendance records.
-- Students can read only their own records. Attendance writes remain
-- available only through the validated mark_my_attendance RPC.

drop policy if exists "attendance_select_self_or_admin" on public.attendance_records;
drop policy if exists "attendance_admin_manage" on public.attendance_records;
drop policy if exists "attendance_insert_own" on public.attendance_records;
drop policy if exists "attendance_update_own" on public.attendance_records;

create policy "attendance_select_own_only"
on public.attendance_records for select to authenticated
using (
  student_id = (select auth.uid())
  and public.is_approved_student()
);

-- Explicitly deny direct browser writes. The SECURITY DEFINER RPC from
-- migration 003 remains the only supported write path.
revoke insert, update, delete on public.attendance_records from anon, authenticated;
grant select on public.attendance_records to authenticated;

-- Cancellation review remains an administrative workflow. It operates on
-- the cohort-wide class session, not on an individual attendance record.
