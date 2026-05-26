import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Στο Docker dev: STRAPI_INTERNAL_URL=http://strapi:1337. Τοπικά χωρίς Docker: αφήσε default. */
function devStrapiOrigin(): string {
  const raw = process.env.STRAPI_INTERNAL_URL ?? "http://127.0.0.1:1337";
  return raw.replace(/\/$/, "");
}

const isProdBuild = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* Μόνο στο `next build` — στο `next dev` σπάει chunks (ENOENT layout.js). */
  ...(isProdBuild ? { output: "export" as const } : {}),
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: __dirname,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@tanstack/react-query"],
    optimizeCss: true,
  },
  async rewrites() {
    /* Static export στην παραγωγή: χωρίς Node server τα rewrites δεν τρέχουν (αντικατάσταση: nginx.conf). */
    if (process.env.NODE_ENV !== "development") return [];
    const origin = devStrapiOrigin();
    return [
      { source: "/admin", destination: `${origin}/admin` },
      { source: "/admin/:path*", destination: `${origin}/admin/:path*` },
      { source: "/api/:path*", destination: `${origin}/api/:path*` },
      // Ίδιο λεξικό διαδρομών με nginx.conf (συμπ. sync-program-status) — dev admin από :3000.
      ...(
        [
          "content-manager",
          "content-type-builder",
          "i18n",
          "users-permissions",
          "upload",
          "email",
        ] as const
      ).flatMap((seg) => [
        { source: `/${seg}`, destination: `${origin}/${seg}` },
        { source: `/${seg}/:path*`, destination: `${origin}/${seg}/:path*` },
      ]),
      { source: "/sync-program-status", destination: `${origin}/sync-program-status` },
      { source: "/uploads/:path*", destination: `${origin}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
