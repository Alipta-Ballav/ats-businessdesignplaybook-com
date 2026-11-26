import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, passPriceInr } from "@/lib/plans";

async function currentPassInr() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("plan", "job_hunt_30")
    .eq("status", "completed");
  if (error) throw error;
  return passPriceInr(count ?? 0);
}

/** Public: current pass price only (no counts exposed). */
export const getPassPrice = createServerFn({ method: "GET" }).handler(async () => ({
  inr: await currentPassInr(),
}));

/** Creates a pending payment + Razorpay order. Price comes from the server-side plan catalog. */
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ plan: z.enum(["job_hunt_30", "power_60"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { razorpay, razorpayEnv } = await import("./razorpay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plan = PLANS.find((p) => p.id === data.plan);
    if (!plan) throw new Error("Plan not found.");
    const amount = (plan.id === "power_60" ? plan.inr : await currentPassInr()) * 100;
    const { data: row, error } = await supabaseAdmin
      .from("payments")
      .insert({ user_id: context.userId, plan: plan.id, amount, currency: "INR", scans_granted: 0 })
      .select("id")
      .single();
    if (error) throw error;
    const order = await razorpay<{ id: string; amount: number; currency: string }>("orders", {
      method: "POST",
      body: { amount, currency: "INR", receipt: row.id.slice(0, 36), notes: { paymentId: row.id } },
    });
    const { error: saveError } = await supabaseAdmin
      .from("payments")
      .update({ gateway_order_id: order.id })
      .eq("id", row.id);
    if (saveError) throw saveError;
    return {
      paymentId: row.id,
      rzpOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayEnv().keyId,
    };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase
      .from("payments")
      .select("id")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!own) throw new Error("Payment not found");
    const { confirmPaymentRow } = await import("./razorpay.server");
    return { status: await confirmPaymentRow(data.paymentId) };
  });

/** Spends one paid scan credit (only when the user has one). */
export const useScanCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("scan_credits")
      .select("credits")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!c || c.credits < 1) return { ok: false };
    const { data: changed } = await supabaseAdmin
      .from("scan_credits")
      .update({ credits: c.credits - 1, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("credits", c.credits)
      .select("user_id");
    return { ok: !!changed?.length };
  });
