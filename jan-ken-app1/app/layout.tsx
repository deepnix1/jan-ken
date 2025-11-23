import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { RootProvider } from "./rootProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JaN KeN! - Rock Paper Scissors",
  description: "Rock Paper Scissors game on Base Network. Play against other players and win ETH!",
  manifest: '/manifest.json',
  icons: {
    icon: '/new_logo.png',
    apple: '/new_logo.png',
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
      </body>
    </html>
  );
}
