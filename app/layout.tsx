import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TokenDataProvider } from "@/contexts/TokenDataContext";
import { SimpleWalletProvider } from "@/contexts/SimpleWalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jupiter Chart Integration",
  description: "Real-time token charts powered by Jupiter Data API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SimpleWalletProvider>
          <TokenDataProvider>
            {children}
          </TokenDataProvider>
        </SimpleWalletProvider>
      </body>
    </html>
  );
}
