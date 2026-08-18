import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * Content-Security-Policy is deliberately NOT set here — it is emitted
 * per-request from `middleware.ts` so each response carries a fresh nonce.
 * A static CSP in this file would have to fall back to `'unsafe-inline'`
 * for Next's hydration scripts, which defeats most of the point.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Never ship the source path of the framework in responses.
  poweredByHeader: false,

  images: {
    // Only GitHub-hosted avatars/assets are ever rendered through next/image.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "opengraph.githubassets.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    // Trim the client bundle: only the icons/utilities actually imported
    // survive tree-shaking from these packages.
    optimizePackageImports: ["framer-motion"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The webhook must never be cached by any intermediary.
        source: "/api/github/webhook",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
