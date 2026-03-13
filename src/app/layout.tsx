import type { Metadata } from "next";
import { Geist, DM_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "RecordsVault | Digitize. Extract. Retrieve.",
  description: "Production-grade document digitization platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${dmMono.variable} antialiased min-h-screen bg-bg-base text-text-primary`}
      >
        {children}
      </body>
    </html>
  );
}
