import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import dynamic from "next/dynamic";
import { Analytics } from '@vercel/analytics/react';
import "./globals.css";

// Dynamically import RootProvider to avoid SSR issues with Wagmi
const RootProvider = dynamic(() => import("./rootProvider").then(mod => ({ default: mod.RootProvider })), {
  ssr: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

// Farcaster Mini App embed metadata
// Per Farcaster docs: https://miniapps.farcaster.xyz/docs/guides/agents-checklist
// Production domain: https://jan-ken.vercel.app
const domain = process.env.NEXT_PUBLIC_APP_URL || "https://jan-ken.vercel.app";

const farcasterFrame = {
  version: "1", // Must be "1", not "next" (per Farcaster docs)
  imageUrl: `${domain}/new_logo.png`, // 3:2 aspect ratio recommended
  button: {
    title: "Play JaN KeN!", // Max 32 characters
    action: {
      type: "launch_frame",
      name: "JaN KeN!",
      url: domain, // Optional, defaults to current URL
      splashImageUrl: `${domain}/new_logo.png`, // 200x200px recommended
      splashBackgroundColor: "#000000"
    }
  }
};

export const metadata: Metadata = {
  title: "JaN KeN! - Rock Paper Scissors",
  description: "Rock Paper Scissors game on Base Network. Play against other players and win ETH!",
  manifest: '/manifest.json',
  icons: {
    icon: '/new_logo.png',
    apple: '/new_logo.png',
  },
  openGraph: {
    title: "JaN KeN! - Rock Paper Scissors",
    description: "Rock Paper Scissors game on Base Network. Play against other players and win ETH!",
    images: ['/new_logo.png'],
  },
  // Farcaster Mini App embed metadata
  // Per Farcaster docs: Use fc:miniapp (NOT fc:frame for new implementations)
  // See: https://miniapps.farcaster.xyz/docs/guides/agents-checklist
  other: {
    "fc:miniapp": JSON.stringify(farcasterFrame),
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceCodePro.variable}`} style={{ margin: 0, padding: 0, background: '#000' }}>
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
