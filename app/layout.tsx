import type { Metadata, Viewport } from "next";
import {
  Allura,
  Cormorant_Garamond,
  DM_Sans,
  Great_Vibes,
  Imperial_Script,
  Permanent_Marker,
  Parisienne,
} from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import InfoDialog from "@/components/InfoDialog";
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

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-permanent-marker",
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
      className={`${cormorantGaramond.variable} ${dmSans.variable} ${imperialScript.variable} ${allura.variable} ${parisienne.variable} ${greatVibes.variable} ${permanentMarker.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <I18nProvider>
          <InfoDialog />
          <LanguageSelector />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
