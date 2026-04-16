import type { Metadata } from "next";
import "@/styles/globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ziggurat — Skill Profile Intelligence",
  description:
    "Transform job descriptions into contextualized skill profiles through AI-powered analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50">
        <nav className="bg-[#1B2A4A] text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight"
                style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
              >
                Ziggurat
              </Link>
              <div className="flex items-center gap-6">
                <Link
                  href="/ingest"
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Ingest
                </Link>
                <Link
                  href="/pipeline"
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Pipeline
                </Link>
                <Link
                  href="/profiles"
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Profiles
                </Link>
                <Link
                  href="/analytics"
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Analytics
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
