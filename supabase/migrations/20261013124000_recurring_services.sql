-- Backfill migration: recurring_services + materialize_recurring_for_month existed in the
-- original (pre-migration-history) database but were never captured as a migration file.
-- Recreated here from how the app actually uses them (Gerenciar.tsx "Fixos" tab).

CREATE TABLE public.recurring_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name text NOT NULL,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  service_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recurring_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view church recurring services" ON public.recurring_services FOR SELECT TO authenticated
  USING (church_id = public.current_user_church() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "manage church recurring services" ON public.recurring_services FOR ALL TO authenticated
  USING (public.can_manage_church(church_id)) WITH CHECK (public.can_manage_church(church_id));

CREATE OR REPLACE FUNCTION public.materialize_recurring_for_month(_church_id uuid, _year int, _month int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r_rec record;
  d date;
  days_in_month int;
  day_num int;
  created_count int := 0;
BEGIN
  IF NOT public.can_manage_church(_church_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  days_in_month := date_part('days', (make_date(_year, _month, 1) + interval '1 month - 1 day'))::int;
  FOR r_rec IN SELECT * FROM public.recurring_services WHERE church_id = _church_id LOOP
    FOR day_num IN 1..days_in_month LOOP
      d := make_date(_year, _month, day_num);
      IF extract(dow from d) = r_rec.weekday THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.services s
          WHERE s.church_id = _church_id AND s.service_date = d AND s.name = r_rec.name
        ) THEN
          INSERT INTO public.services(church_id, name, service_date, service_time)
          VALUES (_church_id, r_rec.name, d, r_rec.service_time);
          created_count := created_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN created_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.materialize_recurring_for_month(uuid, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_recurring_for_month(uuid, int, int) TO authenticated;
