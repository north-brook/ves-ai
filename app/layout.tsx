import type { Metadata, Viewport } from "next";
import { inter, spaceGrotesk } from "@/lib/fonts";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "VES AI • AI Session Analysis for Product Teams",
  description:
    "Use AI to watch every session replay and get actionable product improvements. Connect PostHog, find bugs, flag UX issues, and prepare rich tickets for Linear.",
  keywords: [
    "product analytics",
    "session replay",
    "AI analysis",
    "PostHog",
    "Linear",
    "bug detection",
    "UX insights",
  ],
  authors: [{ name: "Steppable Inc." }],
  creator: "Steppable Inc.",
  publisher: "Steppable Inc.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://ves.ai"),
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "VES - AI Session Analysis",
    description:
      "Watch every session, catch every bug, ship better features faster",
    url: "https://ves.ai",
    siteName: "VES",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/social.png",
        width: 1200,
        height: 630,
        alt: "VES - AI Session Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VES - AI Session Analysis",
    description:
      "Watch every session, catch every bug, ship better features faster",
    images: ["/social.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
