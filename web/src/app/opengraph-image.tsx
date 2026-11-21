import { ImageResponse } from "next/og";

export const alt =
  "Ligera — Luxury Scented Candles, Reed Diffusers, Room Sprays & Gypsum Decor in Lagos";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#172b22",
          color: "#f6f2ea",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
          border: "12px solid #233b30",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <span
            style={{
              fontSize: 24,
              letterSpacing: "0.28em",
              color: "#c8a45d",
              textTransform: "uppercase",
            }}
          >
            LIGERA
          </span>
          <span
            style={{
              fontSize: 18,
              letterSpacing: "0.18em",
              color: "#d6cebe",
              textTransform: "uppercase",
            }}
          >
            GBAGADA, LAGOS · NIGERIA
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "960px",
          }}
        >
          <div
            style={{
              fontSize: 74,
              lineHeight: 1.05,
              fontWeight: 400,
              color: "#f6f2ea",
            }}
          >
            Illuminate every space
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "#d9d2c4",
              fontFamily: "sans-serif",
            }}
          >
            Hand-Poured Scented Candles · Reed Diffusers · Room &amp; Linen Sprays · Gypsum Decor
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(200, 164, 93, 0.35)",
            paddingTop: "24px",
            fontSize: 20,
            color: "#c8a45d",
            fontFamily: "sans-serif",
          }}
        >
          <span>Lagos Delivery · Studio Pickup · Nationwide Shipping</span>
          <span>ligerascents.com</span>
        </div>
      </div>
    ),
    size,
  );
}
