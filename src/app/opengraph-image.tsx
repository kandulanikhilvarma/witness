import { ImageResponse } from "next/og";

// The social card. Warm paper ground, ink text, one teal accent, and a drawn
// bearing ring built from concentric borders (next/og has no SVG, so the mark
// is composed from divs). Matches the site wordmark.
export const alt = "Witness, read the damage, name the cause";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GROUND = "#f6f2ea";
const INK = "#1d1b17";
const IRON = "#6e675d";
const TEAL = "#0e6e78";

function Ring() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 300,
        height: 300,
        borderRadius: 300,
        border: `3px solid ${INK}`,
      }}
    >
      {/* pitch circle */}
      <div
        style={{
          position: "absolute",
          width: 232,
          height: 232,
          borderRadius: 232,
          border: `2px dashed ${IRON}`,
          opacity: 0.6,
        }}
      />
      {/* bore */}
      <div style={{ width: 118, height: 118, borderRadius: 118, border: `3px solid ${INK}` }} />
      {/* rolling elements */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = 116;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 40,
              height: 40,
              borderRadius: 40,
              background: i === 0 ? TEAL : GROUND,
              border: `2.5px solid ${INK}`,
              transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: GROUND,
          color: INK,
          padding: 72,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, letterSpacing: 8, color: IRON }}>
            <div style={{ display: "flex", width: 34, height: 34, borderRadius: 34, border: `3px solid ${INK}` }} />
            WITNESS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>
              Read the damage.
            </div>
            <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1, color: TEAL }}>
              Name the cause.
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 24, color: IRON }}>
            <span>ISO 15243 bearings</span>
            <span>·</span>
            <span>ISO 10825 gears</span>
            <span>·</span>
            <span>batch linked</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 360 }}>
          <Ring />
        </div>
      </div>
    ),
    size,
  );
}
