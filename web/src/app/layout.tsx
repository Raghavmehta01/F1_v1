import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { IntroRadioSound } from "@/components/layout/IntroRadioSound";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
});

const timing = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-timing",
});

export const metadata: Metadata = {
  title: {
    default: "Pitwall",
    template: "%s · Pitwall",
  },
  description:
    "Pitwall — Formula 1 standings, results, live timing, history, and race chat. Developed by Raghav Mehta.",
  applicationName: "Pitwall",
  authors: [{ name: "Raghav Mehta", url: "https://www.linkedin.com/in/raghavmehta1/" }],
  creator: "Raghav Mehta",
  publisher: "Raghav Mehta",
  other: {
    copyright:
      "© 2026 Raghav Mehta. Pitwall — Apache License 2.0. Fan-made; not affiliated with F1 / FIA.",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/pitwall-mark-v2.png", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${timing.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative flex min-h-full flex-col overflow-x-hidden">
        <ThemeProvider>
          <IntroRadioSound />
          <Header />
          <main className="relative z-0 flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
