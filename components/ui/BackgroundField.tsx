/**
 * Fixed decorative backdrop: fine grid, noise grain and two low-opacity
 * accent washes. Server-rendered, `aria-hidden`, zero JavaScript.
 *
 * Sits at z-0 behind everything; all content layers sit at z-10 or above.
 */
export function BackgroundField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Base wash — keeps the near-black from reading as flat #000 */}
      <div className="absolute inset-0 bg-void" />

      {/* Emerald bloom, top-left */}
      <div
        className="absolute -left-[18%] -top-[22%] h-[62vh] w-[62vh] rounded-full opacity-[0.10] blur-[120px]"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 68%)" }}
      />

      {/* Cyan bloom, right, lower */}
      <div
        className="absolute -right-[14%] top-[38%] h-[52vh] w-[52vh] rounded-full opacity-[0.08] blur-[130px]"
        style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 68%)" }}
      />

      {/* 72px hairline grid */}
      <div className="grid-field absolute inset-0 opacity-60" />

      {/* Grain — masked so it fades toward the edges rather than banding */}
      <div className="noise-field absolute inset-0 opacity-[0.035] mix-blend-overlay" />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(6,7,10,0.75) 100%)",
        }}
      />
    </div>
  );
}
