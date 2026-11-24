# Architecture Decision Records

## ADR-001: Separate recurring timetable from dated class sessions

**Status:** Accepted

A weekly timetable entry is a template, not evidence that a class actually occurred. Generate one dated class-session record for each eligible date. Attendance attaches to the dated session.

**Reason:** Holidays, vacations, timetable changes and cancellations must be represented accurately, and historical attendance must not change when the weekly timetable is edited.

## ADR-002: Cancellation is cohort-wide and requires admin confirmation

**Status:** Accepted

A student may submit a cancellation report, but it remains pending until admin review. An admin may cancel a session for the cohort. The cancelled session is excluded from attendance calculations for all students.

## ADR-003: Student registration requires approval

**Status:** Accepted

New registrations remain pending until approved by the super-admin. Role assignment is controlled by trusted database logic.

## ADR-004: Attendance warning threshold defaults to 70%

**Status:** Accepted

The default warning threshold is 70%, with the intention to make it configurable by the admin.

## ADR-005: Timetable data is deferred

**Status:** Accepted

No recurring timetable entries or dated attendance sessions will be generated until the real Semester IV timetable is received and configured.

## ADR-006: Hybrid administration with private personal attendance

**Status:** Accepted

The super-admin manages registration approvals, student account status, subjects, academic calendar, recurring timetable entries, dated cohort sessions and cohort-wide class cancellations. Students control their own attendance entries and can view their own history, calculations, analytics and reports.

The super-admin must not read, export, correct or otherwise access individual attendance records or personal attendance analytics. PostgreSQL RLS enforces this boundary; hiding attendance screens in the frontend is not sufficient. Admin review of a class-cancellation report may reveal the report and its reason, but must not expose the student's attendance history.

**Reason:** Retain useful institutional setup and scheduling workflows without turning a personal attendance tracker into a faculty surveillance/reporting system.
