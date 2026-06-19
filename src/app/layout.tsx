import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tracelattice.vercel.app"),
  title: { default: "TraceLattice — Static Website Privacy Intelligence", template: "%s | TraceLattice" },
  description: "Map the privacy and security signals a public website exposes before you trust it. Safe static homepage analysis with no crawling or JavaScript execution.",
  keywords: ["privacy engineering", "cybersecurity", "security headers", "tracker detection", "SSRF protection", "Next.js"],
  authors: [{ name: "Immanuel Gnanaseelan", url: "https://github.com/immanuelgn" }],
  creator: "Immanuel Gnanaseelan",
  publisher: "Immanuel Gnanaseelan",
  openGraph: { title: "TraceLattice", description: "Defensive static website privacy and security intelligence.", type: "website" },
  twitter: { card: "summary_large_image", title: "TraceLattice", description: "Map what a website exposes before you trust it." },
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
