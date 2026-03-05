import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://baseflo.vercel.app"),

  title: "BaseFlow Signal Agent",
  description: "Live Uniswap v3 and volume signals on Base.",

  icons: {
    icon: "/hero.png",
    shortcut: "/hero.png",
    apple: "/hero.png"
  },

  openGraph: {
    title: "BaseFlow Signal Agent",
    description: "Live Uniswap v3 and volume signals on Base.",
    images: ["/hero.png"]
  },

  other: {
    "base:app_id": "699b5910eb8da8c3b3d7b15c",

    "fc:miniapp":
      '{"version":"1","imageUrl":"https://baseflo.vercel.app/hero.png","button":{"title":"Open Agent","action":{"type":"launch_miniapp"}}}',

    "fc:frame":
      '{"version":"1","imageUrl":"https://baseflo.vercel.app/hero.png","button":{"title":"Open Agent","action":{"type":"launch_frame"}}}'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#020617",
          color: "#f9fafb",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "100vh"
        }}
      >
        {children}
      </body>
    </html>
  );
}