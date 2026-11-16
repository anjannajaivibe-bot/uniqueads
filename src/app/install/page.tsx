import type { Metadata } from "next";
import { InstallApp } from "@/components/install-app";
import "./install.css";

export const metadata: Metadata = {
  title: "Install Unique Ads Admin",
  description: "Install the Unique Ads operations app on Android, iPhone or Windows.",
  robots: { index: false, follow: false },
};

export default function InstallPage() {
  return <InstallApp />;
}
