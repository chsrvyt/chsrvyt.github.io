import type { NextConfig } from "next";

/**
 * Static export, targeted at GitHub Pages (chsrvyt.github.io).
 *
 * Pages serves files, not a Node process. That rules out middleware, route
 * handlers and ISR, so those are gone — see README for what replaced them:
 *
 *   nonce CSP (middleware)   → static CSP via <meta> in app/layout.tsx
 *   /api/github/* proxy      → the browser calls api.github.com directly
 *                              (lib/github/browser.ts); GitHub's REST API
 *                              sends permissive CORS headers for public data
 *   ISR revalidate           → data baked at build time, refreshed by a
 *                              scheduled GitHub Actions rebuild
 *   webhook cache-bust       → workflow_dispatch + cron in the same workflow
 *
 * The site is still genuinely live: the build bakes current data into the HTML
 * (good for SEO and first paint) and the client re-reads GitHub on load, so a
 * repo created between rebuilds still shows up.
 */
const nextConfig: NextConfig = {
  output: "export",

  /*
   * Emits `projects/<slug>/index.html` rather than `projects/<slug>.html`.
   * Pages resolves directory URLs reliably; extensionless file resolution is
   * not something to depend on.
   */
  trailingSlash: true,

  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    /*
     * Required: the optimizer is a server route and cannot exist in an export.
     * Remote images are loaded directly by the browser instead.
     */
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "opengraph.githubassets.com" },
    ],
  },

  experimental: {
    optimizePackageImports: ["framer-motion"],
  },

  /*
   * No `headers()` here. Response headers are the host's job, and GitHub Pages
   * does not let you set them — HSTS, X-Frame-Options and Permissions-Policy
   * are simply unavailable on this host. What can be expressed in a <meta>
   * CSP is applied in app/layout.tsx; the rest is a documented cost of
   * choosing Pages over a Node host.
   */
};

export default nextConfig;
