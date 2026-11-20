const GATEWAY_URL = "https://connector-gateway.lovable.dev/razorpay";

export function razorpayEnv() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["RAZORPAY_CONNECTION_KEY"];
  const keyId = process.env["RAZORPAY_CONNECTION_KEY_ID"];
  if (!lovableKey || !connectionKey || !keyId) throw new Error("Razorpay is not connected");
  return { lovableKey, connectionKey, keyId };
}

export async function razorpay<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { lovableKey, connectionKey } = razorpayEnv();
  const res = await fetch(`${GATEWAY_URL}/${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Razorpay ${path} failed [${res.status}]: ${text}`);
    let msg = text; try { msg = JSON.parse(text)?.error?.description ?? text; } catch { /* keep text */ }
    throw new Error(`Payment provider error: ${msg}`);
  }
  return res.json() as Promise<T>;
}

/** The only code that marks a payment completed. Reads Razorpay's order; grants credits once. */
export async function confirmPaymentRow(paymentId: string): Promise<"completed" | "pending"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await supabaseAdmin.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!p || !p.gateway_order_id) return "pending";
  if (p.status === "completed") return "completed";
  const order = await razorpay<{ status: string; amount_paid: number }>(`orders/${p.gateway_order_id}`);
  let rzpPaymentId: string | null = null;
  let paid = order.status === "paid" && order.amount_paid === p.amount;
  if (!paid && order.status === "attempted") {
    const list = await razorpay<{ items: { id: string; status: string; amount: number }[] }>(`orders/${p.gateway_order_id}/payments`);
    const auth = list.items.find((i) => i.status === "authorized");
    if (auth) {
      const cap = await razorpay<{ status: string; amount: number }>(`payments/${auth.id}/capture`, { method: "POST", body: { amount: p.amount, currency: p.currency } });
      paid = cap.status === "captured" && cap.amount === p.amount; rzpPaymentId = auth.id;
    }
  }
  if (!paid) return "pending";
  if (!rzpPaymentId) {
    const list = await razorpay<{ items: { id: string; status: string }[] }>(`orders/${p.gateway_order_id}/payments`);
    rzpPaymentId = list.items.find((i) => i.status === "captured")?.id ?? null;
  }
  const { data: changed, error } = await supabaseAdmin.from("payments")
    .update({ status: "completed", paid_at: new Date().toISOString(), gateway_payment_id: rzpPaymentId })
    .eq("id", p.id).eq("status", "pending").select("id");
  if (error) throw error;
  if (changed && changed.length) {
    const { data: c } = await supabaseAdmin.from("scan_credits").select("credits").eq("user_id", p.user_id).maybeSingle();
    const { error: e2 } = await supabaseAdmin.from("scan_credits").upsert({ user_id: p.user_id, credits: (c?.credits ?? 0) + p.scans_granted, updated_at: new Date().toISOString() });
    if (e2) throw e2;
  }
  return "completed";
}
