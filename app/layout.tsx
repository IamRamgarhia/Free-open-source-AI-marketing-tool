import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { StatusBar } from "@/components/StatusBar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { CommandPalette } from "@/components/CommandPalette";
import { UndoToast } from "@/components/UndoToast";
import { LocalSyncBoot } from "@/components/LocalSyncBoot";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openadkit.dicecodes.com"),
  title: "OpenAdKit · open source AI marketing tool",
  description:
    "OpenAdKit is the open source AI marketing tool. Every ad platform, every AI provider (BYOK), runs in your browser, zero subscriptions. Built by Dicecodes.",
  applicationName: "OpenAdKit",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
  openGraph: {
    title: "OpenAdKit · open source AI marketing tool",
    description:
      "OpenAdKit is the open source AI marketing tool. Every ad platform, every AI provider (BYOK), runs in your browser, zero subscriptions.",
    url: "/",
    siteName: "OpenAdKit",
    type: "website",
    images: ["/icon.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenAdKit · open source AI marketing tool",
    description: "Open source AI marketing tool. Every ad platform, every AI provider (BYOK), browser-only.",
    images: ["/icon.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        {/* Skip-to-content for keyboard + screen-reader users — visually
            hidden until focused, then jumps past the sidebar / mobile nav. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-base-900 focus:text-ink focus:px-3 focus:py-2 focus:border focus:border-live"
        >
          Skip to main content
        </a>
        <div className="flex min-h-screen">
          <Sidebar />
          <MobileNav />
          <ServiceWorkerRegister />
          <LocalSyncBoot />
          <CommandPalette />
          <UndoToast />
          <main id="main-content" className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 px-4 md:px-10 pt-14 md:pt-6 pb-14">{children}</div>
            <StatusBar />
          </main>
        </div>
      </body>
    </html>
  );
}
