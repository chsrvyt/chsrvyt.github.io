"use client";

import { useRef } from "react";
import { Section } from "@/components/ui/Section";
import { useGsap } from "@/lib/animations/context";
import type { TechnologyGroup } from "@/lib/github/types";

/**
 * Technology stack, assembled from repository metadata.
 *
 * Two kinds of entry, visually distinguished rather than blended:
 *   - inferred: matched against a real repository's language, topics or
 *     description. Hovering shows which repositories evidenced it.
 *   - declared: used in work that public repo metadata doesn't reveal.
 *
 * The "inferred from public projects" note is not decoration — it is the
 * honest caveat on a list that a heuristic produced.
 */
export function TechStack({ groups }: { groups: TechnologyGroup[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGsap(
    ({ gsap, reduced, q, root }) => {
      if (reduced) return;

      const paths = q("[data-eco-line]") as unknown as SVGPathElement[];
      const nodes = q("[data-eco-node]");

      // Draw the connecting lines by animating the dash offset to zero.
      for (const path of paths) {
        const length = path.getTotalLength?.() ?? 200;
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      }

      gsap
        .timeline({
          scrollTrigger: { trigger: root, start: "top 72%", once: true },
        })
        .to(paths, {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: "power2.inOut",
          stagger: 0.12,
        })
        .fromTo(
          nodes,
          { opacity: 0, scale: 0.86 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out", stagger: 0.08 },
          0.25,
        );
    },
    [groups.length],
    rootRef,
  );

  return (
    <Section
      id="stack"
      index="04"
      eyebrow="Tech stack"
      title="The tools the work actually runs on."
      intro={
        <>
          Aggregated from the languages, topics and deployment targets of the
          public repositories above.
        </>
      }
    >
      <div ref={rootRef} className="flex flex-col gap-20">
        {/* ---------------- ecosystem diagram ---------------- */}
        <div data-anim="fade" className="mx-auto w-full max-w-3xl">
          <EcosystemDiagram />
        </div>

        {/* ---------------- groups ---------------- */}
        <div className="grid grid-cols-1 gap-px border border-chalk/8 bg-chalk/8 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} data-anim="up" className="bg-void p-7">
              <h3 className="eyebrow mb-6 text-signal">{group.label}</h3>
              <ul className="flex flex-col gap-2.5">
                {group.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <span className="text-bone">{item.name}</span>
                    {item.inferred ? (
                      <span
                        title={`Found in: ${item.evidence.slice(0, 8).join(", ")}${
                          item.evidence.length > 8 ? ", …" : ""
                        }`}
                        className="shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim"
                      >
                        {item.evidence.length}
                        <span aria-hidden="true">
                          {" "}
                          repo{item.evidence.length === 1 ? "" : "s"}
                        </span>
                        {/* The tooltip is mouse-only; state the same fact for
                            screen readers without dumping 30 repo names. */}
                        <span className="sr-only">
                          {" "}
                          {item.evidence.length === 1 ? "repository" : "repositories"}
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">
                        Declared
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p
          data-anim="fade"
          className="hairline pt-6 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim"
        >
          Stack inferred from public projects · counts show supporting repositories
        </p>
      </div>
    </Section>
  );
}

/**
 * The stack as a system rather than a word cloud: five domains, one hub,
 * connecting lines that draw themselves on scroll.
 */
function EcosystemDiagram() {
  const nodes = [
    { id: "hub", label: "Full stack", x: 300, y: 160, primary: true },
    { id: "ai", label: "AI", x: 300, y: 44 },
    { id: "automation", label: "Automation", x: 300, y: 276 },
    { id: "cyber", label: "Cybersecurity", x: 86, y: 160 },
    { id: "cloud", label: "Cloud", x: 514, y: 160 },
  ];

  return (
    <svg
      viewBox="0 0 600 320"
      role="img"
      aria-label="Full-stack development at the centre, connected to AI, automation, cybersecurity and cloud."
      className="h-auto w-full"
    >
      <g stroke="currentColor" className="text-signal/45" strokeWidth="1" fill="none">
        <path data-eco-line d="M300 76 L300 138" />
        <path data-eco-line d="M300 182 L300 250" />
        <path data-eco-line d="M140 160 L246 160" />
        <path data-eco-line d="M354 160 L462 160" />
      </g>

      {nodes.map((node) => (
        <g key={node.id} data-eco-node>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.primary ? 54 : 42}
            className={node.primary ? "fill-signal/8 stroke-signal/50" : "fill-abyss stroke-chalk/12"}
            strokeWidth="1"
          />
          <text
            x={node.x}
            y={node.y + 3}
            textAnchor="middle"
            className={`font-mono uppercase ${node.primary ? "fill-signal" : "fill-mute"}`}
            style={{ fontSize: node.primary ? 11 : 9, letterSpacing: "0.12em" }}
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
