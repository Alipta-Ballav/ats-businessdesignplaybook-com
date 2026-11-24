import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/trust/Trust";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — FutureTalent AI" },
      {
        name: "description",
        content:
          "Plain terms for FutureTalent AI: free first scan, ₹99 one-time 30-day Job Hunt Pass with 5 scans, no auto-renewal.",
      },
      { property: "og:title", content: "Terms of Service — FutureTalent AI" },
      {
        property: "og:description",
        content:
          "Plain terms for FutureTalent AI: free first scan, ₹99 one-time 30-day Job Hunt Pass with 5 scans, no auto-renewal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ats.businessdesignplaybook.com/terms" }],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Terms of Service" updated="23 November 2026">
      <h2>The service</h2>
      <p>
        FutureTalent AI scores resumes for Product & UX designers and suggests improvements. Scores
        are guidance, not a guarantee of interviews or job offers.
      </p>
      <h2>Free and paid use</h2>
      <ul>
        <li>Your first scan, recommendations and AI suggestions are free.</li>
        <li>
          The ₹99 Job Hunt Pass is a one-time payment valid for 30 days. It includes 5 full scans,
          verified rescoring after edits and Word downloads.
        </li>
        <li>It never renews automatically. Buy another pass only if you want one.</li>
      </ul>
      <h2>Your content</h2>
      <p>
        You own your resume and every edit. You are responsible for keeping it truthful. Our AI only
        rephrases what you wrote or add.
      </p>
      <h2>Fair use</h2>
      <p>A pass is for one person. Please don't share accounts.</p>
    </LegalPage>
  );
}
