import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/lib/theme-context";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurora AI OS",
  description: "The Intelligent Operating System for Everything",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg text-text font-body antialiased">
        {/*
         * Blocking, synchronous, and deliberately not next/script —
         * this MUST run before anything below it paints, or a
         * light-mode visitor sees a flash of the dark default first.
         * A plain <script> as the first body child pauses HTML parsing
         * until it finishes, which is exactly the property we need
         * here. Reads localStorage directly rather than importing
         * anything from theme-context.tsx since this runs before React
         * (or any bundled JS) exists yet.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('aurora-theme');" +
              "var valid=['dark','light','nebula'];" +
              "document.documentElement.dataset.theme=(valid.indexOf(t)!==-1?t:'dark');" +
              "}catch(e){document.documentElement.dataset.theme='dark';}",
          }}
        />
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
