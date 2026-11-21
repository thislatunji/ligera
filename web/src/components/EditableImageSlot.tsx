"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState, type MouseEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Pencil, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProduct } from "@/lib/admin.functions";
import { productImage, type Product } from "@/lib/products";
import {
  DEFAULT_SITE_IMAGES,
  getInstagramEmbedUrl,
  isVideoMediaUrl,
  readFileAsDataUrl,
  updateSiteImage,
  resetSiteImage,
  useSiteImages,
  type SiteImageKey,
} from "@/lib/site-images";

const EDIT_MODE_STORAGE_KEY = "ligera-edit-mode-v1";
const EDIT_MODE_EVENT = "ligera-edit-mode-updated";

/** Tracks whether on-page placeholder image editing mode is active across components. */
export function useEditImagesMode() {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("editImages") === "1") {
        try {
          window.localStorage.setItem(EDIT_MODE_STORAGE_KEY, "1");
        } catch {
          // ignore
        }
        setEditing(true);
        return;
      }
      try {
        setEditing(window.localStorage.getItem(EDIT_MODE_STORAGE_KEY) === "1");
      } catch {
        setEditing(false);
      }
    };

    sync();
    window.addEventListener(EDIT_MODE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDIT_MODE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleEditing = useCallback(() => {
    setEditing((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          if (next) {
            window.localStorage.setItem(EDIT_MODE_STORAGE_KEY, "1");
          } else {
            window.localStorage.removeItem(EDIT_MODE_STORAGE_KEY);
          }
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event(EDIT_MODE_EVENT));
      }
      return next;
    });
  }, []);

  return { editing, toggleEditing };
}

type ImageEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentSrc: string;
  defaultSrc?: string;
  aspectHint?: string;
  onSave: (url: string) => void | Promise<void>;
  onReset?: () => void | Promise<void>;
};

const TRIGGER_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-background/95 px-3 py-1.5 text-[11px] font-medium tracking-[0.12em] text-foreground uppercase shadow-md backdrop-blur-sm transition-colors hover:border-gold hover:bg-forest hover:text-forest-foreground";

