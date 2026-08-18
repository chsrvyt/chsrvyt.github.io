import type { ProjectCategory } from "./types";

/**
 * Heuristic repository classifier.
 *
 * Signals, in the order they are weighted: explicit GitHub topics > repository
 * name > description > primary language. A repository can land in several
 * categories; it always lands in at least one.
 *
 * This is inference, not fact — which is why data/featured.ts can override the
 * result for repositories that matter, and why the UI labels the tech stack
 * "inferred from public projects".
 */

interface Rule {
  category: ProjectCategory;
  /** Matched against the whole lowercased haystack. */
  phrases?: RegExp;
  /** Matched against individual tokens — safe for short words like "ai". */
  tokens?: string[];
  /** Primary languages that imply this category. */
  languages?: string[];
  weight: number;
}

const RULES: Rule[] = [
  {
    category: "cybersecurity",
    /*
     * A bare `hack` matched every hackathon repo (`hack-o-week`, `hack0week`)
     * and labelled student event work as security research. Only the specific
     * forms count.
     */
    phrases:
      /phish|security|secure|cyber|hacking|ethical.?hack|hackthebox|exploit|vulnerab|malware|forensic|pentest|osint|threat|deauth|firewall|encrypt|decrypt|cryptograph|steganograph|keylog|bruteforce|reconnaissance/,
    tokens: ["ble", "sast", "dast", "xss", "csrf", "sqli", "ctf"],
    weight: 3,
  },
  {
    category: "ai",
    phrases:
      /machine.?learning|deep.?learning|neural|\bllm\b|\bgpt\b|openai|gemini|anthropic|claude|generative|chatbot|intelligence|classif|prediction|predictive|recommend|computer.?vision|nlp|prompt|inference|dataset|tensorflow|pytorch|scikit|langchain|embedding/,
    tokens: ["ai", "ml", "gen-ai", "genai", "rag"],
    weight: 3,
  },
  {
    category: "fullstack",
    phrases:
      /full.?stack|backend|back.?end|api|server|supabase|firebase|postgres|mongo|prisma|express|nest|auth|database|next\.?js|nextjs|dashboard|platform|booking|marketplace/,
    tokens: ["crud", "rest", "graphql", "sso"],
    weight: 2,
  },
  {
    category: "web",
    phrases:
      /website|web.?interface|webapp|web.?app|frontend|front.?end|landing|portfolio|react|vite|tailwind|responsive|ui|ux|menu|listing.?page|storefront/,
    languages: ["HTML", "CSS", "SCSS", "JavaScript", "TypeScript", "Vue", "Svelte"],
    weight: 2,
  },
  {
    category: "systems",
    phrases:
      /operating.?system|kernel|compiler|interpreter|memory|pointer|concurren|multithread|socket|network|embedded|firmware|shell.?script|automation.?script|cli\b/,
    languages: ["C", "C++", "Rust", "Go", "Assembly", "Shell", "Kotlin", "Java"],
    weight: 2,
  },
  {
    category: "academic",
    /*
     * `beginner` is deliberately absent: it describes the author's experience
     * level at the time, not the nature of the work, and it was pulling real
     * projects into the coursework bucket on the strength of a modest README.
     */
    phrases:
      /\bsem[-\s._]?\d|semester|\blab\b|lab.?code|assignment|coursework|college|university|syllabus|practical|data.?structure|algorithm|\bdaa\b|\bdsa\b|problem.?solving|1st.?year|first.?year/,
    tokens: ["sem1", "sem2", "sem-1", "sem-2", "oop", "dbms"],
    weight: 4,
  },
];

const TOKEN_SPLIT = /[^a-z0-9+#]+/;

function tokenize(input: string): Set<string> {
  return new Set(input.toLowerCase().split(TOKEN_SPLIT).filter(Boolean));
}

export interface CategorizeInput {
  name: string;
  description: string | null;
  topics: string[];
  language: string | null;
  homepage: string | null;
  stars: number;
  isFork: boolean;
}

/**
 * @returns Categories ordered by confidence, highest first. Never empty.
 */
export function categorize(input: CategorizeInput): ProjectCategory[] {
  const haystack = [input.name, input.description ?? "", input.topics.join(" ")]
    .join(" ")
    .toLowerCase()
    // `the-uncaught-exceptions` and `the uncaught exceptions` must score alike.
    .replace(/[-_./]+/g, " ");

  const tokens = tokenize(haystack);
  const scores = new Map<ProjectCategory, number>();

  const add = (category: ProjectCategory, amount: number) => {
    scores.set(category, (scores.get(category) ?? 0) + amount);
  };

  for (const rule of RULES) {
    if (rule.phrases?.test(haystack)) add(rule.category, rule.weight);
    if (rule.tokens?.some((token) => tokens.has(token))) {
      add(rule.category, rule.weight);
    }
    if (rule.languages && input.language && rule.languages.includes(input.language)) {
      // Language alone is a weak signal — it corroborates, it doesn't decide.
      add(rule.category, 1);
    }
  }

  // A deployed URL is real evidence that something was shipped end-to-end.
  if (input.homepage && input.homepage.startsWith("http")) {
    add("fullstack", 1);
    add("web", 1);
  }

  const ranked = Array.from(scores.entries())
    .filter(([, score]) => score >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  // Academic coursework shouldn't masquerade as product work: when the
  // academic signal wins outright, drop the softer product categories.
  if (ranked[0] === "academic") {
    return ranked.filter((c) => c === "academic" || c === "systems").slice(0, 2);
  }

  if (ranked.length === 0) return ["experiments"];

  return ranked.slice(0, 3);
}

/** Filter options rendered by the Project Explorer, in display order. */
export const FILTERS: Array<{ id: ProjectCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "fullstack", label: "Full Stack" },
  { id: "web", label: "Web" },
  { id: "systems", label: "Systems" },
  { id: "academic", label: "Academic" },
  { id: "experiments", label: "Experiments" },
];
