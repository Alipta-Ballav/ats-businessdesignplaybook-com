import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends the welcome email once per user (idempotency key is the user id). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims.email;
    if (typeof email !== "string" || !email) return { sent: false };
    const metadata = context.claims.user_metadata;
    const fullName =
      typeof metadata === "object" && metadata !== null && "full_name" in metadata
        ? metadata["full_name"]
        : undefined;
    const name = typeof fullName === "string" ? fullName : undefined;
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    try {
      const r = await sendTemplateEmail("welcome", email, {
        templateData: name ? { name } : {},
        idempotencyKey: `welcome-${context.userId}`,
      });
      // Owner alert, sent once per new user only when the welcome actually went out.
      if (r.sent)
        await sendTemplateEmail("new-signup-alert", "alipta.ballav@gmail.com", {
          templateData: name ? { name, email } : { email },
          idempotencyKey: `signup-alert-${context.userId}`,
        }).catch((e) => console.error("signup alert failed", e));
      return { sent: r.sent };
    } catch (e) {
      console.error("welcome email failed", e);
      return { sent: false };
    }
  });
