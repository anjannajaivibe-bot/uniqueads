import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: "Unique Ads Admin",
    short_name: "Unique Ads",
    description: "Unique Ads team operations: leads, orders, work progress and reporting.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#081a3d",
    lang: "en-IN",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
