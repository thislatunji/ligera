/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ReelReviewCard } from "@/components/ReelReviewCard";
import {
  DEFAULT_SITE_IMAGES,
  getInstagramEmbedUrl,
  getInstagramPermalinkUrl,
  getSiteImages,
  isInstagramEmbedUrl,
} from "@/lib/site-images";

const TARGET_REEL_URL = "https://www.instagram.com/reel/DfrO8vbtjcD/?bqrl=ZGIzYnAweXNucGto";
const TARGET_EMBED_URL = "https://www.instagram.com/reel/DfrO8vbtjcD/embed/?cr=1&v=14";
const TARGET_PERMALINK_URL = "https://www.instagram.com/reel/DfrO8vbtjcD/";

describe("Instagram Reel URL helpers & site-images defaults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("parses reel, reels, and p URLs into canonical embed and permalink URLs", () => {
    expect(getInstagramEmbedUrl(TARGET_REEL_URL)).toBe(TARGET_EMBED_URL);
    expect(getInstagramPermalinkUrl(TARGET_REEL_URL)).toBe(TARGET_PERMALINK_URL);
    expect(isInstagramEmbedUrl(TARGET_REEL_URL)).toBe(true);

    expect(getInstagramEmbedUrl("https://instagram.com/reels/DfrO8vbtjcD/")).toBe(
      TARGET_EMBED_URL,
    );
    expect(getInstagramPermalinkUrl("https://instagram.com/reels/DfrO8vbtjcD/")).toBe(
      TARGET_PERMALINK_URL,
    );

    expect(getInstagramEmbedUrl("https://m.instagram.com/p/DfrO8vbtjcD/embed/")).toBe(
      "https://www.instagram.com/p/DfrO8vbtjcD/embed/?cr=1&v=14",
    );
    expect(getInstagramPermalinkUrl("https://m.instagram.com/p/DfrO8vbtjcD/embed/")).toBe(
      "https://www.instagram.com/p/DfrO8vbtjcD/",
    );
  });

  it("rejects non-Instagram, lookalike hostnames, profile URLs, and empty values", () => {
    for (const invalid of [
      "/review-reel.mp4",
      "https://evil-instagram.com/reel/abc",
      "https://www.instagram.com/ligera.est26/",
      "",
      null,
      undefined,
    ]) {
      expect(getInstagramEmbedUrl(invalid)).toBeNull();
      expect(getInstagramPermalinkUrl(invalid)).toBeNull();
      expect(isInstagramEmbedUrl(invalid)).toBe(false);
    }
  });

  it("uses the Instagram Reel as DEFAULT_SITE_IMAGES.reviewReel and ignores stale /review-reel.mp4 overrides", () => {
    expect(DEFAULT_SITE_IMAGES.reviewReel).toBe(TARGET_REEL_URL);

    localStorage.setItem(
      "ligera-site-images-v1",
      JSON.stringify({ reviewReel: "/review-reel.mp4" }),
    );
    expect(getSiteImages().reviewReel).toBe(TARGET_REEL_URL);

    localStorage.setItem(
      "ligera-site-images-v1",
      JSON.stringify({ reviewReel: "https://www.instagram.com/reel/Custom123/" }),
    );
    expect(getSiteImages().reviewReel).toBe("https://www.instagram.com/reel/Custom123/");
  });
});

