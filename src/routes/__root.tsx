import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";

import appCss from "../styles.css?url";
import { audio } from "../lib/audio";

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
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Inside the Machine" },
      { name: "description", content: "A scroll-driven 3D journey from a computer to a transistor." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Inside the Machine" },
      { property: "og:description", content: "A scroll-driven 3D journey from a computer to a transistor." },
      { property: "og:url", content: "https://inside-the-machine-one.vercel.app/" },
      { property: "og:image", content: "https://inside-the-machine-one.vercel.app/preview.gif" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Inside the Machine" },
      { name: "twitter:description", content: "A scroll-driven 3D journey from a computer to a transistor." },
      { name: "twitter:image", content: "https://inside-the-machine-one.vercel.app/preview.gif" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <EasterEgg />
    </QueryClientProvider>
  );
}

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

function EasterEgg() {
  const [found, setFound] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (found) {
        setFound(false);
        return;
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      idx.current = key === KONAMI[idx.current] ? idx.current + 1 : key === KONAMI[0] ? 1 : 0;
      if (idx.current === KONAMI.length) {
        idx.current = 0;
        audio.init();
        audio.startup();
        setFound(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [found]);

  if (!found) return null;
  return (
    <div className="easter-egg" onClick={() => setFound(false)}>
      <div className="easter-egg-box">
        <p>&gt; BACKDOOR FOUND</p>
        <p>&gt; You entered the Konami code.</p>
        <p>&gt; The truth: the entire journey happened between two keystrokes.</p>
        <p className="easter-egg-dim">&gt; press anywhere to return</p>
      </div>
    </div>
  );
}
