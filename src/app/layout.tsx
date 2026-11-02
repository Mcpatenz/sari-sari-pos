import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/ServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TindahanPOS — Offline Sari-Sari Store POS & Inventory",
    template: "%s · TindahanPOS",
  },
  description:
    "An offline-first sari-sari store POS for the Philippines. Sell by tingi, bundle, kilogram, gram, sack or open price, keep multi-device inventory in sync, and watch your profit — even without internet.",
  keywords: [
    "sari-sari store POS",
    "Philippines POS",
    "tingi pricing",
    "offline POS PWA",
    "sari sari inventory",
    "rice per kilo POS",
    "bundle pricing",
    "groceries point of sale",
  ],
  authors: [{ name: "TindahanPOS" }],
  applicationName: "TindahanPOS",
  category: "business",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TindahanPOS",
    statusBarStyle: "black-translucent",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "TindahanPOS",
    title: "TindahanPOS — Offline Sari-Sari Store POS & Inventory",
    description:
      "Sell tingi, bundles, grams, kilos and sacks from any phone, tablet or desktop. Offline-first, syncing when you reconnect.",
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: "TindahanPOS — Offline Sari-Sari Store POS",
    description:
      "An offline-first point of sale built for how sari-sari stores really sell.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070c18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-PH"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-cream text-ink">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
