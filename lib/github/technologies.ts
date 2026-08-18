import type {
  PortfolioProject,
  PortfolioTechnology,
  TechnologyGroup,
} from "./types";

/**
 * The tech stack, assembled from two sources and clearly separated:
 *
 *   INFERRED  — the technology name was found in GitHub data (primary
 *               language, topics, description, homepage host). `evidence`
 *               lists the repositories that produced the match, so every
 *               inferred entry is traceable.
 *
 *   DECLARED  — tools used in work that isn't reflected in public repository
 *               metadata. Rendered without the "inferred" marker so the
 *               distinction is visible rather than blurred.
 */

interface Detector {
  name: string;
  /** Matched against name + description + topics + homepage, lowercased. */
  pattern: RegExp;
  /** Primary languages that count as direct evidence. */
  languages?: string[];
}

interface GroupSpec {
  id: string;
  label: string;
  detectors: Detector[];
  /** Always shown, never requires evidence. */
  declared?: string[];
}

const GROUPS: GroupSpec[] = [
  {
    id: "languages",
    label: "Languages",
    detectors: [
      { name: "Python", pattern: /\bpython\b/, languages: ["Python"] },
      { name: "TypeScript", pattern: /\btypescript\b/, languages: ["TypeScript"] },
      { name: "JavaScript", pattern: /\bjavascript\b/, languages: ["JavaScript"] },
      { name: "C", pattern: /\bc programming\b/, languages: ["C"] },
      { name: "C++", pattern: /\bc\+\+\b/, languages: ["C++"] },
      { name: "Kotlin", pattern: /\bkotlin\b/, languages: ["Kotlin"] },
      { name: "Shell", pattern: /\b(bash|shell script)\b/, languages: ["Shell"] },
      { name: "HTML", pattern: /\bhtml\b/, languages: ["HTML"] },
      { name: "CSS", pattern: /\bcss\b/, languages: ["CSS"] },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    detectors: [
      { name: "React", pattern: /\breact\b/ },
      { name: "Next.js", pattern: /\bnext\.?js\b/ },
      { name: "Tailwind CSS", pattern: /\btailwind\b/ },
      { name: "Vite", pattern: /\bvite\b/ },
    ],
    declared: ["GSAP", "Framer Motion", "Responsive UI"],
  },
  {
    id: "backend",
    label: "Backend",
    detectors: [
      { name: "Node.js", pattern: /\bnode(\.js)?\b/ },
      { name: "Supabase", pattern: /\bsupabase\b/ },
      { name: "PostgreSQL", pattern: /\b(postgres|postgresql)\b/ },
      { name: "Firebase", pattern: /\bfirebase\b/ },
      { name: "REST APIs", pattern: /\b(api|rest)\b/ },
    ],
  },
  {
    id: "ai",
    label: "AI",
    detectors: [
      { name: "OpenAI", pattern: /\bopenai\b|\bgpt\b/ },
      { name: "Google Gemini", pattern: /\bgemini\b/ },
      { name: "Generative AI", pattern: /\b(generative|genai|gen-ai)\b/ },
      { name: "Prompt Engineering", pattern: /\bprompt\b/ },
    ],
    declared: ["AI Automation"],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    detectors: [
      { name: "Vercel", pattern: /\bvercel\b/ },
      { name: "GitHub Pages", pattern: /\bgithub\.io\b/ },
      { name: "Replit", pattern: /\breplit\b/ },
      { name: "Docker", pattern: /\bdocker\b/ },
      { name: "Cloudflare", pattern: /\bcloudflare\b/ },
    ],
    declared: ["Git", "GitHub", "Linux"],
  },
  {
    id: "security",
    label: "Security",
    detectors: [
      { name: "Phishing Detection", pattern: /\bphish/ },
      { name: "Threat Analysis", pattern: /\b(threat|risk analysis)\b/ },
      { name: "BLE / Wireless", pattern: /\b(ble|bluetooth|deauth)\b/ },
    ],
    declared: ["Web Security", "Application Security", "Secure Development"],
  },
];

function haystackFor(project: PortfolioProject): string {
  return [
    project.repo,
    project.summary ?? "",
    project.topics.join(" "),
    project.homepage ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function buildTechnologyGroups(
  projects: PortfolioProject[],
): TechnologyGroup[] {
  const haystacks = projects.map(
    (project) => [project, haystackFor(project)] as const,
  );

  return GROUPS.map((group) => {
    const items: PortfolioTechnology[] = [];

    for (const detector of group.detectors) {
      const evidence: string[] = [];

      for (const [project, haystack] of haystacks) {
        const languageHit =
          detector.languages && project.primaryLanguage
            ? detector.languages.includes(project.primaryLanguage)
            : false;
        if (languageHit || detector.pattern.test(haystack)) {
          evidence.push(project.repo);
        }
      }

      if (evidence.length > 0) {
        items.push({ name: detector.name, inferred: true, evidence });
      }
    }

    // Evidence count orders the inferred entries; declared entries follow.
    items.sort((a, b) => b.evidence.length - a.evidence.length);

    for (const name of group.declared ?? []) {
      if (!items.some((item) => item.name === name)) {
        items.push({ name, inferred: false, evidence: [] });
      }
    }

    return { id: group.id, label: group.label, items };
  }).filter((group) => group.items.length > 0);
}
