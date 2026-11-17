import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Card } from "@/components/ui-bits";
import type { Role } from "@/lib/db";

type Search = { mode?: "signin" | "signup" | undefined; as?: Role | undefined; redirect?: string | undefined };
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s["mode"] === "signup" ? "signup" : s["mode"] === "signin" ? "signin" : undefined,
    as: s["as"] === "recruiter" ? "recruiter" : s["as"] === "candidate" ? "candidate" : undefined,
    redirect: typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//") ? s["redirect"] : undefined,
  }),
  head: () => ({ meta: [
    { title: "Sign in or create an account — FutureTalent AI" },
    { name: "description", content: "Join as a candidate to check your resume score, or as a recruiter to evaluate applicants." },
    { property: "og:title", content: "Join FutureTalent AI" },
    { property: "og:description", content: "Candidates check their fit. Recruiters evaluate with evidence." },
  ] }),
  component: AuthPage,
});

const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";
const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function AuthPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? (search.as ? "signup" : "signin"));
  const [role, setRole] = useState<Role>(search.as ?? "candidate");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const target = search.redirect ?? "/welcome";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: target, replace: true }); });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin + "/welcome", data: { full_name: name, role } } });
        if (error) throw error;
        if (data.session) nav({ to: "/welcome" }); else setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        nav({ to: target });
      }
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const social = async (p: "google" | "lovable") => {
    if (mode === "signup") sessionStorage.setItem("ft-role", role);
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/welcome" });
    if (r.error) { toast.error(r.error.message ?? "Sign-in failed"); return; }
    if (r.redirected) return;
    nav({ to: "/welcome" });
  };

  if (sent) return (
    <Card className="mx-auto max-w-md text-center"><h1 className="font-display text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {email}. Open it to finish creating your account.</p></Card>
  );
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-3xl">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <Card className="space-y-4">
        {mode === "signup" && (
          <div>
            <p className="mb-2 text-sm">I am a…</p>
            <div className="grid grid-cols-2 gap-2">
              {([["candidate", "Job seeker", "Check my resume score"], ["recruiter", "Recruiter", "Evaluate applicants"]] as const).map(([k, t, d]) => (
                <button type="button" key={k} onClick={() => setRole(k)} className={`rounded-md border p-3 text-left ${role === k ? "border-primary bg-accent" : ""}`}>
                  <span className="block text-sm font-medium">{t}</span><span className="text-xs text-muted-foreground">{d}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-2">
          <button type="button" onClick={() => social("google")} className="flex h-10 items-center justify-center gap-2.5 rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]"><GoogleG />Continue with Google</button>
          <button type="button" onClick={() => social("lovable")} className="flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium"><LovableMark />Continue with Lovable</button>
        </div>
        <div className="text-center text-xs text-muted-foreground">or with email</div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && <label className="block text-sm">Full name<input required className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>}
          <label className="block text-sm">Email<input required type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm">Password<input required type="password" minLength={8} className={input} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <button className="underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Sign in" : "Create an account"}</button>
      </p>
      <p className="text-center text-xs"><Link to="/" className="text-muted-foreground">← Back home</Link></p>
    </div>
  );
}
