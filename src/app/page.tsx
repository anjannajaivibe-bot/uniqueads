import type { Metadata } from "next";
import Image from "next/image";
import { MarketingInquiry } from "@/components/marketing-inquiry";
import "./landing.css";

export const metadata: Metadata = {
  title: "Wall Painting Advertising & Hoardings | Unique Ads",
  description:
    "Wall painting advertising and outdoor hoardings across Telangana, Andhra Pradesh and Karnataka. Plan your next campaign and request a quote from Unique Ads.",
  applicationName: "Unique Ads",
  keywords: [
    "wall painting advertising",
    "outdoor hoarding advertising",
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
    title: "Unique Ads | Outdoor Advertising That Gets Seen",
    description:
      "Wall painting advertising and outdoor hoardings across Telangana, Andhra Pradesh and Karnataka. Let's make your brand visible.",
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
    title: "Unique Ads | Wall Painting & Outdoor Hoardings",
    description:
      "Outdoor branding through wall painting advertising and hoardings across Telangana, Andhra Pradesh and Karnataka.",
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
  { number: "02", title: "Select the format", detail: "Discuss the right mix of painted walls and outdoor hoardings for your goals." },
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
            <p>We make brands visible beyond the screen, through wall painting advertisements and outdoor hoardings in the places people travel every day.</p>
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
        <span>WALL PAINTINGS <b>●</b> HOARDINGS <b>●</b> ON-GROUND VISIBILITY</span>
      </div>

      <section className="ua-about ua-content-width" id="about">
        <div className="ua-about-rail"><Eyebrow>01 / THE POINT OF VIEW</Eyebrow><span>OUTDOOR, BY DESIGN</span></div>
        <div className="ua-about-copy">
          <h2>Good advertising<br />is <em>worth noticing.</em></h2>
          <div className="ua-about-bottom">
            <p className="ua-about-lead">Some messages are made to disappear with the next swipe. Others become part of the route, the neighbourhood and the everyday view.</p>
            <p>At Unique Ads, our focus is on tangible, out-of-home advertising. We help businesses explore wall painting campaigns and hoardings that put their message in front of people on the move, across urban and regional markets.</p>
          </div>
        </div>
      </section>

      <section className="ua-formats ua-content-width" id="formats" aria-labelledby="ua-formats-title">
        <div className="ua-section-heading">
          <Eyebrow>02 / WHAT WE DO</Eyebrow>
          <div><h2 id="ua-formats-title">Made to be seen.<br /><em>Built for the street.</em></h2><p>Different surfaces. One goal: make the message clear and memorable.</p></div>
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
        <p className="ua-visual-disclaimer">The images on this page are illustrative visual concepts. They do not claim to depict Unique Ads projects, actual locations or delivered campaigns.</p>
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
          <details><summary>Which advertising formats are available? <span>+</span></summary><p>Unique Ads focuses on wall painting advertisements and outdoor hoardings. We can discuss the right format for your campaign goals.</p></details>
          <details><summary>Where can Unique Ads run campaigns? <span>+</span></summary><p>We serve businesses across Telangana, Andhra Pradesh and Karnataka, subject to location availability and an agreed scope of work.</p></details>
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
