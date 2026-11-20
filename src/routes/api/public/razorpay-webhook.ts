import { createFileRoute } from "@tanstack/react-router";

// Never trusts the event body: it only names an order; confirmPaymentRow re-reads it from Razorpay.
export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let orderId: string | undefined;
        try {
          const ev = await request.json();
          orderId = ev?.payload?.payment?.entity?.order_id ?? ev?.payload?.order?.entity?.id;
        } catch { return new Response("ok"); }
        if (typeof orderId !== "string" || !/^order_[A-Za-z0-9]{1,40}$/.test(orderId)) return new Response("ok");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: p } = await supabaseAdmin.from("payments").select("id").eq("gateway_order_id", orderId).maybeSingle();
        if (!p) return new Response("ok");
        try {
          const { confirmPaymentRow } = await import("@/lib/razorpay.server");
          await confirmPaymentRow(p.id);
          return new Response("ok");
        } catch (e) { console.error(e); return new Response("retry", { status: 500 }); }
      },
    },
  },
});
