# AttendSphere — Architecture

## Components
- React + Vite + TypeScript single-page application.
- Supabase Auth for identity and session management.
- PostgreSQL for academic configuration, dated sessions, personal attendance and audit history.
- Row Level Security (RLS) as the authorization boundary.
- Vercel for frontend hosting.

## Roles and trust boundaries

### Super-admin
Can manage registration approvals, subject catalogue, academic calendar, recurring timetable entries, dated class sessions and cohort-wide cancellations. Admin access does not include individual attendance rows or personal analytics.

### Student
Can read academic configuration and cohort class sessions, and can read only their own attendance records. Attendance writes use the validated `mark_my_attendance` database function. A student cannot change another student's data or cancel a cohort session.

## Data model
- `profiles`: Auth-linked identity, full name, role and approval status.
- `subjects`: subject code, name, category, semester and active status.
- `timetable_entries`: recurring weekday/time patterns and effective dates.
- `academic_calendar_events`: teaching days, holidays, vacations, exams and exclusions.
- `class_sessions`: dated instances generated from timetable entries; cancellation is cohort-wide.
- `attendance_records`: one Present/Absent row per student and dated session.
- `cancellation_requests`: student-submitted reports reviewed by admin.
- `audit_logs`: administrative actions and reasons.

## Attendance privacy
RLS on `attendance_records` permits SELECT only when `student_id = auth.uid()` and the caller is an approved student. Admin policies and direct write grants are removed. The browser can write attendance only by calling the narrowly scoped SECURITY DEFINER `mark_my_attendance` function, which validates the approved student's identity and scheduled session.

Admin cancellation review operates on `class_sessions` and `cancellation_requests`; it must not query or expose attendance rows.

## Scheduling and calculations
A weekly timetable entry is a template, not proof that a class occurred. Generate dated class sessions using the confirmed academic calendar. Historical sessions remain stable if future timetable entries change. Calculate a student's finalized percentage from their own Present and Absent rows; display unmarked scheduled sessions separately. Exclude admin-confirmed cancelled sessions from the denominator.

## Security principles
1. New Auth users are always pending students; never trust client metadata for role assignment.
2. Never expose a Supabase service-role key in browser code.
3. Enforce permissions in RLS/database functions, not only frontend route guards.
4. Keep historical sessions stable.
5. Do not generate fake attendance or timetable data.
6. Keep student attendance private from admins and other students.
