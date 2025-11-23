import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { OnchainKitProvider } from '@coinbase/onchainkit';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Jan KeN! - Taş Kağıt Makas',
  description: 'Base ağında çalışan taş-kağıt-makas oyunu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_CDP_API_KEY_ID}
          apiKeySecret={process.env.NEXT_PUBLIC_CDP_API_KEY_SECRET}
          chain="base-sepolia"
        >
          {children}
        </OnchainKitProvider>
      </body>
    </html>
  );
}



