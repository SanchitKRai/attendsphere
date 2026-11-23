# AttendSphere

A secure, multi-user attendance management system for B.Sc. Life Sciences Semester IV students.

## Product scope

- Student accounts require admin approval before access.
- One super-admin manages students, subjects, timetable, academic calendar, class sessions, cancellations and reports.
- Students can mark their scheduled classes as Present or Absent.
- Students may report a class cancellation; it remains pending until the admin reviews it.
- Admin-confirmed cancellations are excluded from the attendance denominator.
- Attendance warning threshold: 70% (configurable).
- Timetable is intentionally not configured yet. It will be entered once the college releases it after Semester III examinations.

## Planned stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL + Row Level Security
- Recharts
- Vercel

## Development principles

1. The database is the source of truth; never calculate historical attendance from the current weekly timetable.
2. Generate dated class sessions from timetable entries and the academic calendar.
3. A student must never be able to grant themselves an admin role, approve their own account, or read another student's private attendance.
4. Every admin correction to attendance or a cancellation must be auditable.
5. Do not commit secrets. Use environment variables and a local `.env` file (ignored by Git).
6. Do not seed fake attendance records or claim that sample dashboard numbers are real.

## Repository status

Project initialized. Application code, database migrations and tests will be added in subsequent milestones.

## Local development (after app scaffold is added)

```bash
npm install
npm run dev
```

## Environment variables

The client will use only the Supabase project URL and anon/publishable key:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never expose a Supabase service-role key in client code.
