import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1c1917" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://walliprag.vercel.app"),
  title: "Walli Prag — Best bars, restaurants & sights in Prague",
  description:
    "Interactive map of Prague's best bars, restaurants, cafés, clubs and sights. Search, filter by price and rating, save favorites and plan your itinerary.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Walli Prag",
  },
  openGraph: {
    title: "Walli Prag — Best of Prague",
    description:
      "Discover Prague's best bars, restaurants, cafés and sights on an interactive map.",
    locale: "en_US",
    url: "https://walliprag.vercel.app",
    siteName: "Walli Prag",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-paper text-ink antialiased dark:bg-stone-950 dark:text-stone-100">
        {children}
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
