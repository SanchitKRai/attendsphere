# AttendSphere — Initial Architecture

## High-level components

- React SPA: student and admin experiences.
- Supabase Auth: authentication and sessions.
- PostgreSQL: academic configuration, timetable, dated sessions, attendance and audit history.
- RLS: authorization boundary for all client-accessible tables.
- Vercel: frontend hosting.

## Proposed data model

### profiles
- id (UUID, primary key, references auth.users)
- full_name
- student_identifier (nullable until institution's preferred identifier is known)
- role: student | admin
- approval_status: pending | approved | rejected
- created_at, updated_at

Role and approval fields must be assigned/changed only by an authorized admin or a trusted database trigger/function.

### subjects
- id
- code (optional)
- name
- category: CORE | SEC | VAC | AEC | GE_DSE
- semester_number
- is_active
- created_at, updated_at

There should be exactly seven active subject slots for the initial Semester IV configuration once all four additional subject names are supplied. Names for SEC, VAC, AEC and GE/DSE are not yet known.

### timetable_entries
- id
- subject_id
- weekday (1–7)
- start_time
- end_time
- class_type: theory | practical | tutorial | other
- venue (nullable)
- effective_from
- effective_until (nullable)
- is_active
- created_by, created_at, updated_at

No actual entries should be seeded before the timetable is received.

### academic_calendar_events
- id
- title
- event_type: teaching_day | vacation | college_holiday | exam | preparation_leave | other
- start_date
- end_date
- excludes_classes (boolean)
- notes
- created_by, created_at, updated_at

Calendar dates supplied in initial discussions are provisional until the official applicable semester calendar is confirmed.

### class_sessions
- id
- timetable_entry_id (nullable for one-off sessions)
- subject_id
- session_date
- start_time
- end_time
- class_type
- status: scheduled | cancelled
- cancellation_reason (nullable)
- cancellation_confirmed_by (nullable)
- cancellation_confirmed_at (nullable)
- created_at, updated_at

Add a uniqueness constraint preventing duplicate generated sessions for the same timetable entry and date.

### attendance_records
- id
- class_session_id
- student_id
- status: present | absent
- marked_at
- updated_at
- updated_by
- unique(class_session_id, student_id)

Cancelled is stored on the cohort-wide class_session, not duplicated as per-student attendance.

### cancellation_requests
- id
- class_session_id
- requested_by
- reason
- status: pending | approved | rejected
- reviewed_by (nullable)
- reviewed_at (nullable)
- review_note (nullable)
- created_at

### audit_logs
- id
- actor_id
- action
- entity_type
- entity_id
- before_data (JSONB)
- after_data (JSONB)
- reason
- created_at

## Important implementation notes

1. A student registration request must not create an approved student identity by trusting client-supplied role values.
2. An initial safe implementation can require admin-created invite/approval flow. If open sign-up is enabled, new profiles must default to role=student and approval_status=pending via a trusted trigger; clients must not be able to override those fields.
3. Attendance percentage queries should exclude cancelled sessions and distinguish finalized records from pending/unmarked sessions.
4. Historical class sessions must remain stable if timetable entries are edited later.
5. The super-admin bootstrap procedure must be documented and must not rely on a public sign-up form granting admin access.
