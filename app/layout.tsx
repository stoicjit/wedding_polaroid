import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import LanguageSelector from "@/components/LanguageSelector";
import en from "@/locales/en.json";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wedding",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <LanguageSelector />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
