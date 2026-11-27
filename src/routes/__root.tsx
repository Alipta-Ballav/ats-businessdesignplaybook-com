import { Logo } from "@/components/Logo";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlanBadge } from "@/components/PassStatus";
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
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap",
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
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
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
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
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  const active = { className: "bg-muted text-foreground" };
  const navLink =
    "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";
  const quiet = "rounded-md border px-3 py-1.5 text-sm hover:bg-muted";
  const primary =
    "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-4 sm:px-6">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>
        <span className="ml-auto sm:order-3">
          <ThemeToggle />
        </span>
        <span aria-hidden="true" className="basis-full sm:hidden" />
        <nav className="order-3 flex items-center gap-1 sm:order-2 sm:ml-auto">
          {me?.role === "candidate" && (
            <Link to="/candidate" activeProps={active} className={navLink}>
              <span className="hidden sm:inline">Check my resume</span>
              <span className="sm:hidden">Resume</span>
            </Link>
          )}
          {!me && (
            <Link to="/check" activeProps={active} className={navLink}>
              <span className="hidden sm:inline">Resume check</span>
              <span className="sm:hidden">Resume</span>
            </Link>
          )}
          {me && (
            <Link to="/my-resumes" activeProps={active} className={navLink}>
              My resumes
            </Link>
          )}
          <Link to="/pass" activeProps={active} className={navLink}>
            {me ? "My pass" : "Pricing"}
          </Link>
        </nav>
        <div className="order-4 flex items-center gap-1.5 sm:border-l sm:pl-3 sm:gap-2">
          {me ? (
            <>
              <PlanBadge />
              <Link to="/account" className={navLink}>
                <span className="hidden sm:inline">{me.name || me.email} · </span>Account
              </Link>
              <button onClick={signOut} className={quiet}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signin" }} className={quiet}>
                Sign in
              </Link>
              <Link to="/auth" search={{ mode: "signup" }} className={primary}>
                <span className="hidden sm:inline">Sign up free</span>
                <span className="sm:hidden">Sign up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
