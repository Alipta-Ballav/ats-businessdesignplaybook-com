import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasPaidAccess, passScansLeft } from "@/lib/plans";

/** A paid scan unlocks every Pro feature for the report it produced (this browser tab). */
const UNLOCK_KEY = "ft-report-unlocked";
export const PRO_EVENT = "ft-pro-changed";
export const setReportUnlocked = (on: boolean) => {
  if (on) sessionStorage.setItem(UNLOCK_KEY, "1");
  else sessionStorage.removeItem(UNLOCK_KEY);
  window.dispatchEvent(new Event(PRO_EVENT));
};
export const notifyProChanged = () => window.dispatchEvent(new Event(PRO_EVENT));

/** Paid scan credits left for the signed-in user (read under RLS). */
export async function creditsLeft(): Promise<number> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return 0;
  const { data } = await supabase
    .from("scan_credits")
    .select("credits")
    .eq("user_id", uid)
    .maybeSingle();
  return data?.credits ?? 0;
}

/** Pro entitlement: admin role, active 30-day pass, or a preserved earlier lifetime purchase. */
export function usePro(): boolean {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    let live = true;
    const check = async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) {
        if (live) setPro(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (data) {
        if (live) setPro(true);
        return;
      }
      const { data: paid } = await supabase
        .from("payments")
        .select("plan, amount, status, paid_at")
        .eq("user_id", uid)
        .eq("status", "completed");
      if (live) setPro(paid?.some((payment) => hasPaidAccess(payment)) ?? false);
    };
    void check();
    const on = () => {
      void check();
    };
    window.addEventListener(PRO_EVENT, on);
    window.addEventListener("focus", on);
    const timer = window.setInterval(on, 30_000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    return () => {
      live = false;
      window.removeEventListener(PRO_EVENT, on);
      window.removeEventListener("focus", on);
      window.clearInterval(timer);
      sub.subscription.unsubscribe();
    };
  }, []);
  return pro;
}

export async function isAdmin(): Promise<boolean> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** Pass scan allowance: null = no cap (admin or lifetime), else scans left in the active pass. */
export async function passAllowance(): Promise<number | null> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return 0;
  if (await isAdmin()) return null;
  const { data: paid } = await supabase
    .from("payments")
    .select("plan, amount, status, paid_at")
    .eq("user_id", uid)
    .eq("status", "completed");
  const active = (paid ?? []).filter((p) => hasPaidAccess(p));
  if (active.some((p) => p.plan === "single")) return null;
  if (!active.length) return 0;
  const since = active.map((p) => p.paid_at!).sort()[0]!;
  const { count } = await supabase
    .from("pass_scans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .gte("created_at", since);
  return passScansLeft(count ?? 0, active.map((p) => p.plan));
}
export async function recordPassScan() {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (uid) await supabase.from("pass_scans").insert({ user_id: uid });
}
