import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends the welcome email once per user (idempotency key is the user id). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) return { sent: false };
    const name = (context.claims as any)?.user_metadata?.full_name as string | undefined;
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    try {
      const r = await sendTemplateEmail("welcome", email, { templateData: name ? { name } : {}, idempotencyKey: `welcome-${context.userId}` });
      return { sent: r.sent };
    } catch (e) { console.error("welcome email failed", e); return { sent: false }; }
  });
