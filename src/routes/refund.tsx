import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/trust/Trust";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — FutureTalent AI" },
      {
        name: "description",
        content:
          "Fair refunds for the FutureTalent AI ₹99 Job Hunt Pass: full refund on technical failures or within 48 hours if unused.",
      },
      { property: "og:title", content: "Refund Policy — FutureTalent AI" },
      {
        property: "og:description",
        content:
          "Fair refunds for the FutureTalent AI ₹99 Job Hunt Pass: full refund on technical failures or within 48 hours if unused.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ats.businessdesignplaybook.com/refund" }],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Refund Policy" updated="23 November 2026">
      <h2>Simple and fair</h2>
      <ul>
        <li>
          <b>Full refund</b> if a technical problem stops you using the pass you paid for.
        </li>
        <li>
          <b>Full refund</b> within 48 hours of purchase if you haven't used any pass scan, rescore
          or download.
        </li>
        <li>Charged twice by mistake? We refund the duplicate in full.</li>
      </ul>
      <h2>How to ask</h2>
      <p>
        Write to us via{" "}
        <a className="underline" href="https://businessdesignplaybook.com/">
          businessdesignplaybook.com
        </a>{" "}
        from your registered email with your Razorpay payment ID. Approved refunds go back to your
        original UPI or card in 5–7 working days.
      </p>
      <h2>No hidden charges</h2>
      <p>We never save your card or set up auto-debit, so there is nothing to cancel.</p>
    </LegalPage>
  );
}
