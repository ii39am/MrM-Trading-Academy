import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Mr.M Trading Academy — Trade with clarity", template: "%s | Mr.M Trading Academy" },
  description: "Premium, practical trading education built around market structure, risk, and professional execution.",
  openGraph: { title: "Mr.M Trading Academy", description: "Build the skill. Master the process.", type: "website", siteName: "Mr.M Trading Academy" },
  twitter: { card: "summary_large_image", title: "Mr.M Trading Academy", description: "Premium trading education for serious traders." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
