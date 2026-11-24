import { createFileRoute, Link } from "@tanstack/react-router";
import { DeleteAccount } from "@/components/DeleteAccount";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account settings · FutureTalent AI" },
      { name: "description", content: "Manage your FutureTalent AI account, pass and data." },
      { property: "og:title", content: "Account settings · FutureTalent AI" },
      {
        property: "og:description",
        content: "Manage your FutureTalent AI account, pass and data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="font-display text-3xl">Account</h1>
      <p className="text-sm text-muted-foreground">
        See your pass and payments on the{" "}
        <Link to="/pass" className="underline">
          Pass page
        </Link>
        .
      </p>
      <DeleteAccount />
    </main>
  );
}
