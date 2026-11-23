# Supabase setup

1. Create a new Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/migrations/202611230001_initial_schema.sql`.
4. Create your own account using Supabase Auth (email/password).
5. In SQL Editor, run the documented bootstrap UPDATE at the bottom of the migration, replacing `YOUR_AUTH_EMAIL` with your account's exact email. This is a one-time privileged operation performed by the project owner.
6. Configure Auth email confirmation and allowed redirect URLs before enabling real student registration.
7. Copy the project URL and anon/publishable key into your local `.env` file. Never use the service-role key in frontend code.

## Important

The migration establishes the initial RLS boundary and core attendance RPCs. Before opening student registration to a real cohort, test the policies using separate admin, approved-student, pending-student and unauthenticated accounts. Add automated database-policy tests in a follow-up milestone.
