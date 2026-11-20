CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'single',
  amount integer NOT NULL DEFAULT 4900,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  gateway text NOT NULL DEFAULT 'razorpay',
  gateway_order_id text UNIQUE,
  gateway_payment_id text UNIQUE,
  scans_granted integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments read" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX payments_user_idx ON public.payments(user_id);

CREATE TABLE public.scan_credits (
  user_id uuid PRIMARY KEY,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scan_credits TO authenticated;
GRANT ALL ON public.scan_credits TO service_role;
ALTER TABLE public.scan_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credits read" ON public.scan_credits FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));