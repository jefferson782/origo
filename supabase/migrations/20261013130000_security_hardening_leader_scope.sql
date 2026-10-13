-- Security hardening
--
-- Problem found: the "manage" policies for departments/services/assignments/
-- notifications/songs and the user_roles write policies all gate on
-- can_manage_church(church_id), which returned true for role IN ('admin','leader').
-- Because that check only looked at church_id (not department_id), ANY
-- department leader effectively had admin rights over the WHOLE church
-- (could create/delete any department, service, assignment, or notification
-- church-wide), contradicting the app's own stated design ("Líderes só
-- conseguem gerenciar o próprio departamento").
--
-- Worse: the user_roles INSERT policy ("managers assign dept leaders") only
-- checked can_manage_church(church_id) and never restricted which `role`
-- value was being written. Since has_role()/can_manage_church() do not scope
-- by church_id when checking 'super_admin', any leader or admin could insert
-- a row for themselves with role = 'super_admin' and instantly gain
-- super-admin rights over the entire platform (all churches). This migration
-- closes that privilege-escalation hole and re-scopes leaders to their own
-- department, while preserving every behavior admins/super_admins already had.

-- 1) can_manage_church now only grants church-wide management to admins
--    (and super_admins, via has_role). Leaders are handled separately via
--    can_manage_department(), which already correctly scopes to their own
--    department (or falls back to can_manage_church for admins).
CREATE OR REPLACE FUNCTION public.can_manage_church(_church_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND church_id = _church_id
        AND role = 'admin'::app_role
    )
$$;

-- 2) Assignments: department leaders keep the ability to manage assignments,
--    but now only for their own department. Admins/super_admins are unaffected.
DROP POLICY IF EXISTS "manage church assignments" ON public.assignments;
CREATE POLICY "manage church assignments" ON public.assignments FOR ALL TO authenticated
  USING (
    EXISTS(SELECT 1 FROM public.services s WHERE s.id = service_id AND public.can_manage_church(s.church_id))
    OR public.can_manage_department(department_id)
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.services s WHERE s.id = service_id AND public.can_manage_church(s.church_id))
    OR public.can_manage_department(department_id)
  );

-- 3) Profiles/roles read access for leaders is unchanged in practice (leaders
--    still need to see the church roster to pick volunteers for their
--    department) — restated explicitly now that can_manage_church() no
--    longer covers leaders, so this doesn't silently regress.
DROP POLICY IF EXISTS "leaders view church profiles" ON public.profiles;
CREATE POLICY "leaders view church profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    church_id = public.current_user_church()
    AND (
      public.can_manage_church(church_id)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'leader' AND ur.church_id = profiles.church_id
      )
    )
  );

-- 4) user_roles visibility: the "who leads what department" list is an
--    admin-level view now (consistent with only admins being able to
--    promote/demote leaders below).
DROP POLICY IF EXISTS "leaders view church roles" ON public.user_roles;
CREATE POLICY "admins view church roles" ON public.user_roles FOR SELECT TO authenticated
  USING (church_id = public.current_user_church() AND public.can_manage_church(church_id));

-- 5) The actual privilege-escalation fix: writing user_roles can never set
--    role to 'admin' or 'super_admin' unless the caller already IS a
--    super_admin. Non-super-admins may only create 'leader' rows, scoped to
--    a specific department, for a church they already manage.
DROP POLICY IF EXISTS "managers assign dept leaders" ON public.user_roles;
CREATE POLICY "managers assign dept leaders" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
  OR (
    role = 'leader'::app_role
    AND department_id IS NOT NULL
    AND church_id IS NOT NULL
    AND can_manage_church(church_id)
  )
);

DROP POLICY IF EXISTS "managers delete dept leaders" ON public.user_roles;
CREATE POLICY "managers delete dept leaders" ON public.user_roles
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR (
    role = 'leader'::app_role
    AND church_id IS NOT NULL
    AND can_manage_church(church_id)
  )
);

-- 6) Notifications: admins can still message the whole church; leaders are
--    now limited to members of the department(s) they actually lead
--    (previously they could message ANY member of the church).
DROP POLICY IF EXISTS "leaders create church notifications" ON public.notifications;
CREATE POLICY "admins create church notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = notifications.user_id
      AND can_manage_church(p.church_id)
  ));

CREATE POLICY "leaders notify own department members" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.department_members dm
    JOIN public.user_roles ur
      ON ur.department_id = dm.department_id AND ur.role = 'leader' AND ur.user_id = auth.uid()
    WHERE dm.user_id = notifications.user_id
  ));

-- 7) These SECURITY DEFINER helpers gate every write path above; anon has no
--    legitimate reason to call them (auth.uid() is always null for anon, but
--    there is no reason to leave the surface open).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_church(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_department(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_church() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_department_leader(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_monthly_schedule(uuid, integer, integer) FROM anon;
