import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** A paid scan unlocks every Pro feature for the report it produced (this browser tab). */
const UNLOCK_KEY = "ft-report-unlocked";
export const PRO_EVENT = "ft-pro-changed";
export const setReportUnlocked = (on: boolean) => {
  if (on) sessionStorage.setItem(UNLOCK_KEY, "1"); else sessionStorage.removeItem(UNLOCK_KEY);
  window.dispatchEvent(new Event(PRO_EVENT));
};
export const notifyProChanged = () => window.dispatchEvent(new Event(PRO_EVENT));

/** Paid scan credits left for the signed-in user (read under RLS). */
export async function creditsLeft(): Promise<number> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return 0;
  const { data } = await supabase.from("scan_credits").select("credits").eq("user_id", uid).maybeSingle();
  return data?.credits ?? 0;
}

/** Pro entitlement: admin role, or any completed ₹49 payment (lifetime unlock). */
export function usePro(): boolean {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    let live = true;
    const check = async () => {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") { if (live) setPro(true); return; }
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) { if (live) setPro(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      if (data) { if (live) setPro(true); return; }
      const { data: paid } = await supabase.from("payments").select("id").eq("user_id", uid).eq("status", "completed").limit(1);
      if (live) setPro(!!paid?.length);
    };
    void check();
    const on = () => { void check(); };
    window.addEventListener(PRO_EVENT, on);
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { live = false; window.removeEventListener(PRO_EVENT, on); sub.subscription.unsubscribe(); };
  }, []);
  return pro;
}

export async function isAdmin(): Promise<boolean> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return false;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
  return !!data;
}
