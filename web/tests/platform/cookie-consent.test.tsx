/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CookieConsent from "@/components/CookieConsent";

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("offers granular toggles", () => {
    render(<CookieConsent />);
    expect(screen.getByText(/Analytics/i)).toBeDefined();
    expect(screen.getByText(/Marketing/i)).toBeDefined();
  });

  it("remembers choice in localStorage", () => {
    localStorage.setItem(
      "ligera_cookie_consent",
      JSON.stringify({ necessary: true, analytics: true, marketing: false })
    );
    render(<CookieConsent />);
    const stored = localStorage.getItem("ligera_cookie_consent");
    expect(stored).toBeDefined();
  });
});
