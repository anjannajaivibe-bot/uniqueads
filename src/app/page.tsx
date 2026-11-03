import type { Metadata } from "next";
import Image from "next/image";
import { MarketingInquiry } from "@/components/marketing-inquiry";
import "./landing.css";

export const metadata: Metadata = {
  title: "Unique Ads | Wall Painting & Hoarding Advertising",
  description: "Make your brand visible on the streets. Unique Ads offers wall painting advertisements and outdoor hoardings across Telangana, Andhra Pradesh and Karnataka. Enquire for a campaign quote.",
  keywords: ["wall painting advertising", "hoarding advertising", "outdoor advertising Telangana", "wall branding Andhra Pradesh", "outdoor branding Karnataka", "Unique Ads"],
  openGraph: {
    title: "Unique Ads | Make Your Brand Impossible to Miss",
    description: "Wall painting advertisements and outdoor hoardings across Telangana, Andhra Pradesh and Karnataka.",
    siteName: "Unique Ads",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const CONTACT_PHONE = "+919666566532";
const WHATSAPP_URL = "https://wa.me/919666566532";

const photos = {
  mural: "https://images.unsplash.com/photo-1738854710640-0f9a7dd908d0?auto=format&fit=crop&w=1500&q=80",
  hoarding: "https://images.pexels.com/photos/8181296/pexels-photo-8181296.jpeg?auto=compress&cs=tinysrgb&w=1300",
  street: "https://images.pexels.com/photos/2119903/pexels-photo-2119903.jpeg?auto=compress&cs=tinysrgb&w=1300",
};

const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => (
  <span className="ua-arrow" aria-hidden="true">{diagonal ? "↗" : "→"}</span>
);

export default function Home() {
  return (
    <main className="ua-site" id="top">
      <div className="ua-announcement">
        <span className="ua-announcement-dot" />
        OUTDOOR BRANDING THAT GOES BEYOND THE SCREEN
        <span className="ua-announcement-side">TELANGANA · ANDHRA PRADESH · KARNATAKA</span>
      </div>

      <header className="ua-header">
        <a className="ua-logo" href="#top" aria-label="Unique Ads home">
          <span className="ua-logomark" aria-hidden="true"><i /><i /><i /></span>
          <span className="ua-logotext"><strong>UNIQUE<span>ADS</span></strong><small>OUTDOOR ADVERTISING</small></span>
        </a>
        <nav className="ua-nav" aria-label="Main navigation">
          <a href="#services">What we do</a><a href="#formats">Our formats</a>
          <a href="#approach">How we work</a><a href="#reach">Our reach</a>
        </nav>
        <a className="ua-header-cta" href="#contact">Plan a campaign <Arrow diagonal /></a>
        <details className="ua-mobile-nav">
          <summary aria-label="Open website menu"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            <a href="#services">What we do</a><a href="#formats">Our formats</a>
            <a href="#approach">How we work</a><a href="#reach">Our reach</a>
            <a href="#contact">Contact us</a><a href="/admin">Staff login</a>
          </nav>
        </details>
      </header>

      <section className="ua-hero" aria-labelledby="ua-hero-title">
        <div className="ua-hero-content">
          <span className="ua-kicker ua-kicker-light"><span /> REAL-WORLD BRAND VISIBILITY</span>
          <h1 id="ua-hero-title">MAKE YOUR<br />BRAND <em>IMPOSSIBLE</em><br />TO <span>IGNORE.</span></h1>
          <p>From walls that become landmarks to hoardings that command attention. We bring your brand into the everyday journeys of your customers.</p>
          <div className="ua-hero-actions">
            <a className="ua-btn ua-btn-orange" href="#contact">Get a campaign quote <Arrow diagonal /></a>
            <a className="ua-hero-link" href="#formats">Explore our work formats <Arrow /></a>
          </div>
          <div className="ua-hero-bottom"><span className="ua-live-indicator" /> YOUR BRAND. OUT IN THE WORLD.</div>
        </div>
        <div className="ua-hero-image">
          <Image src={photos.mural} alt="Artists painting a vibrant street wall mural, illustrating outdoor wall branding" width={1500} height={1200} priority unoptimized sizes="(max-width: 850px) 100vw, 48vw" />
          <span className="ua-photo-tag"><b>01 / THE STREET IS YOUR CANVAS</b><small>Illustrative photograph, not a completed Unique Ads project</small></span>
          <span className="ua-hero-image-corner" aria-hidden="true">UA.</span>
        </div>
      </section>

      <div className="ua-ticker" aria-label="Advertising formats">
        <div>WALL PAINTINGS <span>✳</span> HOARDINGS <span>✳</span> OUTDOOR BRANDING <span>✳</span> STREET-LEVEL IMPACT <span>✳</span></div>
      </div>

      <section className="ua-section ua-intro" id="services">
        <div className="ua-section-head">
          <span className="ua-kicker"><span /> 01 / OUR EXPERTISE</span>
          <h2>ADS YOU DON&apos;T<br /><span>SCROLL PAST.</span></h2>
        </div>
        <div className="ua-intro-body">
          <p className="ua-lead">Some advertising disappears with a swipe. Outdoor advertising becomes part of the street.</p>
          <p>Unique Ads focuses on physical brand visibility through wall painting advertisements and hoardings. Whether your audience is travelling through a city, moving through a market or passing a key road, the medium should make the message clear and memorable.</p>
          <a className="ua-text-link" href="#formats">See advertising formats <Arrow diagonal /></a>
        </div>
      </section>

      <section className="ua-formats" id="formats" aria-labelledby="ua-formats-title">
        <div className="ua-formats-top">
          <div><span className="ua-kicker"><span /> 02 / ADVERTISING FORMATS</span><h2 id="ua-formats-title">BIG IDEAS.<br />BIGGER <span>VISIBILITY.</span></h2></div>
          <p>Two proven physical formats. Many ways to put your message in front of people.</p>
        </div>
        <div className="ua-format-grid">
          <article className="ua-format-card">
            <div className="ua-format-image">
              <Image src={photos.mural} alt="Outdoor wall art being painted as an example of street-level advertising" width={900} height={720} unoptimized sizes="(max-width: 760px) 100vw, 50vw" />
              <span>01 / PAINT THE TOWN</span>
            </div>
            <div className="ua-format-info"><div><span className="ua-format-type">STREET-LEVEL BRANDING</span><h3>Wall Painting<br />Advertisements</h3><p>Turn visible wall surfaces into memorable brand communication at the locations that matter to your audience.</p></div><a className="ua-round-link" href="#contact" aria-label="Enquire about wall paintings"><Arrow diagonal /></a></div>
          </article>
          <article className="ua-format-card ua-format-card-offset">
            <div className="ua-format-image">
              <Image src={photos.hoarding} alt="Roadside advertising hoarding photographed in an outdoor setting" width={900} height={720} unoptimized sizes="(max-width: 760px) 100vw, 50vw" />
              <span>02 / OWN THE VIEW</span>
            </div>
            <div className="ua-format-info"><div><span className="ua-format-type">LARGE-FORMAT VISIBILITY</span><h3>Outdoor<br />Hoardings</h3><p>Create bold messages for outdoor advertising placements, designed to be seen and understood on the move.</p></div><a className="ua-round-link" href="#contact" aria-label="Enquire about hoardings"><Arrow diagonal /></a></div>
          </article>
        </div>
        <p className="ua-illustration-note">Photographs illustrate advertising formats. They are not presented as the Unique Ads project portfolio.</p>
      </section>

      <section className="ua-statement" aria-label="Our brand philosophy">
        <span className="ua-statement-small">GOOD ADVERTISING DOES MORE THAN GET NOTICED.</span>
        <p>IT MAKES A <span>LASTING</span> IMPRESSION.</p>
        <div className="ua-statement-star" aria-hidden="true">✳</div>
      </section>

      <section className="ua-section ua-process" id="approach">
        <div className="ua-process-head"><span className="ua-kicker"><span /> 03 / FROM BRIEF TO STREET</span><h2>BUILT FOR<br /><span>THE REAL WORLD.</span></h2><p>Every outdoor campaign starts with a clear message, the right location and a practical execution plan.</p></div>
        <ol className="ua-process-list">
          <li><span className="ua-process-number">01</span><div><h3>Tell us your goal</h3><p>Share your brand, target locations and preferred advertising format.</p></div><span aria-hidden="true">↗</span></li>
          <li><span className="ua-process-number">02</span><div><h3>Define the campaign</h3><p>Discuss the wall painting or hoarding requirements and suitable coverage.</p></div><span aria-hidden="true">↗</span></li>
          <li><span className="ua-process-number">03</span><div><h3>Take it on-ground</h3><p>Coordinate the approved campaign scope and field execution.</p></div><span aria-hidden="true">↗</span></li>
          <li><span className="ua-process-number">04</span><div><h3>Review the outcome</h3><p>Discuss completed deliverables and next-step opportunities.</p></div><span aria-hidden="true">↗</span></li>
        </ol>
      </section>

      <section className="ua-reach" id="reach">
        <div className="ua-reach-photo">
          <Image src={photos.street} alt="Busy Indian shopping street with storefront signage and people, illustrative of on-ground brand visibility" width={1000} height={1300} unoptimized sizes="(max-width: 850px) 100vw, 45vw" />
          <span>WHERE PEOPLE GO, BRANDS CAN SHOW UP.</span>
        </div>
        <div className="ua-reach-copy">
          <span className="ua-kicker ua-kicker-light"><span /> 04 / SERVICE COVERAGE</span>
          <h2>THREE STATES.<br /><em>ONE</em> BIGGER<br />STAGE.</h2>
          <p>Outdoor advertising opportunities extend beyond a single city. Unique Ads serves businesses seeking wall painting and hoarding advertising across:</p>
          <div className="ua-region-list"><div><span>01</span><strong>Telangana</strong><Arrow diagonal /></div><div><span>02</span><strong>Andhra Pradesh</strong><Arrow diagonal /></div><div><span>03</span><strong>Karnataka</strong><Arrow diagonal /></div></div>
          <p className="ua-reach-note">Placement availability and execution scope are confirmed when planning each campaign.</p>
        </div>
      </section>

      <section className="ua-section ua-questions" aria-labelledby="ua-questions-title">
        <div><span className="ua-kicker"><span /> GOOD TO KNOW</span><h2 id="ua-questions-title">QUESTIONS?<br /><span>WE&apos;VE GOT YOU.</span></h2></div>
        <div className="ua-faqs">
          <details><summary>What outdoor advertising does Unique Ads offer?<b>+</b></summary><p>Our core formats are wall painting advertisements and outdoor hoardings. Share your campaign goals so we can discuss a suitable approach.</p></details>
          <details><summary>Which locations do you cover?<b>+</b></summary><p>Unique Ads works across Telangana, Andhra Pradesh and Karnataka. Specific locations depend on the campaign brief and availability.</p></details>
          <details><summary>Can I request an estimate for my brand?<b>+</b></summary><p>Yes. Tell us your brand, preferred format, locations and approximate requirements. We can discuss the scope before preparing a quotation.</p></details>
          <details><summary>Are the website photos completed Unique Ads projects?<b>+</b></summary><p>No. The current photographs illustrate advertising formats and street-level visibility. Verified project photographs can be added to the portfolio separately.</p></details>
        </div>
      </section>

      <section className="ua-contact" id="contact" aria-labelledby="ua-contact-title">
        <div className="ua-contact-left">
          <span className="ua-kicker ua-kicker-light"><span /> 05 / LET&apos;S MAKE IT VISIBLE</span>
          <h2 id="ua-contact-title">YOUR NEXT<br />BIG IDEA<br /><em>GOES HERE.</em></h2>
          <p>Tell us where you want your brand to be seen. Let&apos;s discuss an outdoor advertising plan that fits.</p>
          <a className="ua-contact-phone" href={`tel:${CONTACT_PHONE}`}>Call us: +91 96665 66532 <Arrow diagonal /></a>
          <a className="ua-contact-whatsapp" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <Arrow diagonal /></a>
        </div>
        <div className="ua-contact-form"><MarketingInquiry /></div>
      </section>

      <footer className="ua-footer">
        <div className="ua-footer-main">
          <a className="ua-logo ua-logo-footer" href="#top"><span className="ua-logomark" aria-hidden="true"><i /><i /><i /></span><span className="ua-logotext"><strong>UNIQUE<span>ADS</span></strong><small>OUTDOOR ADVERTISING</small></span></a>
          <p>Bold outdoor branding for the places where your audience lives, works and travels.</p>
          <a href="#top" className="ua-top-link">BACK TO TOP ↑</a>
        </div>
        <div className="ua-footer-bottom"><span>© {new Date().getFullYear()} UNIQUE ADS. ALL RIGHTS RESERVED.</span><span>TELANGANA · ANDHRA PRADESH · KARNATAKA</span><a href="/admin">STAFF LOGIN</a></div>
      </footer>

      <div className="ua-mobile-bottom">
        <a href={`tel:${CONTACT_PHONE}`} aria-label="Call Unique Ads">CALL NOW</a>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Message Unique Ads on WhatsApp">WHATSAPP ↗</a>
      </div>
    </main>
  );
}
