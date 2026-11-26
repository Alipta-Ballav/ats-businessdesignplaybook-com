import { PaymentPromise } from "@/components/trust/Trust";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/PaywallModal";
import { supabase } from "@/integrations/supabase/client";
import { hasPaidAccess, passEndsAt, planTerms, LAUNCH_BANNER, POWER_INR } from "@/lib/plans";
import { passAllowance, PRO_EVENT } from "@/lib/pro";

export const Route = createFileRoute("/pass")({
  head: () => ({
    meta: [
      { title: "Job Hunt Pass — buy or renew · FutureTalent AI" },
      {
        name: "description",
        content:
          "Buy or renew the ₹99 30-day Job Hunt Pass: 5 verified UX resume scores, rescoring and Word downloads. No auto-renewal.",
      },
      { property: "og:title", content: "Job Hunt Pass — buy or renew · FutureTalent AI" },
      {
        property: "og:description",
        content:
          "₹99 for 30 days and 5 verified UX resume scores. Pay by UPI or card. No auto-renewal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PassPage,
});

type Pay = { plan: string; amount: number; status: string; paid_at: string | null };

function PassPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pays, setPays] = useState<Pay[]>([]);
  const [left, setLeft] = useState<number | null>(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      setSignedIn(!!uid);
      if (!uid) return;
      const { data } = await supabase
        .from("payments")
        .select("plan, amount, status, paid_at")
        .eq("user_id", uid)
        .eq("status", "completed")
        .order("paid_at", { ascending: false });
      setPays((data ?? []) as Pay[]);
      setLeft(await passAllowance());
    };
    void load();
    window.addEventListener(PRO_EVENT, load);
    return () => window.removeEventListener(PRO_EVENT, load);
  }, []);
  const active = pays.filter((p) => hasPaidAccess(p));
  const expiry = active
    .map((p) => passEndsAt(p))
    .sort((a, b) => b - a)[0];
  const status = !signedIn
    ? null
    : left === null
      ? "No score limit on this account"
      : active.length
        ? `${left} of ${active.reduce((n, p) => n + planTerms(p.plan).scans, 0)} scans left · expires ${new Date(expiry!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
        : pays.length
          ? "Your pass has expired"
          : "You don't have a pass yet";
  const label = active.length
    ? "Renew or add a pass"
    : pays.length
      ? "Renew pass"
      : "Buy pass";
  return (
    <main className="mx-auto max-w-xl px-6 py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Job Hunt Pass</h1>
      <p className="rounded-md bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary">
        {LAUNCH_BANNER}
      </p>
      <div className="rounded-lg border p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Job Hunt Pass: 30 days · 5 verified scores. Power Searcher Pass (₹{POWER_INR}): 60 days ·
          20 verified scores. Both include Word & PDF downloads, no auto-renewal, and stack with any active pass.
        </p>
        {status && <p className="font-medium">{status}</p>}
        {signedIn === false ? (
          <Button asChild className="w-full">
            <Link to="/auth" search={{ mode: "signin", redirect: "/pass" }}>
              Sign in to buy or renew
            </Link>
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            disabled={signedIn === null}
            onClick={() => setOpen(true)}
          >
            {label}
          </Button>
        )}
        <PaymentPromise />
      </div>
      {pays.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium">Past payments</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            {pays.map((p, i) => (
              <li key={i}>
                ₹{p.amount / 100} ·{" "}
                {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN") : ""} ·{" "}
                {hasPaidAccess(p) ? "active" : "expired"}
              </li>
            ))}
          </ul>
        </div>
      )}
      <PaywallModal
        open={open}
        onOpenChange={setOpen}
        reason="One payment of ₹99 adds 5 verified scores and 30 days of access."
      />
    </main>
  );
}
