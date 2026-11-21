"use client";

import { useCallback, useEffect, useState } from "react";
import candle from "@/assets/p-candle.jpg";
import diffuser from "@/assets/p-diffuser.jpg";
import gypsum from "@/assets/p-gypsum.jpg";
import spray from "@/assets/p-spray.jpg";
import { assetSrc } from "@/lib/products";

export type SiteImageKey =
  | "homeHero"
  | "categoryCandles"
  | "categoryDiffusers"
  | "categorySprays"
  | "categoryGypsum"
  | "homeEditorialStory"
  | "homeEditorialBespoke"
  | "storyStudio"
  | "storyCraftCandles"
  | "storyCraftDiffusers"
  | "storyCraftSprays"
  | "storyCraftGypsum"
  | "reviewReel";

export type SiteImages = Record<SiteImageKey, string>;

export type SiteImageSlot = {
  key: SiteImageKey;
  label: string;
  page: "Home" | "Our Story";
  aspectHint: string;
  defaultSrc: string;
};

export const DEFAULT_SITE_IMAGES: SiteImages = {
  homeHero: "/hero-video.mp4",
  categoryCandles: "/collection-candles.mp4",
  categoryDiffusers: "/collection-diffusers.mp4",
  categorySprays: "/collection-sprays.mp4",
  categoryGypsum: "/collection-gypsum.mp4",
  homeEditorialStory: assetSrc(spray),
  homeEditorialBespoke: assetSrc(gypsum),
  storyStudio: "/hero-poster.jpg",
  storyCraftCandles: assetSrc(candle),
  storyCraftDiffusers: assetSrc(diffuser),
  storyCraftSprays: assetSrc(spray),
  storyCraftGypsum: assetSrc(gypsum),
  reviewReel: "https://www.instagram.com/reel/DfrO8vbtjcD/?bqrl=ZGIzYnAweXNucGto",
};

export const SITE_IMAGE_SLOTS: SiteImageSlot[] = [
  {
    key: "homeHero",
    label: "Hero video / banner",
    page: "Home",
    aspectHint: "16:9 / 4:3 loop (.mp4, .webm, or image)",
    defaultSrc: DEFAULT_SITE_IMAGES.homeHero,
  },
  {
    key: "categoryCandles",
    label: "Category card — Scented Candles",
    page: "Home",
    aspectHint: "4:3 landscape (.mp4 or image)",
    defaultSrc: DEFAULT_SITE_IMAGES.categoryCandles,
  },
  {
    key: "categoryDiffusers",
    label: "Category card — Reed Diffusers",
    page: "Home",
    aspectHint: "4:3 landscape (.mp4 or image)",
    defaultSrc: DEFAULT_SITE_IMAGES.categoryDiffusers,
  },
  {
    key: "categorySprays",
    label: "Category card — Room and Linen Spray",
    page: "Home",
    aspectHint: "4:3 landscape (.mp4 or image)",
    defaultSrc: DEFAULT_SITE_IMAGES.categorySprays,
  },
  {
    key: "categoryGypsum",
    label: "Category card — Gypsum Decor",
    page: "Home",
    aspectHint: "4:3 landscape (.mp4 or image)",
    defaultSrc: DEFAULT_SITE_IMAGES.categoryGypsum,
  },
  {
    key: "homeEditorialStory",
    label: "Editorial section — Our story",
    page: "Home",
    aspectHint: "Landscape / split column",
    defaultSrc: DEFAULT_SITE_IMAGES.homeEditorialStory,
  },
  {
    key: "homeEditorialBespoke",
    label: "Editorial section — Bespoke & Gifting",
    page: "Home",
    aspectHint: "Wide banner (16:10)",
    defaultSrc: DEFAULT_SITE_IMAGES.homeEditorialBespoke,
  },
  {
    key: "storyStudio",
    label: "The Gbagada Studio origin photo",
    page: "Our Story",
    aspectHint: "4:3 landscape",
    defaultSrc: DEFAULT_SITE_IMAGES.storyStudio,
  },
  {
    key: "storyCraftCandles",
    label: "Our Craft — Scented Candles",
    page: "Our Story",
    aspectHint: "4:3 landscape",
    defaultSrc: DEFAULT_SITE_IMAGES.storyCraftCandles,
  },
  {
    key: "storyCraftDiffusers",
    label: "Our Craft — Reed Diffusers",
    page: "Our Story",
    aspectHint: "4:3 landscape",
    defaultSrc: DEFAULT_SITE_IMAGES.storyCraftDiffusers,
  },
  {
    key: "storyCraftSprays",
    label: "Our Craft — Room and Linen Spray",
    page: "Our Story",
    aspectHint: "4:3 landscape",
    defaultSrc: DEFAULT_SITE_IMAGES.storyCraftSprays,
  },
  {
    key: "storyCraftGypsum",
    label: "Our Craft — Gypsum Decor",
    page: "Our Story",
    aspectHint: "4:3 landscape",
    defaultSrc: DEFAULT_SITE_IMAGES.storyCraftGypsum,
  },
  {
    key: "reviewReel",
    label: "Customer review Instagram reel",
    page: "Home",
    aspectHint: "Instagram Reel URL (or vertical .mp4 / .webm video)",
    defaultSrc: DEFAULT_SITE_IMAGES.reviewReel,
  },
];

