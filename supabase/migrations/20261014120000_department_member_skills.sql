-- Funções que cada pessoa sabe exercer dentro do departamento (ex: alguém da
-- Comunicação pode saber "Cinegrafista" e "Som", mas não "Telão"). Isso
-- passa a filtrar quem aparece pra escalar e qual função é oferecida.
CREATE TABLE public.department_member_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_member_id uuid NOT NULL REFERENCES public.department_members(id) ON DELETE CASCADE,
  department_role_id uuid NOT NULL REFERENCES public.department_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_member_id, department_role_id)
);
ALTER TABLE public.department_member_skills ENABLE ROW LEVEL SECURITY;

-- Garante que a função marcada pertence ao mesmo departamento do membro
-- (evita marcar, por exemplo, "Cinegrafista" do Louvor pra um membro da Diaconia).
CREATE OR REPLACE FUNCTION public.validate_member_skill_department()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dm_dept uuid; dr_dept uuid;
BEGIN
  SELECT department_id INTO dm_dept FROM public.department_members WHERE id = NEW.department_member_id;
  SELECT department_id INTO dr_dept FROM public.department_roles WHERE id = NEW.department_role_id;
  IF dm_dept IS DISTINCT FROM dr_dept THEN
    RAISE EXCEPTION 'A função precisa pertencer ao mesmo departamento do membro';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_member_skill_department
BEFORE INSERT OR UPDATE ON public.department_member_skills
FOR EACH ROW EXECUTE FUNCTION public.validate_member_skill_department();
REVOKE EXECUTE ON FUNCTION public.validate_member_skill_department() FROM anon;

CREATE POLICY "view church member skills" ON public.department_member_skills FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.department_members dm
    JOIN public.departments d ON d.id = dm.department_id
    WHERE dm.id = department_member_skills.department_member_id
      AND (d.church_id = public.current_user_church() OR public.has_role(auth.uid(), 'super_admin'))
  ));

CREATE POLICY "manage member skills" ON public.department_member_skills FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.department_members dm
    WHERE dm.id = department_member_skills.department_member_id
      AND public.can_manage_department(dm.department_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.department_members dm
    WHERE dm.id = department_member_skills.department_member_id
      AND public.can_manage_department(dm.department_id)
  ));

-- Exclusividade por dia: ninguém pode ser escalado em mais de um culto na
-- mesma data, em nenhum departamento. Isso é uma rede de segurança a nível
-- de banco — a UI (Gerenciar.tsx) e generate_monthly_schedule abaixo já
-- filtram os candidatos antes de inserir, então em uso normal este trigger
-- nunca deveria disparar; ele só protege contra inserts diretos via SQL/API
-- que pulem a interface.
CREATE OR REPLACE FUNCTION public.enforce_same_day_exclusivity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conflict_count int;
BEGIN
  SELECT count(*) INTO conflict_count
  FROM public.assignments a
  JOIN public.services s1 ON s1.id = a.service_id
  JOIN public.services s2 ON s2.id = NEW.service_id
  WHERE a.user_id = NEW.user_id
    AND a.id <> NEW.id
    AND a.service_id <> NEW.service_id
    AND s1.service_date = s2.service_date;
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Esta pessoa já está escalada em outro culto nesta mesma data';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_enforce_same_day_exclusivity
BEFORE INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_same_day_exclusivity();
REVOKE EXECUTE ON FUNCTION public.enforce_same_day_exclusivity() FROM anon;

-- generate_monthly_schedule: exclusividade agora é por service_date (não só
-- pelo service_id exato), só escala quem tem função marcada quando o
-- departamento define funções, e preenche a função automaticamente
-- escolhendo uma das marcadas pra aquela pessoa.
CREATE OR REPLACE FUNCTION public.generate_monthly_schedule(_church_id uuid, _year integer, _month integer)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s_rec record; d_rec record; u_id uuid; u_member_id uuid; chosen_role text; inserted_count int := 0; role_count int;
BEGIN
  IF NOT public.can_manage_church(_church_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  PERFORM public.materialize_recurring_for_month(_church_id, _year, _month);
  FOR s_rec IN
    SELECT id, service_date FROM public.services
    WHERE church_id = _church_id
      AND extract(year from service_date) = _year
      AND extract(month from service_date) = _month
  LOOP
    FOR d_rec IN SELECT id FROM public.departments WHERE church_id = _church_id LOOP
      SELECT count(*) INTO role_count FROM public.department_roles WHERE department_id = d_rec.id;

      SELECT p.id, dm.id INTO u_id, u_member_id FROM public.profiles p
      JOIN public.department_members dm ON dm.user_id = p.id AND dm.department_id = d_rec.id
      WHERE p.church_id = _church_id
        AND NOT EXISTS (
          SELECT 1 FROM public.assignments a
          JOIN public.services s2 ON s2.id = a.service_id
          WHERE a.user_id = p.id AND s2.service_date = s_rec.service_date
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.unavailability un
          WHERE un.user_id = p.id AND un.day = s_rec.service_date
        )
        AND (
          role_count = 0
          OR EXISTS (SELECT 1 FROM public.department_member_skills dms WHERE dms.department_member_id = dm.id)
        )
      ORDER BY (
        SELECT count(*) FROM public.assignments a2
        JOIN public.services s2 ON s2.id = a2.service_id
        WHERE a2.user_id = p.id
          AND extract(year from s2.service_date) = _year
          AND extract(month from s2.service_date) = _month
      ) ASC, random()
      LIMIT 1;

      chosen_role := NULL;
      IF u_id IS NOT NULL AND role_count > 0 THEN
        SELECT dr.name INTO chosen_role
        FROM public.department_member_skills dms
        JOIN public.department_roles dr ON dr.id = dms.department_role_id
        WHERE dms.department_member_id = u_member_id
        ORDER BY random() LIMIT 1;
      END IF;

      IF u_id IS NOT NULL THEN
        INSERT INTO public.assignments(service_id, department_id, user_id, role)
        VALUES (s_rec.id, d_rec.id, u_id, chosen_role) ON CONFLICT DO NOTHING;
        inserted_count := inserted_count + 1;
      END IF;
      u_id := NULL; u_member_id := NULL;
    END LOOP;
  END LOOP;
  RETURN inserted_count;
END; $function$;
GRANT EXECUTE ON FUNCTION public.generate_monthly_schedule(uuid, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_monthly_schedule(uuid, integer, integer) FROM anon;
