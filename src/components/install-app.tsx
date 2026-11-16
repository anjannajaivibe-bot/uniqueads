"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "windows" | "desktop" | "unknown";

export function InstallApp() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setPlatform(
      ios ? "ios" : /Android/i.test(ua) ? "android" :
      /Windows/i.test(ua) ? "windows" : "desktop"
    );

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setInstalling(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome !== "accepted") setInstalling(false);
      setPromptEvent(null);
    } catch {
      setInstalling(false);
    }
  };

  const isApple = platform === "ios";
  const isAndroid = platform === "android";

  return (
    <main className="ua-install">
      <div className="ua-install-inner">
        <header className="ua-install-nav">
          <Link href="/" aria-label="Unique Ads homepage" className="ua-install-brand">
            <img src="/unique-ads-logo.png" alt="" width={46} height={46} />
            <span><strong>Unique Ads</strong><small>Operations App</small></span>
          </Link>
          <Link href="/admin" className="ua-install-nav-link">Admin Login</Link>
        </header>

        <section className="ua-install-hero">
          <div className="ua-install-intro">
            <span className="ua-install-eyebrow">STAFF & ADMIN ACCESS</span>
            <h1>Unique Ads,<br /><em>ready on your device.</em></h1>
            <p>
              Add the Unique Ads operations app to your mobile home screen or
              Windows desktop. Use your existing account to access the work
              assigned to your role.
            </p>

            {installed ? (
              <div className="ua-install-confirm" role="status">
                You are using the installed app. Open your dashboard below.
              </div>
            ) : null}

            <div className="ua-install-actions">
              {!installed && promptEvent ? (
                <button
                  type="button"
                  onClick={install}
                  disabled={installing}
                  className="ua-install-primary"
                >
                  {installing ? "Follow the install prompt" : "Install Unique Ads"}
                </button>
              ) : null}
              <Link href="/admin" className={installed ? "ua-install-primary" : "ua-install-secondary"}>
                Open Admin
              </Link>
            </div>
            <p className="ua-install-note">
              No separate account, app-store payment or data migration required.
              Internet connection is needed for live business records.
            </p>
          </div>

          <aside className="ua-install-preview" aria-label="Unique Ads application">
            <div className="ua-install-preview-head"><span /><span /><span /></div>
            <div className="ua-install-preview-body">
              <div className="ua-install-preview-logo">
                <img src="/unique-ads-logo.png" alt="Unique Ads" width={110} height={110} />
              </div>
              <strong>Unique Ads Admin</strong>
              <span>Leads · Orders · Field Work · Finance</span>
              <div className="ua-install-preview-grid">
                <div>Leads</div><div>Orders</div><div>Work Updates</div><div>Reports</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="ua-install-guide" aria-labelledby="ua-install-steps">
          <div className="ua-install-section-heading">
            <span className="ua-install-eyebrow">HOW TO INSTALL</span>
            <h2 id="ua-install-steps">
              {isApple ? "Install on iPhone or iPad" :
               isAndroid ? "Install on Android" :
               platform === "windows" ? "Install on Windows" :
               "Choose your device"}
            </h2>
            <p>
              {promptEvent
                ? "Use the Install Unique Ads button above for one-step installation."
                : "Follow the steps below if your browser does not show an Install button."}
            </p>
          </div>

          <div className="ua-install-device-grid">
            <article className={"ua-install-device" + (isAndroid ? " ua-install-device-selected" : "")}>
              <div className="ua-install-device-title"><span>01</span><h3>Android</h3></div>
              <ol>
                <li>Open this page in Chrome.</li>
                <li>Tap the three-dot menu.</li>
                <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                <li>Confirm. Open Unique Ads from your home screen.</li>
              </ol>
            </article>

            <article className={"ua-install-device" + (isApple ? " ua-install-device-selected" : "")}>
              <div className="ua-install-device-title"><span>02</span><h3>iPhone / iPad</h3></div>
              <ol>
                <li>Open this page in Safari.</li>
                <li>Tap Share, then <strong>Add to Home Screen</strong>.</li>
                <li>Turn on <strong>Open as Web App</strong> if shown.</li>
                <li>Tap Add and open Unique Ads from the home screen.</li>
              </ol>
            </article>

            <article className={"ua-install-device" + (platform === "windows" ? " ua-install-device-selected" : "")}>
              <div className="ua-install-device-title"><span>03</span><h3>Windows</h3></div>
              <ol>
                <li>Open this page in Microsoft Edge.</li>
                <li>Open the three-dot browser menu.</li>
                <li>Choose <strong>Apps → Install this site as an app</strong>.</li>
                <li>Confirm and pin it to your desktop or taskbar.</li>
              </ol>
            </article>
          </div>
        </section>

        <footer className="ua-install-footer">
          <span>Unique Ads · Team Operations</span>
          <Link href="/admin">Go to Admin Login</Link>
        </footer>
      </div>
    </main>
  );
}