const STORAGE_KEY = "ligera-site-images-v1";
const UPDATE_EVENT = "ligera-site-images-updated";

function readStoredOverrides(): Partial<SiteImages> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<SiteImages>;
  } catch {
    return {};
  }
}

function writeStoredOverrides(overrides: Partial<SiteImages>) {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(overrides).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    }
    window.dispatchEvent(new Event(UPDATE_EVENT));
  } catch {
    // ignore quota or privacy-mode errors
  }
}

export function getSiteImages(): SiteImages {
  const overrides = readStoredOverrides();
  const merged: SiteImages = { ...DEFAULT_SITE_IMAGES };
  for (const key of Object.keys(DEFAULT_SITE_IMAGES) as SiteImageKey[]) {
    const val = overrides[key];
    if (typeof val === "string" && val.trim() !== "") {
      const trimmed = val.trim();
      if (
        trimmed.startsWith("/_next/static/media/") ||
        trimmed === "/new-hero.mp4" ||
        (key === "reviewReel" && trimmed === "/review-reel.mp4")
      ) {
        continue;
      }
      merged[key] = trimmed;
    }
  }
  return merged;
}

export function updateSiteImage(key: SiteImageKey, url: string): SiteImages {
  const trimmed = url.trim();
  const overrides = readStoredOverrides();
  if (!trimmed || trimmed === DEFAULT_SITE_IMAGES[key]) {
    delete overrides[key];
  } else {
    overrides[key] = trimmed;
  }
  writeStoredOverrides(overrides);
  return getSiteImages();
}

export function resetSiteImage(key: SiteImageKey): SiteImages {
  const overrides = readStoredOverrides();
  delete overrides[key];
  writeStoredOverrides(overrides);
  return getSiteImages();
}

export function resetAllSiteImages(): SiteImages {
  writeStoredOverrides({});
  return { ...DEFAULT_SITE_IMAGES };
}

/** Return true when a media URL points to a playable video asset rather than a still image. */
export function isVideoMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("data:video/")) return true;
  const clean = trimmed.split(/[?#]/)[0];
  return /\.(mp4|webm|mov|ogg)$/.test(clean);
}

const INSTAGRAM_HOSTNAMES = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

type InstagramMediaRef = {
  kind: "reel" | "p" | "tv";
  shortcode: string;
};

function parseInstagramMediaUrl(url: string | null | undefined): InstagramMediaRef | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (!INSTAGRAM_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    const match = parsed.pathname.match(/^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    const rawKind = match[1];
    const kind: InstagramMediaRef["kind"] =
      rawKind === "reels" ? "reel" : (rawKind as InstagramMediaRef["kind"]);
    return { kind, shortcode: match[2] };
  } catch {
    return null;
  }
}

/** Return the canonical Instagram iframe embed URL when given a valid Instagram Reel/Post/TV URL. */
export function getInstagramEmbedUrl(url: string | null | undefined): string | null {
  const parsed = parseInstagramMediaUrl(url);
  if (!parsed) return null;
  return `https://www.instagram.com/${parsed.kind}/${parsed.shortcode}/embed/?cr=1&v=14`;
}

/** Return the clean Instagram permalink URL when given a valid Instagram Reel/Post/TV URL. */
export function getInstagramPermalinkUrl(url: string | null | undefined): string | null {
  const parsed = parseInstagramMediaUrl(url);
  if (!parsed) return null;
  return `https://www.instagram.com/${parsed.kind}/${parsed.shortcode}/`;
}

/** Return true when a media URL points to an Instagram Reel/Post/TV embed. */
export function isInstagramEmbedUrl(url: string | null | undefined): boolean {
  return getInstagramEmbedUrl(url) !== null;
}

/** Read a media File (image or video) from an `<input type="file">` into a data URL. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

/** Subscribe cleanly to editable site image overrides after hydration. */
export function useSiteImages() {
  const [images, setImages] = useState<SiteImages>(DEFAULT_SITE_IMAGES);

  useEffect(() => {
    const sync = () => setImages(getSiteImages());
    sync();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY) sync();
    };
    window.addEventListener(UPDATE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UPDATE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const updateImage = useCallback((key: SiteImageKey, url: string) => {
    setImages(updateSiteImage(key, url));
  }, []);

  const resetImage = useCallback((key: SiteImageKey) => {
    setImages(resetSiteImage(key));
  }, []);

  const resetAll = useCallback(() => {
    setImages(resetAllSiteImages());
  }, []);

  return {
    images,
    updateImage,
    resetImage,
    resetAll,
    defaultImages: DEFAULT_SITE_IMAGES,
  };
}

