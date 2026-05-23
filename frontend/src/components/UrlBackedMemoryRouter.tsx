"use client";

import { useEffect, type ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";

function pathFromWindow(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search;
}

/** Συγχρονίζει MemoryRouter ↔ address bar (χωρίς swap σε BrowserRouter → λιγότερο CLS). */
function UrlHistoryBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onPop = () => {
      navigate(pathFromWindow(), { replace: true });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [navigate]);

  useEffect(() => {
    const next = location.pathname + location.search;
    const current = pathFromWindow();
    if (next !== current) {
      window.history.pushState(null, "", next);
    }
  }, [location.pathname, location.search]);

  return null;
}

type UrlBackedMemoryRouterProps = {
  ssrPath: string;
  children: ReactNode;
};

export default function UrlBackedMemoryRouter({ ssrPath, children }: UrlBackedMemoryRouterProps) {
  const initial = typeof window === "undefined" ? ssrPath : pathFromWindow();

  return (
    <MemoryRouter initialEntries={[initial]} initialIndex={0}>
      <UrlHistoryBridge />
      {children}
    </MemoryRouter>
  );
}
