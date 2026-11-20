import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanId } from "@/lib/plans";
import { notifyProChanged } from "@/lib/pro";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout, confirmCheckout } from "@/lib/payments.functions";
import { toast } from "sonner";

declare global { interface Window { Razorpay?: any } }

function loadCheckoutJs(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(); s.onerror = () => rej(new Error("Couldn't load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

export function PaywallModal({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (o: boolean) => void; reason: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createCheckout); const confirm = useServerFn(confirmCheckout);
  useEffect(() => { if (open) void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); }, [open]);

  const pay = async (plan: PlanId) => {
    window.__lovableEvents?.track?.("project.checkout_clicked", { plan });
    setBusy(true);
    try {
      await loadCheckoutJs();
      const o = await create({ data: { plan } });
      const { data: s } = await supabase.auth.getSession();
      let settled = false;
      const finish = async () => {
        if (settled) return;
        try {
          const r = await confirm({ data: { paymentId: o.paymentId } });
          if (r.status === "completed") { settled = true; notifyProChanged(); toast.success("Payment received. Your next scan is unlocked."); onOpenChange(false); }
        } catch (e) { toast.error((e as Error).message); }
        setBusy(false);
      };
      const rzp = new window.Razorpay({
        key: o.keyId, order_id: o.rzpOrderId, amount: o.amount, currency: o.currency,
        name: "UX Design ATS Checker", description: "One more resume scan",
        prefill: { email: s.session?.user.email ?? "" },
        handler: () => void finish(), modal: { ondismiss: () => void finish() },
      });
      rzp.on("payment.failed", (r: any) => toast.error(r?.error?.description ?? "Payment failed"));
      rzp.open();
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" />Unlock your UX resume</DialogTitle>
        <DialogDescription>{reason}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        {PLANS.map((p) => <div key={p.id} className={`relative space-y-3 rounded-xl border p-5 ${p.best ? "border-primary shadow-glow" : ""}`}>
          <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.blurb}</p></div>
          <p><span className="text-3xl font-semibold">₹{p.inr}</span></p>
          <ul className="space-y-1 text-sm">{p.perks.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-success" />{x}</li>)}</ul>
          {signedIn === false
            ? <Button asChild className="w-full"><Link to="/auth" search={{ mode: "signup", as: "candidate", redirect: "/check" }}>Sign in to pay ₹{p.inr}</Link></Button>
            : <Button className="w-full" disabled={busy || signedIn === null} onClick={() => void pay(p.id)}>{busy ? "Waiting for payment…" : `Pay ₹${p.inr} · UPI, card, netbanking`}</Button>}
        </div>)}
      </div>
      <p className="text-center text-xs text-muted-foreground">Secure payment by Razorpay · one-time · no subscription</p>
    </DialogContent>
  </Dialog>;
}
