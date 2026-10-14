-- Cargos/funções pré-definidas por departamento (ex: Guitarrista, Baterista, Vocal),
-- pra deixar de ser texto livre ao escalar alguém.

CREATE TABLE public.department_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);
ALTER TABLE public.department_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view church department roles" ON public.department_roles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = department_roles.department_id
      AND (d.church_id = public.current_user_church() OR public.has_role(auth.uid(), 'super_admin'))
  ));

CREATE POLICY "manage department roles" ON public.department_roles FOR ALL TO authenticated
  USING (public.can_manage_department(department_id))
  WITH CHECK (public.can_manage_department(department_id));
