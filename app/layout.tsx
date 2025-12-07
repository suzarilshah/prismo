import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope, Open_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Production URL
const SITE_URL = "https://prismo.airail.uk";
const SITE_NAME = "Prismo Finance";

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

// Viewport configuration for mobile optimization
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Comprehensive SEO Metadata
export const metadata: Metadata = {
  // Basic metadata
  title: {
    default: "Prismo Finance | Smart Money Management for Malaysians",
    template: "%s | Prismo Finance",
  },
  description: "The intelligent finance platform for modern Malaysians. Track expenses, optimize taxes with LHDN integration, manage subscriptions, and achieve financial goals with AI-powered insights.",
  
  // Keywords for SEO
  keywords: [
    "personal finance Malaysia",
    "expense tracker app",
    "budget management",
    "LHDN tax relief",
    "tax optimization Malaysia",
    "subscription tracker",
    "financial planning",
    "money management app",
    "Malaysian finance app",
    "AI financial assistant",
    "goal tracking",
    "credit card tracker",
    "budget planner Malaysia",
    "income tracker",
    "spending analytics",
    "PCB calculator Malaysia",
    "tax deduction tracker",
  ],
  
  // Authors and creator
  authors: [{ name: "Prismo Finance Sdn Bhd", url: SITE_URL }],
  creator: "Prismo Finance",
  publisher: "Prismo Finance Sdn Bhd",
  
  // Canonical and base URL
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "en-MY": "/",
      "ms-MY": "/ms",
    },
  },
  
  // Icons and favicons
  icons: {
    icon: [
      { url: "/logos/prismo-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/logos/prismo-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: "/logos/prismo-icon.svg",
  },
  
  // Manifest for PWA
  manifest: "/manifest.json",
  
  // Open Graph metadata for social sharing
  openGraph: {
    type: "website",
    locale: "en_MY",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Prismo Finance | Smart Money Management for Malaysians",
    description: "The intelligent finance platform for modern Malaysians. Track expenses, optimize taxes, manage subscriptions, and achieve your financial goals.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prismo Finance Dashboard - Your Complete Financial Overview",
        type: "image/png",
      },
    ],
  },
  
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    site: "@prismofinance",
    creator: "@prismofinance",
    title: "Prismo Finance | Smart Money Management",
    description: "The intelligent finance platform for modern Malaysians. Track expenses, optimize taxes, achieve your financial goals.",
    images: ["/og-image.png"],
  },
  
  // Robots and indexing
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verification for search consoles
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
  },
  
  // App links
  appLinks: {
    web: {
      url: SITE_URL,
      should_fallback: true,
    },
  },
  
  // Category
  category: "finance",
  
  // Classification
  classification: "Personal Finance, Budget Management, Tax Optimization",
  
  // Other metadata
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Prismo",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#8B5CF6",
    "msapplication-config": "/browserconfig.xml",
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
