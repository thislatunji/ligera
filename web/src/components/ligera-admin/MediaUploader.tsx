"use client";

import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { uploadAdminMedia } from "@/lib/admin/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type UploadedMediaItem = {
  publicId: string;
  url?: string;
  alt: string;
  width: number;
  height: number;
  position: number;
};

type SingleModeProps = {
  mode: "single";
  value: { publicId: string; alt: string } | null;
  onChange: (next: { publicId: string; alt: string } | null) => void;
  defaultAlt?: string;
  label?: string;
  allowVideo?: boolean;
};

type GalleryModeProps = {
  mode: "gallery";
  value: UploadedMediaItem[];
  onChange: (next: UploadedMediaItem[]) => void;
  defaultAlt?: string;
  maxItems?: number;
  label?: string;
};

export function MediaUploader(props: SingleModeProps | GalleryModeProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);

  const fallbackAlt = (props.defaultAlt || "Ligera studio image").trim();
  const safeDefaultAlt = fallbackAlt.length >= 3 ? fallbackAlt : `${fallbackAlt} image`;

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      if (props.mode === "single") {
        const file = fileArray[0];
        const uploaded = await uploadAdminMedia(file);
        props.onChange({
          publicId: uploaded.publicId,
          alt: props.value?.alt?.trim() || safeDefaultAlt,
        });
        toast.success(uploaded.viaCloudinary ? "Uploaded to Cloudinary" : "Image attached");
      } else {
        const maxItems = props.maxItems ?? 12;
        const remaining = maxItems - props.value.length;
        if (remaining <= 0) {
          toast.error(`You can attach up to ${maxItems} images.`);
          return;
        }
        const slice = fileArray.slice(0, remaining);
        const nextItems = [...props.value];
        for (const file of slice) {
          if (!file.type.startsWith("image/")) {
            toast.error(`Skipped ${file.name} (images only).`);
            continue;
          }
          const uploaded = await uploadAdminMedia(file);
          nextItems.push({
            publicId: uploaded.publicId,
            url: uploaded.url,
            alt: `${safeDefaultAlt} ${nextItems.length + 1}`,
            width: uploaded.width,
            height: uploaded.height,
            position: nextItems.length,
          });
        }
        props.onChange(nextItems.map((item, idx) => ({ ...item, position: idx })));
        toast.success("Image(s) added");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (props.mode === "single") {
    const currentUrl = props.value?.publicId || "";
    const isValidPreview = Boolean(currentUrl);

    return (
      <div className="space-y-3 rounded-lg border border-border bg-secondary/25 p-3.5">
        {props.label && <Label className="text-xs font-medium">{props.label}</Label>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
            {isValidPreview ? (
              <img
                src={currentUrl}
                alt={props.value?.alt || safeDefaultAlt}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground/60" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex gap-2">
              <Input
                type="text"
                value={currentUrl.startsWith("data:") ? "" : currentUrl}
                placeholder={
                  currentUrl.startsWith("data:")
                    ? "Uploaded image active (or paste https:// URL)"
                    : "Paste image URL (https://...)"
                }
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (!val) {
                    props.onChange(null);
                  } else {
                    props.onChange({
                      publicId: val,
                      alt: props.value?.alt?.trim() || safeDefaultAlt,
                    });
                  }
                }}
                className="h-8 text-xs"
              />
              <label
                htmlFor={inputId}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-secondary"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Upload"}
              </label>
              <input
                id={inputId}
                type="file"
                accept={props.allowVideo ? "image/*,video/mp4,video/webm" : "image/*"}
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {props.value && (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={props.value.alt}
                  placeholder="Descriptive alt text"
                  onChange={(e) =>
                    props.onChange({
                      publicId: props.value!.publicId,
                      alt: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-destructive"
                  onClick={() => props.onChange(null)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Gallery mode
  const maxItems = props.maxItems ?? 12;

  const addByUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (props.value.length >= maxItems) {
      toast.error(`Maximum ${maxItems} images allowed.`);
      return;
    }
    const next: UploadedMediaItem[] = [
      ...props.value,
      {
        publicId: trimmed,
        url: trimmed,
        alt: `${safeDefaultAlt} ${props.value.length + 1}`,
        width: 1200,
        height: 1200,
        position: props.value.length,
      },
    ];
    props.onChange(next);
    setUrlInput("");
  };

  const moveItem = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= props.value.length) return;
    const copy = [...props.value];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    props.onChange(copy.map((item, idx) => ({ ...item, position: idx })));
  };

  const removeItem = (index: number) => {
    const next = props.value
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, position: idx }));
    props.onChange(next);
  };

  const updateAlt = (index: number, alt: string) => {
    const next = props.value.map((item, idx) => (idx === index ? { ...item, alt } : item));
    props.onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          {props.label || "Product gallery"} ({props.value.length}/{maxItems})
        </Label>
        <span className="text-[11px] text-muted-foreground">First image is the storefront cover</span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
          dragging ? "border-gold bg-gold/10" : "border-border bg-secondary/20"
        }`}
      >
        <ImagePlus className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Drag and drop product images here, or{" "}
          <label
            htmlFor={inputId}
            className="cursor-pointer font-medium text-forest underline underline-offset-2"
          >
            browse files
          </label>
        </p>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading && <p className="text-xs font-medium text-forest">Uploading media…</p>}
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Or paste an image URL (https://...)"
          className="h-8 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addByUrl();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addByUrl} className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add URL
        </Button>
      </div>

      {props.value.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {props.value.map((img, idx) => (
            <div
              key={`${img.publicId.slice(0, 24)}-${idx}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-secondary/40">
                <img
                  src={img.url || img.publicId}
                  alt={img.alt || safeDefaultAlt}
                  className="h-full w-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-forest px-2 py-0.5 text-[10px] font-medium text-forest-foreground uppercase">
                    Primary
                  </span>
                )}
              </div>

              <Input
                type="text"
                value={img.alt}
                onChange={(e) => updateAlt(idx, e.target.value)}
                placeholder="Alt text (min 3 chars)"
                className="h-7 text-[11px]"
              />

              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, -1)}
                    aria-label="Move left"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={idx === props.value.length - 1}
                    onClick={() => moveItem(idx, 1)}
                    aria-label="Move right"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
