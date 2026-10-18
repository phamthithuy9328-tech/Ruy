import { ImageResponse } from "next/og";
import { getDict } from "@/i18n";
import { isLocale } from "@/i18n/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = getDict(isLocale(locale) ? locale : "en");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#0F766E,#134E4A)", color: "white" }}>
        <div style={{ fontSize: 40, opacity: 0.85 }}>AmGo Travel</div>
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 20, lineHeight: 1.1 }}>{d.home.heroTitle}</div>
      </div>
    ),
    size,
  );
}
