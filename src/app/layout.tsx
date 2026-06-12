import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  dirFor,
  isLocale,
} from "@/i18n/dictionaries";

// Self-hosted at build time (no runtime Google Fonts CDN call), in keeping with
// the app's offline / self-host-first goal. Exposed as a CSS var consumed by the
// Tailwind `sans` stack (see tailwind.config.ts).
const assistant = Assistant({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-assistant",
});

export const metadata: Metadata = {
  title: "ExcalidrawDash",
  description:
    "Self-hosted Excalidraw with a dashboard: folders, search, filtering and login.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} dir={dirFor(locale)} className={assistant.variable}>
      <body>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
