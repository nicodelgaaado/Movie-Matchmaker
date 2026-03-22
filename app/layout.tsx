import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import "./globals.css";

const themeInitScript = `
  (() => {
    try {
      const storedTheme = window.localStorage.getItem("theme");
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : systemPrefersDark
            ? "dark"
            : "light";

      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.dataset.theme = theme;
    } catch {
      document.documentElement.classList.remove("dark");
      document.documentElement.dataset.theme = "light";
    }
  })();
`;

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Movie Matchmaker",
  description:
    "Rate a few movies and get weighted recommendations based on similar viewers.",
  other: {
    "darkreader-lock": "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta content="" name="darkreader-lock" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
