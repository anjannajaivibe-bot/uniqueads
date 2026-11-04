import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://uniqueads.jaivibe.com/",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
