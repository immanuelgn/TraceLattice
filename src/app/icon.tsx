import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  const cornerBase = {
    position: "absolute" as const,
    width: 10,
    height: 10,
    borderColor: "#06121d",
    borderStyle: "solid",
  };

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 13,
          background: "linear-gradient(135deg, #67e8f9 0%, #7cc8f6 52%, #a5a6ff 100%)",
        }}
      >
        <div style={{ ...cornerBase, left: 19, top: 19, borderWidth: "4px 0 0 4px", borderTopLeftRadius: 7 }} />
        <div style={{ ...cornerBase, right: 19, top: 19, borderWidth: "4px 4px 0 0", borderTopRightRadius: 7 }} />
        <div style={{ ...cornerBase, right: 19, bottom: 19, borderWidth: "0 4px 4px 0", borderBottomRightRadius: 7 }} />
        <div style={{ ...cornerBase, left: 19, bottom: 19, borderWidth: "0 0 4px 4px", borderBottomLeftRadius: 7 }} />
        <div style={{ width: 8, height: 8, borderRadius: 999, background: "#06121d" }} />
      </div>
    ),
    {
      ...size,
    }
  );
}
