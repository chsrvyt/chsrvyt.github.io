import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { profile } from "@/data/profile";
import { BackgroundField } from "@/components/ui/BackgroundField";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Nav } from "@/components/navigation/Nav";
import { Footer } from "@/components/footer/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-jet",
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chsrvyt.github.io";

const title = "Sarvesh Chonde | Cybersecurity • AI • Full-Stack Developer";
const description =
  "Portfolio of Sarvesh Chonde — a Computer Science student focused on cybersecurity, AI engineering, full-stack development and intelligent automation.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | Sarvesh Chonde",
  },
  description,
  applicationName: "SRV.DEV",
  authors: [{ name: profile.name, url: profile.links.github }],
  creator: profile.name,
  keywords: [
    "Sarvesh Chonde",
    "SRV",
    "cybersecurity developer",
    "AI engineering",
    "full-stack developer",
    "Symbiosis Institute of Technology Nagpur",
    "application security",
    "Next.js portfolio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Sarvesh Chonde",
    title,
    description,
    locale: "en_IN",
    /*
     * No `images` entry here on purpose. app/opengraph-image.png is a static
     * metadata file, so Next emits the og:image tag itself — and because the
     * asset has a real extension, GitHub Pages serves it as image/png. The
     * generated (.tsx ImageResponse) form emitted an extensionless URL, which
     * Pages serves as application/octet-stream and scrapers reject.
     */
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /*
     * `js-anim` is set statically rather than by an inline script, and the
     * <noscript> block is the JS-disabled escape hatch — without it every
     * [data-anim] element would stay at opacity 0 forever.
     */
    <html lang="en" className={`js-anim ${inter.variable} ${jetbrains.variable}`}>
      <head>
        {/*
         * CSP as a <meta>, because GitHub Pages cannot set response headers.
         *
         * This is a real downgrade from the nonce-based policy a Node host
         * allowed, and it is worth naming rather than glossing:
         *
         *   - `script-src` needs 'unsafe-inline'. A static export has no
         *     request to attach a nonce to, and Next emits inline bootstrap
         *     scripts. Hashing them would break on every rebuild.
         *   - `frame-ancestors` is ignored in meta CSP and cannot be set here
         *     at all, so clickjacking protection depends on whatever
         *     X-Frame-Options GitHub Pages happens to send.
         *   - HSTS and Permissions-Policy are headers only. Not available.
         *
         * What remains is still worth having: a closed default-src, no
         * object-src, a locked base-uri and form-action, and an explicit
         * allow-list for the only third-party origins this site talks to.
         */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://opengraph.githubassets.com https://avatars.githubusercontent.com https://raw.githubusercontent.com",
            "font-src 'self' data:",
            // The browser reads public GitHub data directly on this host.
            "connect-src 'self' https://api.github.com",
            "form-action 'self'",
            "frame-src 'none'",
            "upgrade-insecure-requests",
          ].join("; ")}
        />
        <noscript>
          <style>{`[data-anim],[data-anim-hidden]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="relative min-h-screen antialiased">
        <a href="#main" className="skip-link glass rounded-sm px-4 py-2 text-sm text-chalk">
          Skip to content
        </a>

        <BackgroundField />

        <MotionProvider>
          <Nav />
          <main id="main" tabIndex={-1} className="relative z-10 outline-none">
            {children}
          </main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
