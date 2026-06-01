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
      '{"version":"1","imageUrl":"https://baseflo.vercel.app/hero.png","button":{"title":"Open Agent","action":{"type":"launch_frame"}}}',

    "talentapp:project_verification":
      "8ddb5dbd35fa2d5dd40c260fe06067cdd6f3879177e23ad3824d9e23dbe67ed4bc00c10b8f77d4d78896c3e66319442a1f339fac962ae08e306d8bca77a35d8c"
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
            "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            minHeight: "100vh"
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}