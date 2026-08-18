/**
 * LOCAL SOURCE OF TRUTH — identity only.
 *
 * Everything in this file is personal information that GitHub cannot supply.
 * Repository data, statistics and activity come from the GitHub API and must
 * never be duplicated here. Nothing in this file may assert a metric, an
 * outcome, an employer or an award.
 */

export const GITHUB_USERNAME = "chsrvyt" as const;

export const profile = {
  name: "Sarvesh Chonde",
  short: "SRV",
  initials: "SC",

  /** Primary positioning line. Deliberately not "expert" or "senior". */
  role: "Cybersecurity-focused developer building intelligent, secure and production-oriented digital products.",

  /** Secondary, longer-form positioning. */
  positioning:
    "Computer Science student exploring cybersecurity, AI engineering, full-stack systems and automation through real-world projects.",

  disciplines: ["Cybersecurity", "AI", "Full-Stack"] as const,

  heroStatement: ["Building secure,", "intelligent and meaningful", "digital products."],

  location: "Nagpur, Maharashtra, India",
  timezone: "Asia/Kolkata",

  education: {
    institution: "Symbiosis Institute of Technology, Nagpur",
    degree: "B.Tech — Computer Science & Engineering",
    start: "2025",
    end: "2029",
    note: "Currently pursuing.",
  },

  links: {
    github: `https://github.com/${GITHUB_USERNAME}`,
    linkedin: "https://www.linkedin.com/in/sarvesh-chonde",
    email: "sarveshchonde@gmail.com",
    mailto: "mailto:sarveshchonde@gmail.com",
  },

  about: [
    "I build systems that turn ideas into working products.",
    "Most of what I know came from shipping things — breaking them, reading why they broke, and rebuilding them properly.",
    "My work sits where cybersecurity, AI engineering and full-stack development overlap: applications that have to be useful and hard to misuse at the same time.",
  ],

  security: {
    statement:
      "My interest in cybersecurity comes from understanding how systems fail, how vulnerabilities emerge and how applications can be designed with security in mind from the beginning.",
    focus: [
      {
        title: "Application Security",
        detail:
          "Designing request paths where validation and authorisation are structural, not bolted on.",
      },
      {
        title: "Web Security",
        detail:
          "Headers, content policy, session handling and the failure modes browsers expose.",
      },
      {
        title: "Threat Analysis",
        detail:
          "Reading a system as an attacker would: trust boundaries, inputs, and what happens when one is crossed.",
      },
      {
        title: "Security Research",
        detail:
          "Studying published techniques and reproducing them in controlled environments to understand the mechanism.",
      },
      {
        title: "Security Automation",
        detail:
          "Turning repeated analysis into tooling — scoring, detection and reporting that runs without me.",
      },
    ],
  },

  /**
   * VERIFIED CERTIFICATIONS ONLY.
   *
   * Add `credentialUrl` when you have the public verification link.
   * Do not add IDs or issue dates unless they are real — an unverifiable
   * credential is worse than an omitted one. Entries without a
   * `credentialUrl` render without a "verify" affordance.
   */
  certifications: [
    {
      name: "Ethical Hacking 101",
      issuer: "Simplilearn",
      credentialUrl: null as string | null,
    },
    {
      name: "Introduction to Cybercrime",
      issuer: "LinkedIn Learning",
      credentialUrl: null as string | null,
    },
    // Forage job simulations: add each completed one here with its real
    // credential link, e.g.
    // { name: "…  Job Simulation", issuer: "Forage", credentialUrl: "https://…" },
  ],
} as const;

export type Profile = typeof profile;
