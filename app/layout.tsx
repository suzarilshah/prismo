import type { Metadata } from "next";
import { DM_Sans, Manrope, Open_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Open Sans - Clean, humanist sans-serif for logo
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

// DM Sans - Modern, geometric, highly legible
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Manrope - Rounded, friendly display font (unique alternative)
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Prismo Finance | 100 Trillion USD Wealth Management",
  description: "The premium financial platform for the modern elite.",
  keywords: [
    "expense tracker",
    "budget app",
    "financial management",
    "tax optimization",
    "Malaysia LHDN",
    "personal finance",
    "subscription tracker",
  ],
  authors: [{ name: "Prismo Finance" }],
  icons: {
    icon: "/logos/prismo-icon.svg",
    apple: "/logos/prismo-icon.svg",
    shortcut: "/logos/prismo-icon.svg",
  },
  openGraph: {
    title: "Prismo Finance - Premium Financial Management",
    description: "Malaysia's most advanced personal finance platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${manrope.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
