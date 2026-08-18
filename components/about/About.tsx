"use client";

import { useRef } from "react";
import { profile } from "@/data/profile";
import { Section } from "@/components/ui/Section";
import { useGsap } from "@/lib/animations/context";
import { revealLines } from "@/lib/animations/text";

/**
 * About, education and certifications.
 *
 * The statement paragraphs use the masked line reveal from
 * lib/animations/text.ts — split into visual lines, each clipped by an
 * overflow-hidden wrapper, revealed on scroll. Under reduced motion the split
 * never happens at all and the text simply renders.
 *
 * Certifications render only what data/profile.ts declares. Entries without a
 * public credential URL show no "verify" affordance rather than a dead link.
 */
export function About() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGsap(
    ({ reduced, q }) => {
      const paragraphs = q("[data-reveal-lines]");
      const cleanups = paragraphs.map((paragraph, index) =>
        revealLines(paragraph, {
          trigger: paragraph,
          start: "top 84%",
          reduced,
          delay: index * 0.05,
        }),
      );

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    },
    [],
    rootRef,
  );

  return (
    <Section
      id="about"
      index="06"
      eyebrow="About"
      title="Learning by building, in public."
    >
      <div ref={rootRef} className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        {/* ---------------- statement ---------------- */}
        <div className="flex flex-col gap-8">
          {profile.about.map((paragraph, index) => (
            <p
              key={paragraph}
              data-reveal-lines
              className={
                index === 0
                  ? "text-title font-medium text-chalk opacity-0"
                  : "max-w-xl text-lede text-mute opacity-0"
              }
            >
              {paragraph}
            </p>
          ))}

          <p data-anim="up" className="max-w-xl text-lede text-mute">
            {profile.positioning}
          </p>
        </div>

        {/* ---------------- education + credentials ---------------- */}
        <div className="flex flex-col gap-12">
          <div data-anim="up">
            <h3 className="eyebrow mb-6 text-bone">Education</h3>
            <div className="hairline pt-6">
              <p className="text-xl font-medium text-chalk">
                {profile.education.institution}
              </p>
              <p className="mt-2 text-mute">{profile.education.degree}</p>
              <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-signal">
                {profile.education.start} — {profile.education.end}
                <span className="ml-3 text-dim">{profile.education.note}</span>
              </p>
            </div>
          </div>

          <div data-anim="up">
            <h3 className="eyebrow mb-6 text-bone">Certifications</h3>
            <ul className="flex flex-col">
              {profile.certifications.map((certification) => (
                <li
                  key={`${certification.issuer}-${certification.name}`}
                  className="hairline flex items-baseline justify-between gap-6 py-4"
                >
                  <div>
                    <p className="text-bone">{certification.name}</p>
                    <p className="mt-1 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-dim">
                      {certification.issuer}
                    </p>
                  </div>
                  {certification.credentialUrl ? (
                    <a
                      href={certification.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-wipe shrink-0 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-signal"
                    >
                      Verify
                      <span className="sr-only"> {certification.name} (opens in a new tab)</span>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div data-anim="up" className="hairline pt-6">
            <p className="font-mono text-[0.64rem] uppercase leading-relaxed tracking-[0.16em] text-dim">
              Based in {profile.location}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
