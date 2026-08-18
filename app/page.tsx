import { profile } from "@/data/profile";
import { About } from "@/components/about/About";
import { Contact } from "@/components/contact/Contact";
import { GitHubSection } from "@/components/github/GitHubSection";
import { LiveDataProvider } from "@/components/github/LiveDataProvider";
import { Hero } from "@/components/hero/Hero";
import { SectionProgress } from "@/components/navigation/SectionProgress";
import { ProjectExplorer } from "@/components/projects/ProjectExplorer";
import { StickyShowcase } from "@/components/projects/StickyShowcase";
import { SecurityMindset } from "@/components/security/SecurityMindset";
import { TechStack } from "@/components/stack/TechStack";
import { loadPortfolioData } from "@/lib/github";

/**
 * Composed once at build time.
 *
 * `loadPortfolioData()` runs during `next build`, so the exported HTML ships
 * with real repositories, real commit subjects and real counts — a crawler and
 * a first paint both get content, not a loading state.
 *
 * From there `LiveDataProvider` takes over in the browser and re-reads GitHub
 * directly, which is what keeps the page current between the scheduled
 * rebuilds. See lib/github/browser.ts.
 */
export default async function HomePage() {
  // Three upstream requests, settled independently: GitHub failing on one
  // resource degrades that section rather than failing the build.
  const data = await loadPortfolioData();

  return (
    <LiveDataProvider
      initialProjects={data.projects}
      initialStats={data.stats}
      builtAt={data.meta.syncedAt}
    >
      <SectionProgress />

      <Hero />

      <StickyShowcase />

      <ProjectExplorer />

      <GitHubSection activity={data.activity} />

      <TechStack groups={data.technologies} />

      <SecurityMindset />

      <About />

      <Contact />

      {/*
       * Structured data. Only facts that are either local identity (name,
       * education, links) or directly verifiable — no invented job titles,
       * employers or awards.
       *
       * `application/ld+json` is never executed, so the CSP does not block it.
       */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: profile.name,
            alternateName: profile.short,
            description: profile.positioning,
            email: profile.links.email,
            url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://chsrvyt.github.io",
            sameAs: [profile.links.github, profile.links.linkedin],
            address: {
              "@type": "PostalAddress",
              addressLocality: "Nagpur",
              addressRegion: "Maharashtra",
              addressCountry: "IN",
            },
            alumniOf: {
              "@type": "CollegeOrUniversity",
              name: profile.education.institution,
            },
            knowsAbout: [
              "Cybersecurity",
              "Application Security",
              "AI Engineering",
              "Full-Stack Development",
              "Automation",
            ],
          }),
        }}
      />
    </LiveDataProvider>
  );
}
