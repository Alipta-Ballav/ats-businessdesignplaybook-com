import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLANS, LAUNCH_BANNER, type PlanId } from "@/lib/plans";
import { notifyProChanged } from "@/lib/pro";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout, confirmCheckout, getPassPrice } from "@/lib/payments.functions";
import { toast } from "sonner";
import { PaymentPromise } from "@/components/trust/Trust";

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      order_id: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      prefill: { email: string };
      handler: () => void;
      modal: { ondismiss: () => void };
    }) => {
      on: (
        event: "payment.failed",
        callback: (response: { error?: { description?: string } }) => void,
      ) => void;
      open: () => void;
    };
  }
}

// After payment the buyer lands on the resume checker, unless they are already
// inside it — leaving mid-edit would discard their unsaved draft.
export function shouldLandOnCandidate(pathname: string): boolean {
  return !(pathname === "/candidate" || pathname.startsWith("/candidate/scans/"));
}

function loadCheckoutJs(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res();
    s.onerror = () => rej(new Error("Couldn't load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

export function PaywallModal({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason: string;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createCheckout);
  const confirm = useServerFn(confirmCheckout);
  const navigate = useNavigate();
  const [price, setPrice] = useState<number | null>(null);
  const getPrice = useServerFn(getPassPrice);
  useEffect(() => {
    if (open)
      void getPrice()
        .then((r) => setPrice(r.inr))
        .catch(() => {});
  }, [open]);
  useEffect(() => {
    if (open) void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, [open]);

  const pay = async (plan: PlanId) => {
    window.__lovableEvents?.track?.("project.checkout_clicked", { plan });
    setBusy(true);
    try {
      await loadCheckoutJs();
      if (!window.Razorpay) throw new Error("The payment window failed to initialize.");
      const o = await create({ data: { plan } });
      const { data: s } = await supabase.auth.getSession();
      let settled = false;
      const finish = async () => {
        if (settled) return;
        try {
          const r = await confirm({ data: { paymentId: o.paymentId } });
          if (r.status === "completed") {
            settled = true;
            notifyProChanged();
            toast.success("Payment received. Your 30-day Job Hunt Pass is active.");
            onOpenChange(false);
            if (shouldLandOnCandidate(window.location.pathname)) void navigate({ to: "/candidate" });
          }
        } catch (e) {
          toast.error((e as Error).message);
        }
        setBusy(false);
      };
      const rzp = new window.Razorpay({
        key: o.keyId,
        order_id: o.rzpOrderId,
        amount: o.amount,
        currency: o.currency,
        name: "UX Design ATS Checker",
        description: "30-Day Job Hunt Pass · no auto-renewal",
        prefill: { email: s.session?.user.email ?? "" },
        handler: () => void finish(),
        modal: { ondismiss: () => void finish() },
      });
      rzp.on("payment.failed", (r) => toast.error(r?.error?.description ?? "Payment failed"));
      rzp.open();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Unlock your UX resume
          </DialogTitle>
          <DialogDescription>{reason}</DialogDescription>
        </DialogHeader>
        <p className="rounded-md bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary">
          {LAUNCH_BANNER}
        </p>
        <div className="grid gap-4">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative space-y-3 rounded-lg border p-5 ${p.best ? "border-primary shadow-glow" : ""}`}
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.blurb}</p>
              </div>
              <p>
                <span className="text-3xl font-semibold">₹{price ?? p.inr}</span>
                <span className="ml-2 text-sm text-muted-foreground">/ 30 days</span>
              </p>
              <ul className="space-y-1 text-sm">
                {p.perks.map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {x}
                  </li>
                ))}
              </ul>
              {signedIn === false ? (
                <Button asChild className="w-full">
                  <Link to="/auth" search={{ mode: "signup", as: "candidate", redirect: "/check" }}>
                    Sign in to pay ₹{price ?? p.inr}
                  </Link>
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={busy || signedIn === null}
                  onClick={() => void pay(p.id)}
                >
                  {busy ? "Waiting for payment…" : `Pay ₹${price ?? p.inr} · UPI, card, netbanking`}
                </Button>
              )}
            </div>
          ))}
        </div>
        <PaymentPromise />
        <p className="text-center text-xs text-muted-foreground">
          Secure payment by Razorpay · no auto-renewal
          <br />
          Pay again only when you want another 30-day pass.
        </p>
      </DialogContent>
    </Dialog>
  );
}
