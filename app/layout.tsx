export const metadata = {
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
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
