import { Link } from "@tanstack/react-router";
import { BadgeCheck, CreditCard, GraduationCap, Lock, Quote, ShieldCheck } from "lucide-react";

export function PrivacySeal() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-success" />NDA-safe: never shared or used to train AI</span>
      <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-success" />Resume file read in your browser</span>
      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy pledge</Link>
    </div>
  );
}

export function PaymentPromise() {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5 font-medium text-foreground"><CreditCard className="h-3.5 w-3.5 text-success" />No subscription. No auto-debit. Ever.</p>
      <p className="mt-1">One-time ₹99 via UPI, GPay, PhonePe or card on Razorpay secure checkout. Your pass simply ends after 30 days. <Link to="/refund" className="underline">Refund policy</Link></p>
    </div>
  );
}

const PILLARS = [
  { icon: Lock, fear: "“Is my NDA work safe?”", title: "Designer Privacy Pledge", body: "Your resume is never sold, shared or used to train AI models. Delete your saved data any time." },
  { icon: GraduationCap, fear: "“Who wrote this rubric?”", title: "Built by design educators", body: "Created by The Finishing School, makers of the Business Design Playbook, from real Lead, Staff and Director hiring criteria." },
  { icon: Quote, fear: "“Is the score made up?”", title: "Verbatim Truth Standard", body: "Every point quotes your exact words. If we can't find it in your resume, it doesn't count. Same resume, same score." },
  { icon: BadgeCheck, fear: "“Is this a subscription trap?”", title: "Zero-trap payment", body: "First scan free. ₹99 once for 30 days. No card saved, no auto-renewal, clear refunds." },
];

export function TrustPillars() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <p className="text-center font-mono text-xs uppercase tracking-widest text-primary">Why designers trust us</p>
      <h2 className="mt-2 text-center text-3xl">Your work, your words, your money: protected.</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-xl border bg-card p-5 shadow-sheet">
            <p.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs italic text-muted-foreground">{p.fear}</p>
            <h3 className="mt-1 text-base font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 text-sm text-muted-foreground sm:grid-cols-3">
        <div><p className="font-display text-base font-semibold text-foreground">FutureTalent AI</p>
          <p className="mt-2">The ATS check built only for Product & UX designers. By The Finishing School, creators of the <a href="https://businessdesignplaybook.com/" target="_blank" rel="noreferrer" className="underline">Business Design Playbook</a>.</p></div>
        <div className="flex flex-col gap-1.5"><p className="font-medium text-foreground">Trust</p>
          <Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link><Link to="/refund">Refund policy</Link></div>
        <div className="flex flex-col gap-1.5"><p className="font-medium text-foreground">Promise</p>
          <span>No AI training on your resume</span><span>Every score quotes your words</span><span>No subscriptions, no auto-debit</span></div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} The Finishing School. Payments secured by Razorpay.</p>
    </footer>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl py-8 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground">
      <h1 className="text-3xl">{title}</h1>
      <p className="text-xs">Last updated {updated}</p>
      {children}
    </article>
  );
}
