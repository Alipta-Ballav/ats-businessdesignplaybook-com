import { Check, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLANS, checkoutReady } from "@/lib/plans";
import { simulatePayment } from "@/lib/pro";
import { toast } from "sonner";

export function PaywallModal({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (o: boolean) => void; reason: string }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" />Unlock your UX resume</DialogTitle>
        <DialogDescription>{reason}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        {PLANS.map((p) => <div key={p.id} className={`relative space-y-3 rounded-xl border p-5 ${p.best ? "border-primary shadow-glow" : ""}`}>
          {p.best && <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Best value</span>}
          <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.blurb}</p></div>
          <p><span className="text-3xl font-semibold">₹{p.inr}</span> <span className="text-xs text-muted-foreground">/ ${p.usd}</span></p>
          <ul className="space-y-1 text-sm">{p.perks.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-success" />{x}</li>)}</ul>
          <Button className="w-full" variant={p.best ? "default" : "outline"} disabled={!checkoutReady}
            onClick={() => window.__lovableEvents?.track?.("project.checkout_clicked", { plan: p.id })}>
            {checkoutReady ? `Pay ₹${p.inr}` : "Payments coming soon"}</Button>
          {!checkoutReady && <Button className="w-full" variant="secondary" onClick={() => { simulatePayment(); window.__lovableEvents?.track?.("project.checkout_clicked", { plan: p.id }); toast.success("Test payment done. Pro is unlocked in this browser."); onOpenChange(false); }}>
            Simulate payment ₹{p.inr} (test mode)</Button>}
        </div>)}
      </div>
      <p className="text-center text-xs text-muted-foreground">One-time payment · no subscription · built for the UX design community</p>
    </DialogContent>
  </Dialog>;
}
