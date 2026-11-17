import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { q, type Role } from "@/lib/db";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome — FutureTalent AI" }, { name: "description", content: "Choose how you'll use FutureTalent AI." }, { property: "og:title", content: "Welcome — FutureTalent AI" }, { property: "og:description", content: "Choose how you'll use FutureTalent AI." }] }),
  component: Welcome,
});

function Welcome() {
  const nav = useNavigate(); const qc = useQueryClient();
  const { data: me, isLoading } = useQuery(q.me());
  const [busy, setBusy] = useState(false);
  const choose = async (role: Role) => {
    setBusy(true);
    await supabase.rpc("choose_role", { _role: role });
    sessionStorage.removeItem("ft-role");
    await qc.invalidateQueries({ queryKey: ["me"] });
    nav({ to: role === "recruiter" ? "/recruiter" : "/candidate", replace: true });
  };
  useEffect(() => {
    if (!me) return;
    if (me.role) { nav({ to: me.role === "recruiter" ? "/recruiter" : "/candidate", replace: true }); return; }
    const pending = sessionStorage.getItem("ft-role");
    if (pending === "candidate" || pending === "recruiter") choose(pending);
  }, [me]);
  if (isLoading || me?.role) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl">How will you use FutureTalent?</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <button disabled={busy} onClick={() => choose("candidate")} className="text-left"><Card className="h-full hover:border-primary"><h2 className="font-display text-xl">I'm looking for a job</h2><p className="mt-1 text-sm text-muted-foreground">Check your resume against any role, see exactly what's missing and how to fix it.</p></Card></button>
        <button disabled={busy} onClick={() => choose("recruiter")} className="text-left"><Card className="h-full hover:border-primary"><h2 className="font-display text-xl">I'm hiring</h2><p className="mt-1 text-sm text-muted-foreground">Post roles, evaluate applicants with evidence, and find transferable talent.</p></Card></button>
      </div>
    </div>
  );
}
