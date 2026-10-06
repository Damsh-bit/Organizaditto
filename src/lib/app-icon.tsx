import { ImageResponse } from "next/og";

/** Ícono de la app: "O" blanca sobre degradé verde (se usa en favicon, PWA y Apple). */
export function renderAppIcon(size: number, { rounded = true, padding = 0 }: { rounded?: boolean; padding?: number } = {}) {
  const inner = size - padding * 2;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: padding ? "#0f9f6e" : "transparent" }}>
        <div
          style={{
            width: inner,
            height: inner,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: rounded ? inner * 0.22 : 0,
            background: "linear-gradient(135deg, #16b47e 0%, #0b8a5f 100%)",
            color: "white",
            fontSize: inner * 0.62,
            fontWeight: 800,
            fontFamily: "sans-serif",
          }}
        >
          O
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
