import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Admin dashboard · FutureTalent ATS" },
    { name: "description", content: "Private admin view of sign-ups, payments and abandoned checkouts." },
    { property: "og:title", content: "Admin dashboard · FutureTalent ATS" },
    { property: "og:description", content: "Private admin view of sign-ups and payments." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminPage,
});

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
type Tab = "users" | "paid" | "abandoned";

function AdminPage() {
  const fetchIt = useServerFn(getAdminOverview);
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchIt() });
  const [tab, setTab] = useState<Tab>("users");
  if (q.isLoading) return <div className="mx-auto max-w-6xl p-8 text-muted-foreground">Loading…</div>;
  if (q.error) return <div className="mx-auto max-w-6xl p-8 text-destructive">{(q.error as Error).message}</div>;
  const { users, payments } = q.data!;
  const paid = payments.filter((p) => p.status === "completed");
  const paidUsers = new Set(paid.map((p) => p.user_id));
  const abandoned = payments.filter((p) => p.status !== "completed" && !paidUsers.has(p.user_id));
  const revenue = paid.reduce((s, p) => s + p.amount, 0);
  const stats = [
    ["Registered", users.length], ["Paying customers", paidUsers.size],
    ["Revenue", inr(revenue)], ["Abandoned checkouts", abandoned.length],
  ] as const;
  const tabs: [Tab, string][] = [["users", `Registrations (${users.length})`], ["paid", `Payments (${paid.length})`], ["abandoned", `Abandoned (${abandoned.length})`]];
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <button onClick={() => q.refetch()} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Refresh</button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-3 py-1.5 text-sm ${tab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          {tab === "users" ? (<>
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Email", "Name", "Signed up", "Email verified", "Last sign-in", "Scans", "Paid", "Roles"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 font-medium">{u.email}</td><td className="p-3">{u.name || "—"}</td>
                <td className="p-3">{when(u.createdAt)}</td><td className="p-3">{u.confirmed ? "Yes" : "No"}</td>
                <td className="p-3">{when(u.lastSignIn)}</td><td className="p-3">{u.scans}</td>
                <td className="p-3">{u.paid ? inr(u.revenue) : "—"}</td><td className="p-3 text-muted-foreground">{u.roles.join(", ")}</td>
              </tr>))}</tbody>
          </>) : (<>
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Email", "Amount", "Status", "Started", "Paid at", "Razorpay order"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{(tab === "paid" ? paid : abandoned).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-medium">{p.email}</td><td className="p-3">{inr(p.amount)}</td>
                <td className="p-3">{p.status === "completed" ? "Paid" : p.status === "failed" ? "Failed" : "Not completed"}</td>
                <td className="p-3">{when(p.created_at)}</td><td className="p-3">{when(p.paid_at)}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{p.gateway_order_id ?? "—"}</td>
              </tr>))}</tbody>
          </>)}
        </table>
        {tab !== "users" && (tab === "paid" ? paid : abandoned).length === 0 && <p className="p-6 text-center text-muted-foreground">Nothing here yet.</p>}
      </div>
    </div>
  );
}
