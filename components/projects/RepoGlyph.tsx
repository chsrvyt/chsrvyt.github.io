/**
 * Deterministic generated artwork for a repository.
 *
 * Why not GitHub's social preview card everywhere: the explorer renders ~30
 * repositories, and `opengraph.githubassets.com` rate-limits (429) when that
 * many are requested at once. It also means ~30 remote image fetches on a page
 * whose whole point is being fast.
 *
 * This draws instead — inline SVG, no network, a few hundred bytes, and stable
 * across renders because every value derives from a hash of the repository
 * name. The real preview card is reserved for the sticky showcase and the
 * case-study page, where there are five of them rather than thirty.
 */

/** GitHub Linguist colours for the languages that actually appear here. */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  C: "#555555",
  "C++": "#f34b7d",
  Kotlin: "#A97BFF",
  Java: "#b07219",
  Shell: "#89e051",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Dart: "#00B4AB",
  Vue: "#41b883",
};

const FALLBACK_COLOR = "#10b981";

/** FNV-1a — small, fast, and stable across platforms. */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function languageColor(language: string | null): string {
  if (!language) return FALLBACK_COLOR;
  return LANGUAGE_COLORS[language] ?? FALLBACK_COLOR;
}

export function RepoGlyph({
  repo,
  language,
  accent,
  className,
}: {
  repo: string;
  language: string | null;
  /** Overrides the language colour — used for curated projects. */
  accent?: string | null;
  className?: string;
}) {
  const seed = hash(repo);
  const color = accent ?? languageColor(language);

  // Twelve cells, lit or unlit according to bits of the hash. The same repo
  // always produces the same figure, so it reads as an identity, not noise.
  const cells = Array.from({ length: 12 }, (_, index) => ({
    index,
    on: ((seed >> index) & 1) === 1,
  }));

  const angle = 120 + (seed % 90);

  return (
    <svg
      viewBox="0 0 320 160"
      className={className}
      role="img"
      aria-label={`Generated cover for ${repo}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`glyph-${seed}`} gradientTransform={`rotate(${angle % 180})`}>
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="55%" stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor="#06070a" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="320" height="160" fill="#0b0d11" />
      <rect width="320" height="160" fill={`url(#glyph-${seed})`} />

      {/* Hairline grid */}
      <g stroke="#f2f4f6" strokeOpacity="0.05" strokeWidth="1">
        {[40, 80, 120].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="320" y2={y} />
        ))}
        {[64, 128, 192, 256].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="160" />
        ))}
      </g>

      {/* Signature block — 4×3 cells derived from the hash */}
      <g transform="translate(28, 44)">
        {cells.map(({ index, on }) => (
          <rect
            key={index}
            x={(index % 4) * 22}
            y={Math.floor(index / 4) * 22}
            width="14"
            height="14"
            fill={on ? color : "#f2f4f6"}
            fillOpacity={on ? 0.75 : 0.06}
          />
        ))}
      </g>

      {/* Language marker */}
      <g transform="translate(28, 132)">
        <circle cx="4" cy="-4" r="4" fill={color} />
        <text
          x="16"
          y="0"
          className="font-mono uppercase"
          fill="#8b939f"
          style={{ fontSize: 10, letterSpacing: "0.14em" }}
        >
          {language ?? "—"}
        </text>
      </g>
    </svg>
  );
}
