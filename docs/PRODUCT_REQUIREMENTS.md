# AttendSphere — Product Requirements

## Confirmed product direction

| Area | Decision |
|---|---|
| Institution context | B.Sc. Life Sciences, Semester IV |
| Academic year | 2027 (planned; verify actual college dates before generating sessions) |
| Subjects | 7 total: 3 core + SEC + VAC + AEC + GE/DSE |
| Attendance warning | Below 70% default; student target is personal |
| Admin model | One super-admin |
| Student onboarding | Student submits registration; admin approves |
| Timetable | Admin configures manually after official timetable is released |
| Privacy model | Hybrid academic administration + private student attendance |

## Roles

### Student
- Submit registration request and sign in after admin approval.
- Complete personal onboarding preferences (semester/subjects/target/timetable view) where supported.
- View own dashboard, subjects, scheduled classes and attendance history.
- Mark own scheduled class Present or Absent.
- Correct/update own attendance entry through the validated attendance RPC.
- Report a class cancellation; report is pending admin review.
- View own subject-wise and overall attendance, analytics, prediction and exportable report.
- Cannot read another student's attendance or personal analytics.

### Super-admin
- View registration requests and approve/reject them.
- Manage student account status and academic configuration.
- Manage subject catalogue, academic dates and recurring timetable.
- Generate dated class sessions.
- Cancel a class for the cohort.
- Review student-reported cancellation requests and record a decision.
- View operational configuration and registration counts.
- Must not view, search, export, correct or otherwise access individual attendance records, attendance percentages, student attendance histories or personal analytics.

## Attendance rules

For a subject or reporting period:

`attendance percentage = present sessions / (present sessions + absent sessions) * 100`

Where:
- Present = attended conducted session.
- Absent = missed conducted session.
- Cancelled = admin-confirmed cancelled session, excluded from the denominator.
- Pending/unmarked = not yet marked; separately displayed and excluded from finalized percentage.
- Pending cancellation requests do not change the session's status or denominator.
- A confirmed cancellation is a property of the cohort session, not an individual student's absence.

## Scheduling principles
- Timetable entries describe recurring weekday/time patterns.
- Class sessions are dated instances generated from timetable entries.
- Academic calendar exclusions are configurable by the admin and based on confirmed college closures.
- Restricted holidays must not automatically cancel classes.
- Timetable changes must not rewrite past class sessions.
- Avoid duplicate generated sessions for the same timetable entry and date.
- Do not seed timetable or attendance examples as real data.

## Security requirements
- Use Supabase Auth for identity.
- Store role and approval state in a protected profile table.
- Users cannot update their own role or approval state.
- Admin authorization is enforced by PostgreSQL RLS and trusted database functions.
- Students can select only their own attendance rows.
- Admins have no SELECT, INSERT, UPDATE or DELETE access to individual attendance rows.
- Student attendance writes go through the validated `mark_my_attendance` RPC.
- Admins can manage cohort sessions and cancellation requests without access to attendance records.
- Never put a service-role key in the browser.

## Out of scope
- GPS, face recognition or device tracking.
- Public student directory.
- Automatic timetable import before it is supplied.
- Fabricated sample student data presented as actual records.
- Faculty access to personal attendance data or institution-wide student attendance reporting.
