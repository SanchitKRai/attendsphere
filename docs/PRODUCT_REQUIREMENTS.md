# AttendSphere — Product Requirements

## Confirmed decisions

| Area | Decision |
|---|---|
| Institution context | B.Sc. Life Sciences, Semester IV |
| Academic year | 2027 (planned; verify actual college dates before generating sessions) |
| Subjects | 7 total: 3 core + SEC + VAC + AEC + GE/DSE |
| Attendance warning | Below 70% |
| Admin model | One super-admin |
| Student onboarding | Student submits registration; admin approves |
| Timetable | Not available yet; configured manually later |

## Roles

### Student
- Submit registration request.
- Sign in only after approval.
- View own dashboard and own attendance history.
- View scheduled classes for the day.
- Mark a scheduled class Present or Absent.
- Report a class cancellation; report is pending admin review.
- View subject-wise and overall attendance.

### Super-admin
- View registration requests and approve/reject them.
- Manage student accounts and subject catalogue.
- Configure weekly timetable once released.
- Configure academic dates, official holidays and vacations.
- Generate dated class sessions.
- Cancel a class for the cohort.
- Review student-reported cancellation requests.
- Correct attendance with a required reason and audit entry.
- View/filter cohort attendance and export CSV reports.

## Attendance rules

For a subject or reporting period:

`attendance percentage = present sessions / (conducted sessions) * 100`

Where:
- Present = attended conducted session.
- Absent = missed conducted session.
- Cancelled = admin-confirmed cancelled session, excluded from the denominator.
- Pending = not yet marked; does not count as Present or Absent. The interface must show it clearly.
- Pending cancellation requests do not change the session's attendance status or denominator.
- A confirmed cancellation is a property of the cohort session, not an individual student's absence.

The precise denominator policy for pending/unmarked sessions must be reflected in reports. Recommended default: calculate percentage only over finalized Present + Absent sessions, while separately displaying unmarked scheduled sessions so the percentage cannot hide incomplete records.

## Scheduling principles

- Timetable entries describe recurring weekday/time patterns.
- Class sessions are dated instances generated from timetable entries.
- Academic calendar exclusions must be configurable by the admin and based on confirmed college closures.
- Restricted holidays must not automatically cancel classes.
- Timetable changes must not rewrite past class sessions.
- Avoid duplicate generated sessions for the same timetable entry and date.

## Security requirements

- Use Supabase Auth for identity.
- Store role and approval state in a protected profile table.
- Users cannot update their own role or approval state.
- Admin authorization must be enforced by PostgreSQL Row Level Security (RLS), not only by hiding frontend routes.
- Students can read and modify only their own attendance records, subject to session rules.
- Students cannot modify a session-wide cancellation directly.
- Admin-only mutations should be implemented with database policies and carefully scoped server-side functions where needed.
- Audit attendance corrections and admin cancellation decisions.
- Never put a service-role key in the browser.

## Out of scope for initial milestone

- Automated attendance through GPS, face recognition or device tracking.
- Public student directory.
- Automatic import of a timetable before it is supplied.
- Fabricated sample student data presented as actual records.
