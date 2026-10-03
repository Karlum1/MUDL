import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { MachineLiveProvider } from "@/hooks/useMachineLive";
import { LOCALE_BOOT } from "@/lib/i18n";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#07111c",
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  title: "Scan&Wash",
  description:
    "Scan&Wash — scan QR at the machine to start a timer, live status, and alerts.",
  applicationName: "Scan&Wash",
  appleWebApp: {
    capable: true,
    title: "Scan&Wash",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      data-theme="night"
      className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <AppProviders>
          <MachineLiveProvider>{children}</MachineLiveProvider>
        </AppProviders>
      </body>
    </html>
  );
}
