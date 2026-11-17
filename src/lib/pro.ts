import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Pro entitlement. Admin accounts (role stored in user_roles, checked under RLS) get Pro; checkout will grant it later. */
export function usePro(): boolean {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    let live = true;
    const check = async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) { if (live) setPro(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      if (live) setPro(!!data);
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);
  return pro;
}