/** Modal dialog for updating an image via URL, file upload, or resetting to its default asset. */
export function ImageEditDialog({
  open,
  onOpenChange,
  title,
  currentSrc,
  defaultSrc,
  aspectHint,
  onSave,
  onReset,
}: ImageEditDialogProps) {
  const fileInputId = useId();
  const [urlValue, setUrlValue] = useState(currentSrc);
  const [error, setError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUrlValue(currentSrc);
      setError(null);
      setSaving(false);
    }
  }, [open, currentSrc]);

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
      setUrlValue(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read selected file.");
    } finally {
      setReadingFile(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(urlValue.trim() || defaultSrc || currentSrc);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save image.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setSaving(true);
    try {
      if (onReset) {
        await onReset();
      } else if (defaultSrc) {
        await onSave(defaultSrc);
      }
      if (defaultSrc) setUrlValue(defaultSrc);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset image.");
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = urlValue.trim() || defaultSrc || currentSrc;
  const instagramEmbedUrl = getInstagramEmbedUrl(previewSrc);
  const isCustomized = Boolean(defaultSrc && previewSrc !== defaultSrc);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit image · {title}</DialogTitle>
          {aspectHint && (
            <p className="text-xs text-muted-foreground">Recommended ratio: {aspectHint}</p>
          )}
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-sm border border-border bg-secondary/40">
            {instagramEmbedUrl ? (
              <iframe
                id="ligera-edit-dialog-preview"
                name="ligera-edit-dialog-preview"
                key={instagramEmbedUrl}
                src={instagramEmbedUrl}
                title={title}
                loading="lazy"
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-72 w-full border-0 bg-white"
              />
            ) : isVideoMediaUrl(previewSrc) ? (
              <video
                key={previewSrc}
                src={previewSrc}
                autoPlay
                loop
                muted
                playsInline
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <img
                src={previewSrc}
                alt={title}
                className="aspect-[16/10] w-full object-cover"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${fileInputId}-url`}>Image, Video, or Instagram Reel URL</Label>
            <Input
              id={`${fileInputId}-url`}
              type="text"
              value={urlValue.startsWith("data:") ? "" : urlValue}
              placeholder={
                urlValue.startsWith("data:")
                  ? "Uploaded media selected (or paste a URL to replace)"
                  : "https://... or /hero.mp4"
              }
              onChange={(e) => {
                setError(null);
                setUrlValue(e.target.value);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={fileInputId}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Upload className="h-3.5 w-3.5" />
              {readingFile ? "Loading media…" : "Upload image or video"}
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              onChange={handleFileChange}
            />

            {defaultSrc && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || (!isCustomized && !onReset)}
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </Button>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || readingFile}>
              <Check className="h-4 w-4" />
              {saving ? "Saving…" : "Save image"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type EditableImageTriggerProps = {
  imageKey: SiteImageKey;
  label: string;
  aspectHint?: string;
  positionClassName?: string;
};

/**
 * Floating "Edit image" button rendered on a storefront image slot whenever on-page
 * image editing mode is active. Calls preventDefault/stopPropagation so parent Links do not navigate.
 */
export function EditableImageTrigger({
  imageKey,
  label,
  aspectHint,
  positionClassName = "top-3 right-3",
}: EditableImageTriggerProps) {
  const { editing } = useEditImagesMode();
  const { images } = useSiteImages();
  const [open, setOpen] = useState(false);

  if (!editing) return null;

  const handleOpen = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Edit ${label} image`}
        className={`absolute z-20 ${TRIGGER_BUTTON_CLASS} ${positionClassName}`}
      >
        <Pencil className="h-3 w-3 text-gold" />
        Edit image
      </button>

      <ImageEditDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        currentSrc={images[imageKey]}
        defaultSrc={DEFAULT_SITE_IMAGES[imageKey]}
        aspectHint={aspectHint}
        onSave={(url) => {
          updateSiteImage(imageKey, url);
        }}
        onReset={() => {
          resetSiteImage(imageKey);
        }}
      />
    </>
  );
}

/**
 * Floating "Edit image" button rendered on ProductCard when on-page image editing mode is active.
 */
export function EditableProductImageTrigger({ product }: { product: Product }) {
  const { editing } = useEditImagesMode();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!editing) return null;

  const defaultSrc = productImage({ category: product.category, imageUrl: null });
  const currentSrc = productImage(product);

  const persistProductImage = async (nextUrl: string | null) => {
    await saveProduct({
      data: {
        id: product.id,
        variantId: product.variantId,
        name: product.name,
        notes: product.notes,
        category: product.category,
        price: product.price,
        stock: product.stock,
        lowStockThreshold: 5,
        active: true,
        sortOrder: 0,
        imageUrl: nextUrl && nextUrl !== defaultSrc ? nextUrl : null,
      },
    });
    await qc.invalidateQueries({ queryKey: ["products"] });
    await qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Edit ${product.name} image`}
        className={`absolute top-2.5 right-2.5 z-20 ${TRIGGER_BUTTON_CLASS}`}
      >
        <Pencil className="h-3 w-3 text-gold" />
        Edit image
      </button>

      <ImageEditDialog
        open={open}
        onOpenChange={setOpen}
        title={product.name}
        currentSrc={currentSrc}
        defaultSrc={defaultSrc}
        aspectHint="1:1 square"
        onSave={(url) => persistProductImage(url)}
        onReset={() => persistProductImage(null)}
      />
    </>
  );
}

/** Subtle floating pill allowing studio owners to toggle on-page image editing or open Studio Admin. */
export function SiteImageEditBar() {
  const { editing, toggleEditing } = useEditImagesMode();

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
      <button
        type="button"
        onClick={toggleEditing}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-md backdrop-blur-sm transition-colors ${
          editing
            ? "border-gold bg-forest text-forest-foreground"
            : "border-border bg-background/95 text-foreground hover:border-gold"
        }`}
      >
        {editing ? (
          <>
            <X className="h-3.5 w-3.5 text-gold" />
            Done editing
          </>
        ) : (
          <>
            <ImagePlus className="h-3.5 w-3.5 text-gold" />
            Edit images
          </>
        )}
      </button>

      {editing && (
        <Link
          href="/admin/images"
          className="inline-flex items-center rounded-full border border-border bg-background/95 px-3.5 py-2 text-xs font-medium text-foreground shadow-md backdrop-blur-sm transition-colors hover:border-gold"
        >
          Manage all images →
        </Link>
      )}
    </div>
  );
}
