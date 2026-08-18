import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const runtime = "nodejs";
export const alt = "Sarvesh Chonde — Cybersecurity, AI and Full-Stack Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card, generated at build/request time rather than maintained as a
 * binary in /public — it can never drift out of sync with the name and
 * positioning in data/profile.ts.
 *
 * System fonts only: loading a webfont here would mean a network fetch inside
 * image generation, which is a build-time failure waiting to happen.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06070a",
          padding: "72px",
          position: "relative",
        }}
      >
        {/* Emerald bloom */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -140,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(6,7,10,0) 68%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 10, height: 10, borderRadius: 9999, background: "#10b981", display: "flex" }} />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              color: "#8b939f",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {profile.disciplines.join("  •  ")}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 132,
              lineHeight: 0.9,
              letterSpacing: -4,
              color: "#f2f4f6",
              textTransform: "uppercase",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Sarvesh</span>
            <span style={{ color: "#8b939f" }}>Chonde</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid rgba(242,244,246,0.12)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 26, color: "#c9ced6", display: "flex", maxWidth: 720 }}>
            Building secure, intelligent and meaningful digital products.
          </div>
          <div style={{ fontSize: 22, color: "#10b981", letterSpacing: 3, display: "flex" }}>
            github.com/chsrvyt
          </div>
        </div>
      </div>
    ),
    size,
  );
}
