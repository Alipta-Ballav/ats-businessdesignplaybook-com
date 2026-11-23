import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/trust/Trust";
import { supabase } from "@/integrations/supabase/client";
import { q } from "@/lib/db";
import { useNavigate } from "@tanstack/react-router";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FutureTalent AI" },
      { name: "description", content: "Future talent intelligence for recruiters." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "FutureTalent AI" },
      { property: "og:description", content: "Future talent intelligence for recruiters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen font-sans">
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-8"><Outlet /></main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

function Header() {
  const { queryClient } = Route.useRouteContext();
  const nav = useNavigate();
  const { data: me } = useQuery(q.me());
  const signOut = async () => {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  const active = { className: "text-foreground font-medium" };
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4">
        <Link to="/" className="font-display text-xl font-semibold">FutureTalent<span className="ml-1 rounded-md bg-gradient-primary px-1.5 text-sm text-primary-foreground">AI</span></Link>
        <nav className="flex flex-1 gap-4 text-sm text-muted-foreground">
          {me?.role === "candidate" && <Link to="/candidate" activeProps={active}>Check my resume</Link>}
          {!me && <Link to="/check" activeProps={active}>Resume check</Link>}
        </nav>
        {me ? (
          <div className="flex items-center gap-3 text-sm"><span className="hidden text-muted-foreground sm:inline">{me.name || me.email}{me.role && ` · ${me.role}`}</span>
            <button onClick={signOut} className="rounded-md border px-3 py-1.5">Sign out</button></div>
        ) : (
          <div className="flex gap-2 text-sm"><Link to="/auth" search={{ mode: "signin" }} className="rounded-md border px-3 py-1.5">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">Sign up</Link></div>
        )}
      </div>
    </header>
  );
}
