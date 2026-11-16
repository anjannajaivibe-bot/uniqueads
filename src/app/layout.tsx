import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = { themeColor: "#081a3d" };

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Unique Ads", statusBarStyle: "default" },
  metadataBase: new URL("https://uniqueads.jaivibe.com"),
  icons: {
    icon: { url: "/unique-ads-logo.png", type: "image/png" },
    apple: { url: "/unique-ads-logo.png", type: "image/png" },
  },
  title: "Unique Ads Operations",
  description: "Operational administration platform for Unique Ads.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers><PwaRegistration />{children}</Providers>
      </body>
    </html>
  );
}



