import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#050810", color: "white", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "sans-serif" }}><div style={{ display: "flex", color: "#67e8f9", fontSize: 28, letterSpacing: 5, textTransform: "uppercase" }}>Defensive web intelligence</div><div style={{ display: "flex", fontSize: 92, fontWeight: 700, marginTop: 25 }}>Trace<span style={{ color: "#8b5cf6" }}>Lattice</span></div><div style={{ display: "flex", fontSize: 34, color: "#aab7ce", marginTop: 20 }}>Map what a website exposes before you trust it.</div></div>, size);
}
