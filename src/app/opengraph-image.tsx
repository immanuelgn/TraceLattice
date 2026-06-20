import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 70, background: "#070b12", color: "#f1f5f9", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", width: "100%", flexDirection: "column", justifyContent: "space-between", border: "1px solid #263447", borderRadius: 24, padding: 52, background: "#0b121d" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700 }}>Trace<span style={{ color: "#9ca8f2" }}>Lattice</span></div>
          <div style={{ display: "flex", color: "#7fe2df", fontSize: 20, letterSpacing: 3, textTransform: "uppercase" }}>Passive public-origin analysis</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", maxWidth: 760, flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 66, lineHeight: 1.04, fontWeight: 700 }}>Explainable web posture, backed by observable evidence.</div>
            <div style={{ display: "flex", marginTop: 24, color: "#9aa9bc", fontSize: 27 }}>Headers, cookies, third parties, TLS, DNS, and bounded static risk.</div>
          </div>
          <div style={{ display: "flex", width: 180, height: 180, alignItems: "center", justifyContent: "center", border: "10px solid #62d9d2", borderRadius: 999, fontSize: 58, fontWeight: 700 }}>94</div>
        </div>
      </div>
    </div>,
    size,
  );
}
