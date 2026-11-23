-- AttendSphere security follow-up
-- Admin approval/rejection must use a narrowly scoped SECURITY DEFINER RPC.
-- This avoids granting broad profile-column update rights to the browser client.

create or replace function public.admin_review_registration(
  p_student_id uuid,
  p_decision public.approval_status
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_profile public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_decision not in (
    'approved'::public.approval_status,
    'rejected'::public.approval_status
  ) then
    raise exception 'Decision must be approved or rejected';
  end if;

  update public.profiles
  set approval_status = p_decision
  where id = p_student_id
    and role = 'student'::public.app_role
    and approval_status = 'pending'::public.approval_status
  returning * into reviewed_profile;

  if not found then
    raise exception 'Pending student registration not found';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, after_data, reason
  )
  values (
    (select auth.uid()),
    case when p_decision = 'approved'::public.approval_status
      then 'student_registration_approved'
      else 'student_registration_rejected'
    end,
    'profile',
    p_student_id,
    jsonb_build_object(
      'id', reviewed_profile.id,
      'role', reviewed_profile.role,
      'approval_status', reviewed_profile.approval_status
    ),
    'Admin registration review'
  );

  return reviewed_profile;
end;
$$;

revoke all on function public.admin_review_registration(uuid, public.approval_status) from public, anon;
grant execute on function public.admin_review_registration(uuid, public.approval_status) to authenticated;
