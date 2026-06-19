import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tracelattice.vercel.app"),
  title: { default: "TraceLattice — Defensive Web Posture Scanner", template: "%s | TraceLattice" },
  description: "Defensive cybersecurity scanner for public web posture: headers, cookies, trackers, TLS, DNS email-auth, CAA, security.txt, and bounded same-origin static analysis.",
  keywords: ["cybersecurity", "web security", "security headers", "SSRF protection", "TLS", "DMARC", "SPF", "tracker detection", "privacy engineering", "Next.js"],
  authors: [{ name: "Immanuel Gnanaseelan", url: "https://github.com/immanuelgn" }],
  creator: "Immanuel Gnanaseelan",
  publisher: "Immanuel Gnanaseelan",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  openGraph: {
    title: "TraceLattice",
    description: "Defensive web posture scanner for public security, privacy, TLS, DNS, and third-party exposure signals.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TraceLattice",
    description: "Map public web security posture before you trust a site.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
