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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarveshchonde.dev";

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
     * `js-anim` is set statically rather than by an inline script: under the
     * nonce CSP in middleware.ts a hand-written inline <script> would need the
     * nonce threaded through, which forces the whole tree dynamic. The
     * <noscript> block below is the JS-disabled escape hatch — without it,
     * every [data-anim] element would stay at opacity 0 forever.
     */
    <html lang="en" className={`js-anim ${inter.variable} ${jetbrains.variable}`}>
      <head>
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
