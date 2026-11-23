import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/trust/Trust";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy — FutureTalent AI" }, { name: "description", content: "How FutureTalent AI protects designers' resumes and NDA work: no sharing, no AI training, deletable data." },
    { property: "og:title", content: "Privacy Policy — FutureTalent AI" }, { property: "og:description", content: "How FutureTalent AI protects designers' resumes and NDA work: no sharing, no AI training, deletable data." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ], links: [{ rel: "canonical", href: "https://ats.businessdesignplaybook.com/privacy" }] }),
  component: Page,
});

function Page() {
  return <LegalPage title="Privacy Policy" updated="23 November 2026">
    <h2>Our pledge to designers</h2>
    <p>Your resume often holds confidential client and NDA work. We treat it that way. We never sell or share it, and it is never used to train AI models.</p>
    <h2>What we collect</h2>
    <ul><li>Your resume text, which your browser reads from the file you choose.</li><li>Your email and name if you create an account (email or Google sign-in).</li><li>Scores, saved versions and bookmarks you choose to save.</li><li>Payment records from Razorpay: amount, date and status. We never see or store card or UPI details.</li></ul>
    <h2>How your resume is used</h2>
    <p>To score it, the text is sent once to an AI model that only extracts quotes from it. The final score is calculated by fixed rules on our side. The AI provider processes it only to return that answer, not to train models.</p>
    <h2>Visitor analytics</h2>
    <p>We use Lovable's built-in visitor analytics. It uses no cookies, stores nothing on your device, doesn't keep IP addresses and doesn't identify you. It records pages visited, where visitors came from, country, browser, operating system and device type, time on site, page speed, errors, clicks and in-app actions such as running a scan. Detailed data is kept for 90 days and daily summaries for a year. Lovable collects this data for us. <a className="underline" href="https://lovable.dev/privacy">Lovable's privacy policy</a> explains how it handles it.</p>
    <p>Signing in stores a login session in your browser. Razorpay loads its checkout only when you choose to pay.</p>
    <h2>Deleting your data</h2>
    <p>You can delete saved resume versions any time from My resumes. To delete your whole account, write to us from your registered email and we'll erase it within 7 days.</p>
    <h2>Contact</h2>
    <p>Questions: reach us via <a className="underline" href="https://businessdesignplaybook.com/">businessdesignplaybook.com</a>.</p>
  </LegalPage>;
}
