import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Test-mode payment: until a real gateway is wired, a simulated payment unlocks Pro in this browser only. */
const SIM_KEY = "ft-test-paid";
export const simulatePayment = () => { localStorage.setItem(SIM_KEY, "1"); window.dispatchEvent(new Event(SIM_KEY)); };
export const resetSimulatedPayment = () => { localStorage.removeItem(SIM_KEY); window.dispatchEvent(new Event(SIM_KEY)); };

/** Pro entitlement. Admin accounts (role in user_roles, checked under RLS) or a simulated test payment get Pro. */
export function usePro(): boolean {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    let live = true;
    const check = async () => {
      if (localStorage.getItem(SIM_KEY) === "1") { if (live) setPro(true); return; }
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) { if (live) setPro(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      if (live) setPro(!!data);
    };
    void check();
    const onSim = () => { void check(); };
    window.addEventListener(SIM_KEY, onSim);
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { live = false; window.removeEventListener(SIM_KEY, onSim); sub.subscription.unsubscribe(); };
  }, []);
  return pro;
}
