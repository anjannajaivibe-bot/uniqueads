import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}



