/**
 * Public, factual schema for Unique Ads.
 * No unverified street address, reviews, opening hours, or performance claims.
 */
const origin = "https://uniqueads.jaivibe.com";
const company = `${origin}/#organization`;
const regionNames = ["Telangana", "Andhra Pradesh", "Karnataka"];

const areas = regionNames.map((name) => ({
  "@type": "AdministrativeArea",
  name,
  containedInPlace: { "@type": "Country", name: "India" },
}));

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": company,
      name: "Unique Ads",
      url: `${origin}/`,
      description:
        "Outdoor advertising business offering wall painting advertisements and hoardings across Telangana, Andhra Pradesh and Karnataka.",
      logo: {
        "@type": "ImageObject",
        url: `${origin}/unique-ads-logo.png`,
        contentUrl: `${origin}/unique-ads-logo.png`,
      },
      telephone: "+919666566532",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+919666566532",
        contactType: "sales",
        areaServed: "IN",
      },
      areaServed: areas,
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: `${origin}/`,
      name: "Unique Ads",
      publisher: { "@id": company },
      inLanguage: "en-IN",
    },
    {
      "@type": "WebPage",
      "@id": `${origin}/#webpage`,
      url: `${origin}/`,
      name: "Wall Painting Advertising & Hoardings | Unique Ads",
      isPartOf: { "@id": `${origin}/#website` },
      about: { "@id": company },
      inLanguage: "en-IN",
      mainEntity: [
        { "@id": `${origin}/#wall-painting-service` },
        { "@id": `${origin}/#hoarding-service` },
      ],
    },
    {
      "@type": "Service",
      "@id": `${origin}/#wall-painting-service`,
      name: "Wall Painting Advertising",
      serviceType: "Outdoor wall painting advertisements",
      description:
        "Planning and execution of outdoor wall painting advertisements, subject to location suitability, availability and agreed campaign scope.",
      provider: { "@id": company },
      areaServed: areas,
      url: `${origin}/#formats`,
    },
    {
      "@type": "Service",
      "@id": `${origin}/#hoarding-service`,
      name: "Outdoor Hoarding Advertising",
      serviceType: "Outdoor hoardings",
      description:
        "Large-format outdoor hoarding advertising, with placements and campaign scope discussed according to the selected location.",
      provider: { "@id": company },
      areaServed: areas,
      url: `${origin}/#formats`,
    },
  ],
};

export function StructuredData() {
  // Escape HTML-sensitive characters even though values above are static.
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
