import type { Metadata } from "next";

export const metadata: Metadata = {
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
    "base:app_id": "699b5910eb8da8c3b3d7b15c" // yahan apna real app id daalo
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
