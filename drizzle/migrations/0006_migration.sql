CREATE OR REPLACE FUNCTION public.enforce_resume_variant_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(NEW.user_id, 'admin') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.user_id = NEW.user_id AND p.status = 'completed'
      AND p.plan = 'power_60' AND p.amount = 29900 AND p.paid_at IS NOT NULL
      AND now() >= p.paid_at AND now() < p.paid_at + interval '60 days') THEN
    RETURN NEW;
  END IF;
  IF (SELECT count(*) FROM public.resume_versions v WHERE v.user_id = NEW.user_id) >= 1 THEN
    RAISE EXCEPTION 'Multiple role variants need an active Power Searcher Pass';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_resume_variant_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER resume_variant_limit BEFORE INSERT ON public.resume_versions
FOR EACH ROW EXECUTE FUNCTION public.enforce_resume_variant_limit();