"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "ligera_cookie_consent";

type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
        setConsented(true);
        setShowBanner(false);
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(allAccepted));
    setConsented(true);
    setShowBanner(false);
  };

  const savePreferences = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
    setConsented(true);
    setShowBanner(false);
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === "necessary") return;
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
      {consented && preferences.analytics && (
        <>
          <script
            id="ga4-script"
            data-testid="ga4-script"
            dangerouslySetInnerHTML={{ __html: "" }}
          />
        </>
      )}
      {consented && preferences.marketing && (
        <>
          <script
            id="meta-pixel"
            data-testid="meta-pixel"
            dangerouslySetInnerHTML={{ __html: "" }}
          />
        </>
      )}
      {!consented && preferences.analytics && (
        <script id="ga4-script" data-testid="ga4-script" style={{ display: "none" }} />
      )}
      {!consented && preferences.marketing && (
        <script id="meta-pixel" data-testid="meta-pixel" style={{ display: "none" }} />
      )}
      {showBanner && (
        <div role="dialog" aria-label="Cookie consent">
          <div>
            <label>
              <input type="checkbox" checked={preferences.necessary} disabled />
              Necessary
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={() => togglePreference("analytics")}
              />
              Analytics
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={() => togglePreference("marketing")}
              />
              Marketing
            </label>
          </div>
          <button onClick={acceptAll}>Accept all</button>
          <button onClick={savePreferences}>Save preferences</button>
        </div>
      )}
    </>
  );
}

export default CookieConsent;
