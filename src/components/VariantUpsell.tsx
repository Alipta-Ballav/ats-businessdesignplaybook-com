import { Link } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POWER_DAYS, POWER_INR } from "@/lib/plans";
export function VariantUpsell() {
  return (
    <div className="space-y-2 rounded-lg border border-primary/40 bg-accent p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Layers className="h-4 w-4 text-primary" /> Unlock Multi-Resume Workspace
      </p>
      <p className="text-muted-foreground">
        Your plan keeps one master resume. Tailor separate role variants for different companies and
        role types, without overwriting your master copy, with the {POWER_DAYS}-day Power Searcher
        Pass (₹{POWER_INR}).
      </p>
      <Button asChild size="sm">
        <Link to="/pass">Get Power Searcher Pass</Link>
      </Button>
    </div>
  );
}
