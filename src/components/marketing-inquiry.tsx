"use client";

import { useState, type FormEvent } from "react";

const WHATSAPP_NUMBER = "919666566532";

export function MarketingInquiry() {
  const [continued, setContinued] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const service = String(data.get("service") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();
    const details = String(data.get("details") ?? "").trim();

    if (!name || !/^[0-9+()\-\s]{10,18}$/.test(phone) || !service || !location) return;

    const message = [
      "Hello Unique Ads, I would like to enquire about outdoor advertising.",
      `Name: ${name}`,
      `Mobile: ${phone}`,
      `Service: ${service}`,
      `Location: ${location}`,
      details ? `Requirements: ${details}` : null,
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setContinued(true);
  }

  return (
    <form className="ua-enquiry-form" onSubmit={handleSubmit}>
      <div className="ua-form-header"><span>PROJECT ENQUIRY</span><span>↗</span></div>
      <h3>LET&apos;S TALK<br />ABOUT YOUR BRAND.</h3>
      <p>A few details help us understand what you need.</p>
      <div className="ua-form-grid">
        <label>Your name <input name="name" type="text" placeholder="Full name" autoComplete="name" maxLength={90} required /></label>
        <label>Phone number <input name="phone" type="tel" placeholder="10-digit mobile" autoComplete="tel" inputMode="tel" minLength={10} maxLength={18} pattern="[0-9+()\-\s]{10,18}" required /></label>
        <label>Interested in <select name="service" defaultValue="" required><option value="" disabled>Select a service</option><option>Wall painting advertisements</option><option>Outdoor hoardings</option><option>Both formats</option></select></label>
        <label>Target location <input name="location" type="text" placeholder="City, area or route" maxLength={120} required /></label>
        <label className="ua-form-full">Campaign details <textarea name="details" rows={3} maxLength={700} placeholder="Tell us about your brand, locations or campaign goals (optional)" /></label>
      </div>
      <button type="submit" className="ua-form-submit">CONTINUE TO WHATSAPP <span aria-hidden="true">↗</span></button>
      <small className="ua-form-hint">WhatsApp opens with your details. Your enquiry is sent only when you press Send there.</small>
      {continued ? <p className="ua-form-feedback" role="status">WhatsApp was opened. Please send your message there to complete your enquiry.</p> : null}
    </form>
  );
}