describe("ReelReviewCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a full-bleed Instagram embed iframe without duplicate custom footer or placeholder quote text", () => {
    const { container } = render(<ReelReviewCard src={TARGET_REEL_URL} handle="@ligera.est26" />);

    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    expect(article?.className).toContain("overflow-hidden");
    expect(article?.className).toContain("bg-white");
    expect(article?.className.split(/\s+/)).not.toContain("p-3");
    expect(article?.className.split(/\s+/)).not.toContain("sm:p-4");
    expect(article?.className.split(/\s+/)).not.toContain("p-4");

    const iframe = screen.getByTitle("Instagram reel by @ligera.est26") as HTMLIFrameElement;
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.getAttribute("id")).toBe("ligera-instagram-review-reel");
    expect(iframe.getAttribute("name")).toBe("ligera-instagram-review-reel");
    expect(iframe.getAttribute("src")).toBe(TARGET_EMBED_URL);

    expect(screen.queryByText("@ligera.est26")).toBeNull();
    expect(screen.queryByRole("link", { name: /Watch on Instagram/i })).toBeNull();

    expect(screen.queryByText(/Tomiwa A\./i)).toBeNull();
    expect(screen.queryByText(/Amber Hush/i)).toBeNull();
    expect(screen.queryByText(/@tomiwa\.living/i)).toBeNull();
    expect(document.querySelector('img[src="/tape.webp"]')).toBeNull();
  });

  it("crops only the messy top Instagram embed header while reserving full space for native bottom chrome", () => {
    render(<ReelReviewCard src={TARGET_REEL_URL} handle="@ligera.est26" />);

    const viewport = screen.getByTestId("instagram-embed-viewport");
    expect(viewport.className).toContain("overflow-hidden");
    expect(viewport.className).toContain("bg-white");
    expect(viewport.style.height).toBe("0px");
    expect(viewport.style.paddingBottom).toBe("calc(125% + 164px)");

    const iframe = screen.getByTitle("Instagram reel by @ligera.est26") as HTMLIFrameElement;
    expect(iframe.style.top).toBe("-55px");
    expect(iframe.style.height).toBe("calc(100% + 55px)");
    expect(iframe.className).toContain("absolute");
    expect(iframe.className).toContain("bg-white");
  });

  it("resizes viewport and iframe on valid Instagram MEASURE postMessage, clamps bounds, and ignores other origins", () => {
    render(<ReelReviewCard src={TARGET_REEL_URL} handle="@ligera.est26" />);

    const viewport = screen.getByTestId("instagram-embed-viewport");
    const iframe = screen.getByTitle("Instagram reel by @ligera.est26") as HTMLIFrameElement;
    expect(iframe.style.height).toBe("calc(100% + 55px)");
    expect(viewport.style.height).toBe("0px");

    const sourceWindow = iframe.contentWindow;
    expect(sourceWindow).not.toBeNull();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://evil.example.com",
          source: sourceWindow,
          data: JSON.stringify({ type: "MEASURE", details: { height: 680 } }),
        }),
      );
    });
    expect(iframe.style.height).toBe("calc(100% + 55px)");
    expect(viewport.style.height).toBe("0px");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://www.instagram.com",
          source: sourceWindow,
          data: JSON.stringify({ type: "MEASURE", details: { height: 660 } }),
        }),
      );
    });
    expect(iframe.style.height).toBe("660px");
    expect(viewport.style.height).toBe("605px");
    expect(viewport.style.paddingBottom).toBe("");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://www.instagram.com",
          source: sourceWindow,
          data: JSON.stringify({ type: "MEASURE", details: { height: 200 } }),
        }),
      );
    });
    expect(iframe.style.height).toBe("480px");
    expect(viewport.style.height).toBe("425px");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://www.instagram.com",
          source: sourceWindow,
          data: JSON.stringify({ type: "MEASURE", details: { height: 2000 } }),
        }),
      );
    });
    expect(iframe.style.height).toBe("1100px");
    expect(viewport.style.height).toBe("1045px");
  });

  it("renders direct video uploads in a 9:16 frame without the top Reel overlay badge and keeps one footer handle", () => {
    const { container } = render(<ReelReviewCard src="/custom-review.mp4" handle="@ligera.est26" />);

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("/custom-review.mp4");
    expect(video?.parentElement?.className).toContain("aspect-[9/16]");

    expect(screen.queryByText(/^Reel$/i)).toBeNull();
    expect(screen.getAllByText("@ligera.est26")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Watch on Instagram/i })).toBeNull();
  });
});
