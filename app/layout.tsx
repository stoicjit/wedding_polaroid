import type { Metadata, Viewport } from "next";
import {
  Allura,
  Cormorant_Garamond,
  DM_Sans,
  Great_Vibes,
  Imperial_Script,
  Parisienne,
} from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import LanguageSelector from "@/components/LanguageSelector";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import en from "@/locales/en.json";
import "../styles/globals.css";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const imperialScript = Imperial_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-imperial-script",
});

const allura = Allura({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-allura",
});

const parisienne = Parisienne({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-parisienne",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-great-vibes",
});

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Our Night!",
  },
  icons: {
    icon: "/app_icon.jpg",
    apple: "/app_icon.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${dmSans.variable} ${imperialScript.variable} ${allura.variable} ${parisienne.variable} ${greatVibes.variable}`}
    >
      <body>
        <ServiceWorkerRegistrar />
        <I18nProvider>
          <LanguageSelector />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
