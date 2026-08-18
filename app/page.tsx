import { profile } from "@/data/profile";
import { About } from "@/components/about/About";
import { Contact } from "@/components/contact/Contact";
import { GitHubSection } from "@/components/github/GitHubSection";
import { Hero } from "@/components/hero/Hero";
import { SectionProgress } from "@/components/navigation/SectionProgress";
import { ProjectExplorer } from "@/components/projects/ProjectExplorer";
import { StickyShowcase } from "@/components/projects/StickyShowcase";
import { SecurityMindset } from "@/components/security/SecurityMindset";
import { TechStack } from "@/components/stack/TechStack";
import { loadPortfolioData } from "@/lib/github";

/**
 * Incremental static regeneration: the rendered page is reused for five
 * minutes, then rebuilt in the background on the next request. Combined with
 * the process-local cache in lib/cache/store.ts and the webhook in
 * app/api/github/webhook, GitHub is contacted rarely and the page is never
 * waiting on it.
 */
export const revalidate = 300;

export default async function HomePage() {
  // One call, three upstream requests settled independently. GitHub being down
  // degrades individual sections; it never fails the page.
  const data = await loadPortfolioData();

  return (
    <>
      <SectionProgress />

      <Hero stats={data.stats} meta={data.meta} />

      <StickyShowcase projects={data.flagship} />

      <ProjectExplorer initialProjects={data.projects} />

      <GitHubSection
        stats={data.stats}
        activity={data.activity}
        currentFocus={data.currentFocus}
        meta={data.meta}
      />

      <TechStack groups={data.technologies} />

      <SecurityMindset />

      <About />

      <Contact />

      {/*
       * Structured data. Only facts that are either local identity (name,
       * education, links) or directly verifiable — no invented job titles,
       * employers or awards.
       *
       * `application/ld+json` is never executed, so the nonce CSP in
       * middleware.ts does not block it.
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
            url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarveshchonde.dev",
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
    </>
  );
}
