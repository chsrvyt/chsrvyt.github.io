import { NextResponse, type NextRequest } from "next/server";

/**
 * Nonce-based Content-Security-Policy.
 *
 * Next.js reads the `Content-Security-Policy` header off the *request* and
 * automatically stamps the nonce onto the framework's own inline scripts, so
 * we never need `'unsafe-inline'` in `script-src`.
 *
 * `'strict-dynamic'` lets the nonce'd bootstrap script load the chunks it
 * needs without us enumerating them; browsers that don't support it fall back
 * to the `'self'` source expression.
 *
 * `style-src` keeps `'unsafe-inline'`: server-rendered `style="..."` attributes
 * are blocked without it, and style injection is a far lower-severity sink than
 * script injection. GSAP mutates styles through the CSSOM, which CSP does not
 * govern, so animation is unaffected either way.
 */
export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://avatars.githubusercontent.com https://raw.githubusercontent.com https://opengraph.githubassets.com`,
    `font-src 'self' data:`,
    // The browser only ever talks to this origin; GitHub is reached server-side.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `manifest-src 'self'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]
    .filter(Boolean)
    .join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and pre-optimised images — those are
     * immutable files that gain nothing from a per-request nonce.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
