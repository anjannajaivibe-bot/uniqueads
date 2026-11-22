import type { Metadata } from "next";
import Image from "next/image";
import { MarketingInquiry } from "@/components/marketing-inquiry";
import { StructuredData } from "@/components/structured-data";
import "./landing.css";

export const metadata: Metadata = {
  title: "Wall Painting, Hoardings & Sign Boards | Unique Ads",
  description:
    "Outdoor advertising services across Telangana, Andhra Pradesh and Karnataka: wall painting, high-rise wall branding, hoardings, unipoles, glow sign boards, backlit and non-backlit flex boards, and embedded signage.",
  applicationName: "Unique Ads",
  keywords: [
    "wall painting advertising",
    "outdoor hoarding advertising",
    "high rise wall painting advertising",
    "unipole advertising",
    "glow sign boards",
    "backlit flex boards",
    "non backlit flex boards",
    "embedded sign boards",
    "wall advertising Telangana",
    "hoarding advertising Andhra Pradesh",
    "outdoor advertising Karnataka",
    "out-of-home advertising",
    "Unique Ads",
  ],
  alternates: { canonical: "https://uniqueads.jaivibe.com/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://uniqueads.jaivibe.com/",
    siteName: "Unique Ads",
    title: "Unique Ads | Wall Painting, Hoardings & Signage",
    description:
      "Wall painting, high-rise branding, unipole advertising, hoardings, illuminated sign boards and flex displays across Telangana, Andhra Pradesh and Karnataka.",
    images: [
      {
        url: "/marketing/editorial-wall-painting.jpg",
        width: 1200,
        height: 800,
        type: "image/jpeg",
        alt: "Illustrative roadside wall painting concept representing outdoor branding by Unique Ads",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unique Ads | Outdoor Advertising & Sign Boards",
    description:
      "Outdoor advertising, high-rise wall painting, unipoles and professional sign board solutions across Telangana, Andhra Pradesh and Karnataka.",
    images: ["/marketing/editorial-wall-painting.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const phone = "+919666566532";
const whatsapp = "https://wa.me/919666566532";

const steps = [
  { number: "01", title: "Share your brief", detail: "Tell us about your business, intended audience and campaign locations." },
  { number: "02", title: "Select the format", detail: "Choose from wall painting, high-rise branding, hoardings, unipoles and illuminated or non-lit sign boards." },
  { number: "03", title: "Plan the execution", detail: "Confirm the proposed locations, scope and creative requirements." },
  { number: "04", title: "Take it outdoors", detail: "Coordinate the approved execution and review campaign deliverables." },
];

function Arrow({ external = false }: { external?: boolean }) {
  return <span aria-hidden="true">{external ? "↗" : "→"}</span>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="ua-eyebrow"><span className="ua-small-rule" />{children}</span>;
}

export default function Home() {
  return (
    <main id="top" className="ua-site">
      <StructuredData />
      <div className="ua-topline">
        <span>UNIQUE ADS <span className="ua-topline-slash">/</span> OUT-OF-HOME BRANDING</span>
        <span>TELANGANA · ANDHRA PRADESH · KARNATAKA</span>
      </div>

      <header className="ua-header">
        <a href="#top" aria-label="Unique Ads homepage" className="ua-wordmark">
          <Image src="/unique-ads-logo.png" width={62} height={62} alt="" priority className="ua-brand-image" />
          <span><strong>UNIQUE <i>ADS</i></strong><small>OUTDOOR BRANDING</small></span>
        </a>
        <nav className="ua-desktop-nav" aria-label="Primary navigation">
          <a href="#about">About</a>
          <a href="#formats">What we do</a>
          <a href="#approach">Our approach</a>
          <a href="#coverage">Where we work</a>
        </nav>
        <a className="ua-nav-quote" href="#contact">Discuss a project <Arrow external /></a>
        <details className="ua-mobile-menu">
          <summary aria-label="Open navigation"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            <a href="#about">About</a><a href="#formats">What we do</a>
            <a href="#approach">Our approach</a><a href="#coverage">Where we work</a>
            <a href="#contact">Enquire</a><a href="/admin">Staff login</a>
          </nav>
        </details>
      </header>

      <section className="ua-hero" aria-labelledby="ua-hero-title">
        <div className="ua-hero-copy">
          <div className="ua-hero-top"><Eyebrow>WALL PAINTING & OUTDOOR MEDIA</Eyebrow><span>EST. IN THE REAL WORLD</span></div>
          <h1 id="ua-hero-title">Your brand<br />belongs <em>out<br />in the world.</em></h1>
          <div className="ua-hero-lower">
            <p>We make brands visible beyond the screen, through wall painting, high-rise branding, hoardings and professionally planned sign boards in the places people travel every day.</p>
            <a href="#contact" className="ua-link-arrow">Start a conversation <Arrow external /></a>
          </div>
          <div className="ua-hero-index"><span>01 / 05</span><span>THE ART OF BEING SEEN</span></div>
        </div>
        <figure className="ua-hero-photo">
          <Image src="/marketing/editorial-wall-painting.jpg" alt="Illustration of painters creating a large navy and orange advertisement on a roadside wall" fill priority sizes="(max-width: 850px) 100vw, 50vw" />
          <figcaption><span>FIG. 01</span> A WALL CAN BECOME A CANVAS.<small>Concept image illustrating the format, not a documented Unique Ads project.</small></figcaption>
        </figure>
      </section>

      <div className="ua-editorial-strip">
        <span>NOT JUST AN ADVERTISEMENT. A PRESENCE.</span>
        <span>WALL PAINTINGS <b>●</b> HOARDINGS <b>●</b> SIGN BOARDS</span>
      </div>

      <section className="ua-about ua-content-width" id="about">
        <div className="ua-about-rail"><Eyebrow>01 / THE POINT OF VIEW</Eyebrow><span>OUTDOOR, BY DESIGN</span></div>
        <div className="ua-about-copy">
          <h2>Good advertising<br />is <em>worth noticing.</em></h2>
          <div className="ua-about-bottom">
            <p className="ua-about-lead">Some messages are made to disappear with the next swipe. Others become part of the route, the neighbourhood and the everyday view.</p>
            <p>At Unique Ads, we work with tangible advertising formats, from street-level and high-rise wall painting to hoardings, unipoles, illuminated shop signs and flex display boards. The right execution starts with understanding your audience, location and the message you want people to notice.</p>
          </div>
        </div>
      </section>

      <section className="ua-formats ua-content-width" id="formats" aria-labelledby="ua-formats-title">
        <div className="ua-section-heading">
          <Eyebrow>02 / WHAT WE DO</Eyebrow>
          <div><h2 id="ua-formats-title">Made to be seen.<br /><em>Built for the street.</em></h2><p>From roadside walls to elevated billboards and shopfront signage, we help brands choose the right physical format for every location.</p></div>
        </div>

        <article className="ua-feature ua-feature-first">
          <figure className="ua-feature-image">
            <Image src="/marketing/editorial-wall-painting.jpg" alt="Illustrative roadside wall-painting advertising scene showing painters at work" fill sizes="(max-width: 850px) 100vw, 64vw" />
            <figcaption>01 <span>ILLUSTRATIVE WALL PAINTING VISUAL</span></figcaption>
          </figure>
          <div className="ua-feature-copy">
            <span className="ua-feature-no">FORMAT NO. 01 <span> / STREET-LEVEL MEDIA</span></span>
            <h3>Wall painting<br /><em>advertisements.</em></h3>
            <p>Turn available, highly visible walls into on-ground brand communication. A well-considered wall message can become a familiar sight along local roads, market areas and commercial routes.</p>
            <a href="#contact" className="ua-link-arrow">Enquire about wall painting <Arrow external /></a>
          </div>
        </article>

        <article className="ua-feature ua-feature-reverse">
          <figure className="ua-feature-image">
            <Image src="/marketing/editorial-hoarding.jpg" alt="Illustrative large-format roadside hoarding in navy, orange and cream during sunset" fill sizes="(max-width: 850px) 100vw, 64vw" />
            <figcaption>02 <span>ILLUSTRATIVE HOARDING VISUAL</span></figcaption>
          </figure>
          <div className="ua-feature-copy">
            <span className="ua-feature-no">FORMAT NO. 02 <span> / LARGE-FORMAT MEDIA</span></span>
            <h3>Outdoor<br /><em>hoardings.</em></h3>
            <p>Large-format outdoor advertising designed for visibility across busy roads and key locations. We can discuss your target areas, placement requirements and the scope of a proposed campaign.</p>
            <a href="#contact" className="ua-link-arrow">Enquire about hoardings <Arrow external /></a>
          </div>
        </article>
        <div className="ua-more-services" aria-labelledby="ua-additional-services-title">
          <div className="ua-more-services-heading">
            <div><span className="ua-services-kicker">EXPANDED OUTDOOR & SIGNAGE SERVICES</span>
              <h3 id="ua-additional-services-title">Beyond the billboard.<br /><em>Every surface matters.</em></h3>
            </div>
            <p>High-rise visibility, retail signage and illuminated or non-illuminated display formats. Each project begins with the site dimensions, material requirements and intended viewing conditions.</p>
          </div>
          <div className="ua-service-grid">
            {[
              { id: "high-rise-wall-painting", number: "03", name: "High-Rise Wall Painting", category: "LARGE-SCALE WALL BRANDING", image: "1292257", alt: "Painters on scaffolding working on a large building wall mural", description: "Make use of prominent building elevations with large-scale painted branding. We review wall dimensions, visibility, surface suitability and safe access before defining the execution scope.", subject: "high-rise wall painting" },
              { id: "unipole-advertising", number: "04", name: "Unipole Advertising", category: "ELEVATED OUTDOOR MEDIA", image: "16695395", alt: "Elevated outdoor billboard structure viewed against the sky", description: "Single-column, elevated advertising displays for brands seeking a commanding roadside presence. Placement, display size, structural feasibility and permissions are assessed for each location.", subject: "unipole advertising" },
              { id: "glow-sign-boards", number: "05", name: "Glow Sign Boards", category: "ILLUMINATED BUSINESS SIGNAGE", image: "2482119", alt: "Illuminated commercial shop sign glowing in an urban storefront", description: "Illuminated signage for shops, showrooms and business premises. We discuss dimensions, sign-face materials, lighting options and legibility to suit the building frontage.", subject: "glow sign boards" },
              { id: "backlit-flex-boards", number: "06", name: "Backlit Flex Boards", category: "ILLUMINATED FLEX DISPLAYS", image: "5401768", alt: "Retail storefront illuminated after dark showing signage and lighting", description: "Lightbox-style flex displays that illuminate printed graphics from behind. An option for storefronts and promotional panels where after-dark readability is important.", subject: "backlit flex boards" },
              { id: "non-backlit-flex-boards", number: "07", name: "Non-Backlit Flex Boards", category: "PRINTED DISPLAY SIGNAGE", image: "4913828", alt: "Non-illuminated advertising display board in an outdoor urban setting", description: "Printed flex panels for daylight-facing advertisements, shop fascias and short-term campaigns. We plan size, mounting method and artwork readability for the intended placement.", subject: "non-backlit flex boards" },
              { id: "embedded-sign-boards", number: "08", name: "Embedded Sign Boards", category: "INTEGRATED FACADE SIGNAGE", image: "30364739", alt: "Storefront with architectural sign board integrated into the facade", description: "Integrated sign boards designed to sit neatly within a building fascia or architectural feature. Suitable for businesses that want a clean, coordinated exterior identity.", subject: "embedded sign boards" },
            ].map((service) => (
              <article className="ua-service-card" key={service.id} id={service.id}>
                <figure className="ua-service-card-image">
                  <img
                    src={`https://images.pexels.com/photos/${service.image}/pexels-photo-${service.image}.jpeg?auto=compress&cs=tinysrgb&w=960`}
                    width={960} height={720} alt={service.alt} loading="lazy" decoding="async"
                  />
                  <figcaption>{service.number} <span>REFERENCE PHOTOGRAPH</span></figcaption>
                </figure>
                <div className="ua-service-card-copy">
                  <span className="ua-service-category">{service.category}</span>
                  <h4>{service.name}</h4>
                  <p>{service.description}</p>
                  <a href="#contact" className="ua-service-cta" aria-label={`Enquire about ${service.subject}`}>
                    Discuss this service <Arrow external />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
        <p className="ua-visual-disclaimer">All service photographs and visual concepts are illustrative references, not photographs of completed Unique Ads projects or confirmed advertising locations.</p>
      </section>

      <section className="ua-guide ua-content-width" id="planning-guide" aria-labelledby="ua-guide-title">
        <div className="ua-guide-heading">
          <Eyebrow>FIELD NOTES / PLANNING AN OUTDOOR CAMPAIGN</Eyebrow>
          <h2 id="ua-guide-title">Wall painting or hoardings?<br /><em>Choose the right format.</em></h2>
          <p>The right format depends on where people will see the message, how quickly they need to understand it and which locations are actually available.</p>
        </div>
        <div className="ua-guide-grid">
          <article>
            <span className="ua-guide-number">01 / WALL ADVERTISING</span>
            <h3>For local, repeat visibility</h3>
            <p>Wall painting advertisements use suitable wall surfaces to communicate a brand message at street level. Start by identifying neighbourhoods, markets and routes relevant to your customers. For high-rise branding, the wall condition, viewing distance, safe access arrangements and required permissions are equally important.</p>
          </article>
          <article>
            <span className="ua-guide-number">02 / LARGE-FORMAT ADVERTISING</span>
            <h3>For bold roadside messages</h3>
            <p>Hoardings and unipoles use dedicated structures for larger-format messages. Suitability depends on viewing distance, surrounding traffic, legibility, structural requirements and available placements. Keep the message simple enough to read while passing.</p>
          </article>
          <article>
            <span className="ua-guide-number">03 / THE CAMPAIGN BRIEF</span>
            <h3>What should you share for a quote?</h3>
            <p>Tell us your target city or route, intended audience, preferred format and campaign objective. If the enquiry is for a sign board, share the fascia dimensions and whether lighting is needed. For outdoor campaigns, include the number of sites, artwork and target period. These details help us define a practical scope.</p>
          </article>
        </div>
        <div className="ua-guide-bottom">
          <p>Every location needs a separate suitability and availability check. Property consent and applicable local permissions must be confirmed before an outdoor campaign proceeds.</p>
          <a className="ua-link-arrow" href="#contact">Discuss your campaign <Arrow external /></a>
        </div>
      </section>

      <section className="ua-quote-panel">
        <div className="ua-content-width ua-quote-inner">
          <span>THE OUTDOOR PERSPECTIVE</span>
          <blockquote>“The best place for a message is where <em>people will actually see it.</em>”</blockquote>
          <span className="ua-quote-symbol" aria-hidden="true">✳</span>
        </div>
      </section>

      <section className="ua-approach ua-content-width" id="approach">
        <div className="ua-approach-copy">
          <Eyebrow>03 / THE PROCESS</Eyebrow>
          <h2>Thoughtful planning.<br /><em>Visible execution.</em></h2>
          <p>Outdoor campaigns work best when the audience, format, location and creative are considered together.</p>
        </div>
        <ol className="ua-steps">
          {steps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.detail}</p></div>
              <span aria-hidden="true">↗</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="ua-coverage" id="coverage">
        <figure className="ua-coverage-photo">
          <Image src="/marketing/editorial-storefront.jpg" alt="Illustration of an outdoor branding installation on a commercial storefront" fill sizes="(max-width: 850px) 100vw, 45vw" />
          <figcaption>THE EVERYDAY WORLD IS FULL OF OPPORTUNITY.<small>Illustrative image, not project evidence.</small></figcaption>
        </figure>
        <div className="ua-coverage-content">
          <Eyebrow>04 / OUR COVERAGE</Eyebrow>
          <h2>Beyond one city.<br /><em>Across three states.</em></h2>
          <p>Our service area extends across Telangana, Andhra Pradesh and Karnataka. Suitable locations and execution scope are discussed for every campaign.</p>
          <div className="ua-state-list">
            <div><span>01</span><strong>Telangana</strong></div>
            <div><span>02</span><strong>Andhra Pradesh</strong></div>
            <div><span>03</span><strong>Karnataka</strong></div>
          </div>
        </div>
      </section>

      <section className="ua-faq ua-content-width">
        <div><Eyebrow>A FEW MORE DETAILS</Eyebrow><h2>Before we<br /><em>get started.</em></h2></div>
        <div className="ua-faq-list">
          <details><summary>Which advertising formats are available? <span>+</span></summary><p>Our services include regular and high-rise wall painting, outdoor hoardings, unipole advertising, glow sign boards, backlit and non-backlit flex boards, and embedded sign boards. We can discuss the appropriate material, location and scope for your project.</p></details>
          <details><summary>Where can Unique Ads run campaigns? <span>+</span></summary><p>We serve businesses across Telangana, Andhra Pradesh and Karnataka, subject to location availability and an agreed scope of work.</p></details>
          <details><summary>How do I choose between wall painting and hoardings? <span>+</span></summary><p>Start with your target audience, preferred road or locality and message. Painted walls suit repeat local visibility, while hoardings and unipoles carry larger messages along roads. Glow signs, flex boards and embedded signs are usually chosen for storefronts or defined display locations. The best fit depends on viewing distance, permissions, available space and budget.</p></details>
          <details><summary>Do outdoor wall advertisements require permission? <span>+</span></summary><p>Property owner consent and any applicable local approvals must be checked before work begins. Placement availability and requirements vary by site.</p></details>
          <details><summary>How do I get a quotation? <span>+</span></summary><p>Use the enquiry form below and share your business, preferred format, location and campaign requirements. Your message opens in WhatsApp for you to send.</p></details>
        </div>
      </section>

      <section className="ua-contact" id="contact">
        <div className="ua-contact-intro">
          <Eyebrow>05 / LET'S TALK</Eyebrow>
          <h2>Let’s make<br />something<br /><em>visible.</em></h2>
          <p>Tell us a little about your brand, the audience you want to reach and the places you want to be seen.</p>
          <div className="ua-contact-links">
            <a href={`tel:${phone}`}>Call +91 96665 66532 <Arrow external /></a>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">Message on WhatsApp <Arrow external /></a>
          </div>
        </div>
        <div className="ua-contact-form"><MarketingInquiry /></div>
      </section>

      <footer className="ua-footer">
        <div className="ua-footer-top">
          <a href="#top" className="ua-wordmark ua-footer-brand">
            <Image src="/unique-ads-logo.png" width={59} height={59} alt="" className="ua-brand-image" />
            <span><strong>UNIQUE <i>ADS</i></strong><small>OUTDOOR BRANDING</small></span>
          </a>
          <p>Advertising for places where<br />people live, travel and connect.</p>
          <a href="#top">Back to top ↑</a>
        </div>
        <div className="ua-footer-bottom"><span>© {new Date().getFullYear()} Unique Ads</span><span>Telangana · Andhra Pradesh · Karnataka</span><a href="/admin">Staff login</a></div>
      </footer>

      <nav className="ua-mobile-cta" aria-label="Contact shortcuts">
        <a href={`tel:${phone}`}>Call us</a>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
      </nav>
    </main>
  );
}
