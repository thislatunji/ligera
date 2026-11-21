"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Check, ExternalLink, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getInstagramEmbedUrl,
  isVideoMediaUrl,
  readFileAsDataUrl,
  SITE_IMAGE_SLOTS,
  useSiteImages,
  type SiteImageSlot,
} from "@/lib/site-images";

function SiteImageCard({
  slot,
  currentSrc,
  onSave,
  onReset,
}: {
  slot: SiteImageSlot;
  currentSrc: string;
  onSave: (url: string) => void;
  onReset: () => void;
}) {
  const uploadId = useId();
  const [urlInput, setUrlInput] = useState(currentSrc);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);

  useEffect(() => {
    setUrlInput(currentSrc);
  }, [currentSrc]);

  const instagramEmbedUrl = getInstagramEmbedUrl(currentSrc);
  const isCustomized = currentSrc !== slot.defaultSrc;
  const isDirty = urlInput.trim() !== "" && urlInput.trim() !== currentSrc;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onReset();
      setStatusMsg("Reset to default");
      return;
    }
    onSave(trimmed);
    setError(null);
    setStatusMsg("Saved");
    window.setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Please select an image or MP4/WebM video file.");
      return;
    }
    setError(null);
    setReadingFile(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onSave(dataUrl);
      setUrlInput(dataUrl);
      setStatusMsg("Uploaded & saved");
      window.setTimeout(() => setStatusMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read selected file.");
    } finally {
      setReadingFile(false);
      e.target.value = "";
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative overflow-hidden bg-secondary/40">
        {instagramEmbedUrl ? (
          <iframe
            id={`ligera-admin-preview-${slot.key}`}
            name={`ligera-admin-preview-${slot.key}`}
            key={instagramEmbedUrl}
            src={instagramEmbedUrl}
            title={slot.label}
            loading="lazy"
            scrolling="no"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-[16/10] w-full border-0 bg-white"
          />
        ) : isVideoMediaUrl(currentSrc) ? (
          <video
            key={currentSrc}
            src={currentSrc}
            autoPlay
            loop
            muted
            playsInline
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <img
            src={currentSrc}
            alt={slot.label}
            className="aspect-[16/10] w-full object-cover"
          />
        )}
        <span className="absolute top-2.5 left-2.5 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase backdrop-blur-sm">
          {slot.page}
        </span>
        {isCustomized && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-forest px-2.5 py-0.5 text-[10px] font-medium tracking-[0.14em] text-forest-foreground uppercase">
            Custom
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div>
          <h3 className="font-display text-lg leading-snug">{slot.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{slot.aspectHint}</p>
        </div>

        <form onSubmit={handleApply} className="space-y-2.5">
          <div className="space-y-1">
            <Label htmlFor={`${uploadId}-url`} className="text-xs">
              Media URL
            </Label>
            <div className="flex gap-2">
              <Input
                id={`${uploadId}-url`}
                type="text"
                value={urlInput.startsWith("data:") ? "" : urlInput}
                placeholder={
                  urlInput.startsWith("data:")
                    ? "Uploaded media active (or paste URL)"
                    : "https://... or /hero.mp4"
                }
                onChange={(e) => {
                  setError(null);
                  setStatusMsg(null);
                  setUrlInput(e.target.value);
                }}
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" variant={isDirty ? "default" : "outline"}>
                <Check className="h-3.5 w-3.5" />
                Apply
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <label
              htmlFor={uploadId}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Upload className="h-3.5 w-3.5" />
              {readingFile ? "Loading…" : "Upload file"}
            </label>
            <input
              id={uploadId}
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!isCustomized}
              onClick={() => {
                onReset();
                setStatusMsg("Reset to default");
                window.setTimeout(() => setStatusMsg(null), 2000);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset default
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {statusMsg && <p className="text-xs text-forest dark:text-gold">{statusMsg}</p>}
        </form>
      </div>
    </article>
  );
}

export default function SiteImagesAdminPage() {
  const { images, updateImage, resetImage, resetAll, defaultImages } = useSiteImages();

  const homeSlots = SITE_IMAGE_SLOTS.filter((s) => s.page === "Home");
  const storySlots = SITE_IMAGE_SLOTS.filter((s) => s.page === "Our Story");
  const hasAnyCustom = SITE_IMAGE_SLOTS.some((s) => images[s.key] !== defaultImages[s.key]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Site &amp; editorial images</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit any hero, category card, or editorial placeholder image used on the storefront or
            Our Story page. Changes apply immediately.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Edit product images →
            </Button>
          </Link>
          <Link href="/?editImages=1">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5" />
              Edit live on storefront
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasAnyCustom}
            onClick={() => {
              if (confirm("Reset all Home and Our Story images to defaults?")) {
                resetAll();
              }
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all to defaults
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-display text-xl">Home Page Images</h3>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            View Home →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {homeSlots.map((slot) => (
            <SiteImageCard
              key={slot.key}
              slot={slot}
              currentSrc={images[slot.key]}
              onSave={(url) => updateImage(slot.key, url)}
              onReset={() => resetImage(slot.key)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-display text-xl">Our Story Page Images</h3>
          <Link href="/our-story" className="text-xs text-muted-foreground hover:text-foreground">
            View Our Story →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {storySlots.map((slot) => (
            <SiteImageCard
              key={slot.key}
              slot={slot}
              currentSrc={images[slot.key]}
              onSave={(url) => updateImage(slot.key, url)}
              onReset={() => resetImage(slot.key)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

