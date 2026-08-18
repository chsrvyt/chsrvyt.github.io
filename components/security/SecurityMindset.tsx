"use client";

import { useRef } from "react";
import { profile } from "@/data/profile";
import { Section } from "@/components/ui/Section";
import { useGsap } from "@/lib/animations/context";

const PIPELINE = [
  { id: "request", label: "Request", note: "Untrusted input arrives" },
  { id: "validation", label: "Validation", note: "Shape and bounds checked" },
  { id: "authentication", label: "Authentication", note: "Who is calling?" },
  { id: "authorization", label: "Authorization", note: "May they do this?" },
  { id: "application", label: "Application", note: "Business logic runs" },
  { id: "database", label: "Database", note: "Least-privilege access" },
] as const;

/**
 * Security section.
 *
 * The diagram is the argument: a request crosses validation, authentication
 * and authorization *before* it reaches application logic, and each stage is a
 * place the request can be rejected. A packet travels the rail on a loop and
 * lights each stage as it passes, so the order is legible without reading.
 *
 * The loop is killed entirely under reduced motion — a perpetually moving dot
 * is exactly the kind of thing that setting exists to stop.
 */
export function SecurityMindset() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGsap(
    ({ gsap, reduced, q, root }) => {
      if (reduced) return;

      const packet = q("[data-packet]")[0];
      const stages = q("[data-stage]");
      const rail = q("[data-rail]")[0];
      if (!packet || stages.length === 0 || !rail) return;

      // Positions are measured from the DOM so the packet lands on the stage
      // markers at any viewport width.
      const railTop = rail.getBoundingClientRect().top;
      const stops = stages.map((stage) => {
        const marker = stage.querySelector<HTMLElement>("[data-stage-node]");
        const target = marker ?? stage;
        return target.getBoundingClientRect().top - railTop + target.offsetHeight / 2;
      });

      gsap.set(packet, { y: stops[0] ?? 0, opacity: 0 });

      const timeline = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.1,
        scrollTrigger: {
          trigger: root,
          start: "top 72%",
          end: "bottom 20%",
          // Off-screen loops burn frames for nobody.
          toggleActions: "play pause resume pause",
        },
      });

      timeline.to(packet, { opacity: 1, duration: 0.28 });

      stops.forEach((stop, index) => {
        if (index === 0) return;
        timeline
          .to(packet, { y: stop, duration: 0.5, ease: "power2.inOut" })
          .to(
            stages[index]!,
            { color: "#34d399", duration: 0.22, yoyo: true, repeat: 1 },
            "<",
          );
      });

      timeline.to(packet, { opacity: 0, duration: 0.3 });

      return () => {
        timeline.kill();
      };
    },
    [],
    rootRef,
  );

  return (
    <Section
      id="security"
      index="05"
      eyebrow="Security mindset"
      title="Designed to fail safely."
      intro={profile.security.statement}
    >
      <div ref={rootRef} className="grid gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
        {/* ---------------- focus areas ---------------- */}
        <ul className="flex flex-col">
          {profile.security.focus.map((area) => (
            <li key={area.title} data-anim="up" className="hairline py-6">
              <h3 className="text-lg font-medium text-chalk">{area.title}</h3>
              <p className="mt-2 max-w-md leading-relaxed text-mute">{area.detail}</p>
            </li>
          ))}
        </ul>

        {/* ---------------- request pipeline ---------------- */}
        <div data-anim="right">
          <h3 className="eyebrow mb-8 text-bone">Request path</h3>

          <div data-rail className="relative pl-10">
            <span
              aria-hidden="true"
              className="absolute left-[7px] top-3 block h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-signal/50 via-chalk/12 to-signal/30"
            />
            {/* The travelling packet */}
            <span
              aria-hidden="true"
              data-packet
              className="absolute left-[3px] top-0 block h-2.5 w-2.5 rounded-full bg-signal opacity-0 shadow-[0_0_12px_2px_rgba(16,185,129,0.55)]"
            />

            <ol className="flex flex-col">
              {PIPELINE.map((stage, index) => (
                <li key={stage.id} data-stage className="relative py-4 text-mute">
                  <span
                    aria-hidden="true"
                    data-stage-node
                    className="absolute -left-10 top-[1.35rem] block h-1.5 w-1.5 translate-x-[3px] rounded-full bg-chalk/30"
                  />
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-[0.6rem] tracking-[0.16em] text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-current">
                        {stage.label}
                      </p>
                      <p className="mt-1 text-sm text-dim">{stage.note}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-8 hairline pt-6 font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.16em] text-dim">
            This site applies the same shape · nonce CSP · signed webhooks ·
            server-only tokens · rate-limited endpoints
          </p>
        </div>
      </div>
    </Section>
  );
}
