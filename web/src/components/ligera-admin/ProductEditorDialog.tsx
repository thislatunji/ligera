"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Info, Plus, Trash2, X } from "lucide-react";
import {
  adminApi,
  type AdminCategory,
  type AdminProductDetail,
  type AdminProductPayload,
  type AdminProductRow,
} from "@/lib/admin/client";
import { naira } from "@/lib/products";
import { MediaUploader, type UploadedMediaItem } from "./MediaUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type VariantDraft = {
  id?: string;
  label: string;
  sku: string;
  skuEdited: boolean;
  price: string;
  salePrice: string;
  costPrice: string;
  initialStock: string;
  currentStock: number;
  available: number;
  lowStockThreshold: string;
  active: boolean;
};

type ProductFormState = {
  name: string;
  description: string;
  categoryId: string;
  spaceTagIds: string[];
  scentTop: string[];
  scentHeart: string[];
  scentBase: string[];
  ingredients: string;
  safetyInfo: string;
  burnTime: string;
  dimensions: string;
  finish: string;
  madeToOrder: boolean;
  leadTimeDays: string;
  featured: boolean;
  sortOrder: string;
  publishImmediately: boolean;
  images: UploadedMediaItem[];
  pairsWith: string[];
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string;
  variants: VariantDraft[];
  removedVariantIds: string[];
};

function makeSlugPreview(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product-slug"
  );
}

function makeSku(name: string, label: string, index: number): string {
  const base = (name || "LG")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 14);
  const suffix = (label || `V${index + 1}`)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${base || "LIGERA"}-${suffix || index + 1}-${rand}`;
}

function createEmptyForm(defaultCategoryId = ""): ProductFormState {
  return {
    name: "",
    description: "",
    categoryId: defaultCategoryId,
    spaceTagIds: [],
    scentTop: [],
    scentHeart: [],
    scentBase: [],
    ingredients: "",
    safetyInfo: "",
    burnTime: "",
    dimensions: "",
    finish: "",
    madeToOrder: false,
    leadTimeDays: "0",
    featured: false,
    sortOrder: "0",
    publishImmediately: true,
    images: [],
    pairsWith: [],
    seoTitle: "",
    seoDescription: "",
    seoOgImage: "",
    variants: [
      {
        label: "Standard",
        sku: makeSku("LIGERA", "STD", 0),
        skuEdited: false,
        price: "",
        salePrice: "",
        costPrice: "",
        initialStock: "10",
        currentStock: 0,
        available: 0,
        lowStockThreshold: "5",
        active: true,
      },
    ],
    removedVariantIds: [],
  };
}

function detailToForm(detail: AdminProductDetail): ProductFormState {
  return {
    name: detail.name,
    description: detail.description || "",
    categoryId: detail.categoryId || "",
    spaceTagIds: detail.spaceTagIds || [],
    scentTop: detail.scentNotes?.top || [],
    scentHeart: detail.scentNotes?.heart || [],
    scentBase: detail.scentNotes?.base || [],
    ingredients: detail.ingredients || "",
    safetyInfo: detail.safetyInfo || "",
    burnTime: detail.burnTime || "",
    dimensions: detail.dimensions || "",
    finish: detail.finish || "",
    madeToOrder: Boolean(detail.madeToOrder),
    leadTimeDays: String(detail.leadTimeDays || 0),
    featured: Boolean(detail.featured),
    sortOrder: String(detail.sortOrder || 0),
    publishImmediately: detail.status === "published",
    images: (detail.images || []).map((img, idx) => ({
      publicId: img.publicId,
      url: img.url || img.publicId,
      alt: img.alt || detail.name,
      width: img.width || 1200,
      height: img.height || 1200,
      position: img.position ?? idx,
    })),
    pairsWith: detail.pairsWith || [],
    seoTitle: detail.seo?.title || "",
    seoDescription: detail.seo?.metaDescription || "",
    seoOgImage: detail.seo?.ogImage || "",
    variants:
      detail.variants && detail.variants.length > 0
        ? detail.variants.map((v) => ({
            id: v.id,
            label: v.label || "Standard",
            sku: v.sku,
            skuEdited: true,
            price: String(v.price ?? 0),
            salePrice: v.salePrice != null ? String(v.salePrice) : "",
            costPrice: v.costPrice != null ? String(v.costPrice) : "",
            initialStock: "0",
            currentStock: v.stockQty || 0,
            available: v.available ?? 0,
            lowStockThreshold: String(v.lowStockThreshold ?? 5),
            active: v.active !== false,
          }))
        : createEmptyForm(detail.categoryId || "").variants,
    removedVariantIds: [],
  };
}

function ChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const addChips = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const merged = [...values];
    for (const part of parts) {
      if (!merged.includes(part) && merged.length < 6) {
        merged.push(part);
      }
    }
    onChange(merged);
    setInput("");
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-normal">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-destructive"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addChips(input);
            }
          }}
          onBlur={() => addChips(input)}
          placeholder={values.length >= 6 ? "Max 6 notes" : placeholder}
          disabled={values.length >= 6}
          className="min-w-[140px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

export function ProductEditorDialog({
  open,
  onOpenChange,
  productId,
  categories,
  allProducts,
  isOwner,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  categories: AdminCategory[];
  allProducts: AdminProductRow[];
  isOwner: boolean;
  onSaved: () => void;
}) {
  const mainCategories = useMemo(
    () => categories.filter((c) => c.type === "category" && c.active !== false),
    [categories],
  );
  const spaceTags = useMemo(
    () => categories.filter((c) => c.type === "space" && c.active !== false),
    [categories],
  );

  const [form, setForm] = useState<ProductFormState>(() =>
    createEmptyForm(mainCategories[0]?.id || ""),
  );
  const [loadedDetail, setLoadedDetail] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basics");

  useEffect(() => {
    if (!open) return;
    setActiveTab("basics");
    if (!productId) {
      setLoadedDetail(null);
      setForm(createEmptyForm(mainCategories[0]?.id || ""));
      return;
    }

    let cancelled = false;
    setLoading(true);
    adminApi
      .getProduct(productId)
      .then((detail) => {
        if (cancelled) return;
        setLoadedDetail(detail);
        setForm(detailToForm(detail));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not load product.");
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, productId, mainCategories, onOpenChange]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      variants: prev.variants.map((v, idx) =>
        !v.id && !v.skuEdited ? { ...v, sku: makeSku(name, v.label, idx) } : v,
      ),
    }));
  };

  const addVariantRow = () => {
    setForm((prev) => {
      const idx = prev.variants.length;
      return {
        ...prev,
        variants: [
          ...prev.variants,
          {
            label: `Option ${idx + 1}`,
            sku: makeSku(prev.name, `OPT${idx + 1}`, idx),
            skuEdited: false,
            price: prev.variants[0]?.price || "",
            salePrice: "",
            costPrice: "",
            initialStock: "0",
            currentStock: 0,
            available: 0,
            lowStockThreshold: "5",
            active: true,
          },
        ],
      };
    });
  };

  const removeVariantRow = (idx: number) => {
    setForm((prev) => {
      if (prev.variants.length <= 1) return prev;
      const target = prev.variants[idx];
      return {
        ...prev,
        variants: prev.variants.filter((_, i) => i !== idx),
        removedVariantIds: target.id
          ? [...prev.removedVariantIds, target.id]
          : prev.removedVariantIds,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setActiveTab("basics");
      toast.error("Product name is required.");
      return;
    }

    for (let i = 0; i < form.variants.length; i++) {
      const v = form.variants[i];
      if (!v.label.trim()) {
        setActiveTab("variants");
        toast.error(`Variant #${i + 1} needs a label.`);
        return;
      }
      if (!v.sku.trim()) {
        setActiveTab("variants");
        toast.error(`Variant "${v.label}" needs a SKU.`);
        return;
      }
      const priceNum = Number(v.price);
      if (v.price === "" || Number.isNaN(priceNum) || priceNum < 0) {
        setActiveTab("variants");
        toast.error(`Enter a valid price for "${v.label}".`);
        return;
      }
    }

    const safeName = form.name.trim();
    const imagesPayload = form.images.map((img, idx) => {
      const alt = img.alt?.trim();
      return {
        publicId: img.publicId,
        alt: alt && alt.length >= 3 ? alt : `${safeName} photo ${idx + 1}`,
        width: img.width || 1200,
        height: img.height || 1200,
        position: idx,
      };
    });

    const payload: AdminProductPayload = {
      name: safeName,
      description: form.description,
      categoryId: form.categoryId || null,
      spaceTagIds: form.spaceTagIds,
      scentNotes: {
        top: form.scentTop,
        heart: form.scentHeart,
        base: form.scentBase,
      },
      ingredients: form.ingredients,
      safetyInfo: form.safetyInfo,
      burnTime: form.burnTime,
      dimensions: form.dimensions,
      finish: form.finish,
      madeToOrder: form.madeToOrder,
      leadTimeDays: Math.max(0, Math.round(Number(form.leadTimeDays) || 0)),
      images: imagesPayload,
      pairsWith: form.pairsWith.slice(0, 4),
      seo: {
        title: form.seoTitle.slice(0, 70),
        metaDescription: form.seoDescription.slice(0, 160),
        ogImage: form.seoOgImage,
      },
      featured: form.featured,
      sortOrder: Math.max(0, Math.round(Number(form.sortOrder) || 0)),
      variants: form.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        label: v.label.trim(),
        sku: v.sku.trim().toUpperCase(),
        price: Math.round(Number(v.price)),
        salePrice: v.salePrice.trim() !== "" ? Math.round(Number(v.salePrice)) : null,
        lowStockThreshold: Math.max(0, Math.round(Number(v.lowStockThreshold) || 5)),
        costPrice: Math.max(0, Math.round(Number(v.costPrice) || 0)),
        active: v.active,
      })),
      ...(form.removedVariantIds.length > 0
        ? { removedVariantIds: form.removedVariantIds }
        : {}),
    };

    setSaving(true);
    try {
      let savedId = productId;
      if (productId) {
        await adminApi.updateProduct(productId, payload);
      } else {
        const created = await adminApi.createProduct(payload);
        savedId = created.id;
        if (form.publishImmediately) {
          await adminApi.updateProductStatus(created.id, "published");
        }
      }

      // Apply initial stock for newly created variants that specify > 0
      const pendingStockVariants = form.variants.filter(
        (v) => !v.id && Math.round(Number(v.initialStock) || 0) > 0,
      );
      if (savedId && pendingStockVariants.length > 0) {
        const refreshed = await adminApi.getProduct(savedId);
        for (const pv of pendingStockVariants) {
          const match = refreshed.variants.find(
            (rv) => rv.sku.toUpperCase() === pv.sku.trim().toUpperCase(),
          );
          const qty = Math.round(Number(pv.initialStock) || 0);
          if (match && qty > 0) {
            await adminApi.adjustStock(match.id, {
              change: qty,
              reason: "restock",
              note: "Initial stock",
            });
          }
        }
      }

      toast.success(productId ? "Product updated" : "Product created");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const slugPreview = loadedDetail?.slug || makeSlugPreview(form.name);
  const seoPreviewTitle = form.seoTitle.trim() || form.name.trim() || "Product Title";
  const seoPreviewDesc =
    form.seoDescription.trim() ||
    form.description.trim().slice(0, 155) ||
    "Hand-poured in small batches at our Gbagada, Lagos studio.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="font-display text-2xl">
                {productId ? "Edit product" : "New product"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {productId
                  ? `Managing ${loadedDetail?.name || "product"} · Status: ${loadedDetail?.status || "loading"}`
                  : "Upload photography, configure pricing & variants, fragrance pyramid, and SEO."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Loading product details…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 py-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basics" className="text-xs">
                  Basics &amp; Media
                </TabsTrigger>
                <TabsTrigger value="variants" className="text-xs">
                  Variants ({form.variants.length})
                </TabsTrigger>
                <TabsTrigger value="fragrance" className="text-xs">
                  Fragrance &amp; Craft
                </TabsTrigger>
                <TabsTrigger value="seo" className="text-xs">
                  SEO &amp; Pairings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="mt-4 space-y-5">
                <MediaUploader
                  mode="gallery"
                  value={form.images}
                  onChange={(images) => setForm((prev) => ({ ...prev, images }))}
                  defaultAlt={form.name || "Ligera product"}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="prod-name">Product name</Label>
                    <Input
                      id="prod-name"
                      required
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Amber Hush Candle"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      URL: <span className="font-mono">/products/{slugPreview}</span>
                    </p>
                    {loadedDetail?.status === "published" && (
                      <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        Published product slugs are immutable; keep the title or archive first to change URL.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="prod-desc">Editorial description</Label>
                    <Textarea
                      id="prod-desc"
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe scent character, atmosphere, vessel finish, and burn story…"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prod-cat">Category</Label>
                      <Link
                        href="/ligera/categories"
                        className="text-[11px] text-forest hover:underline"
                        onClick={() => onOpenChange(false)}
                      >
                        Manage categories →
                      </Link>
                    </div>
                    <select
                      id="prod-cat"
                      value={form.categoryId}
                      onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Uncategorized</option>
                      {mainCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prod-sort">Display sort order</Label>
                    <Input
                      id="prod-sort"
                      type="number"
                      min={0}
                      value={form.sortOrder}
                      onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    />
                  </div>
                </div>

                {spaceTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Recommended spaces (max 7)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {spaceTags.map((space) => {
                        const selected = form.spaceTagIds.includes(space.id);
                        return (
                          <button
                            key={space.id}
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const exists = prev.spaceTagIds.includes(space.id);
                                if (exists) {
                                  return {
                                    ...prev,
                                    spaceTagIds: prev.spaceTagIds.filter((id) => id !== space.id),
                                  };
                                }
                                if (prev.spaceTagIds.length >= 7) return prev;
                                return { ...prev, spaceTagIds: [...prev.spaceTagIds, space.id] };
                              })
                            }
                            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                              selected
                                ? "border-forest bg-forest text-forest-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-forest"
                            }`}
                          >
                            {space.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 rounded-lg border border-border bg-secondary/25 p-3.5 sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>Featured on storefront</span>
                    <Switch
                      checked={form.featured}
                      onCheckedChange={(v) => setForm((prev) => ({ ...prev, featured: v }))}
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>Made to order</span>
                    <Switch
                      checked={form.madeToOrder}
                      onCheckedChange={(v) => setForm((prev) => ({ ...prev, madeToOrder: v }))}
                    />
                  </label>

                  {form.madeToOrder && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="prod-lead">Lead time (days)</Label>
                      <Input
                        id="prod-lead"
                        type="number"
                        min={0}
                        max={120}
                        value={form.leadTimeDays}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, leadTimeDays: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {!productId && (
                    <label className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm sm:col-span-2">
                      <div>
                        <p className="font-medium">Publish immediately</p>
                        <p className="text-xs text-muted-foreground">
                          Turn off to save as a draft before making it live in Collections.
                        </p>
                      </div>
                      <Switch
                        checked={form.publishImmediately}
                        onCheckedChange={(v) =>
                          setForm((prev) => ({ ...prev, publishImmediately: v }))
                        }
                      />
                    </label>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="variants" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Configure sizes, vessels, or editions. Every product needs at least one variant.
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={addVariantRow}>
                    <Plus className="h-3.5 w-3.5" />
                    Add variant
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.variants.map((v, idx) => {
                    const priceNum = Number(v.price) || 0;
                    const saleNum = v.salePrice ? Number(v.salePrice) : null;
                    const costNum = v.costPrice ? Number(v.costPrice) : 0;
                    const effectivePrice = saleNum != null && saleNum > 0 ? saleNum : priceNum;
                    const discountPct =
                      saleNum != null && priceNum > 0 && saleNum < priceNum
                        ? Math.round(((priceNum - saleNum) / priceNum) * 100)
                        : null;
                    const marginPct =
                      effectivePrice > 0 && costNum > 0
                        ? Math.round(((effectivePrice - costNum) / effectivePrice) * 100)
                        : null;

                    return (
                      <div
                        key={v.id || `new-${idx}`}
                        className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold tracking-wider text-forest uppercase">
                            Variant #{idx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs">
                              <Switch
                                checked={v.active}
                                onCheckedChange={(checked) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    variants: prev.variants.map((row, i) =>
                                      i === idx ? { ...row, active: checked } : row,
                                    ),
                                  }))
                                }
                              />
                              Active
                            </label>
                            {form.variants.length > 1 && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeVariantRow(idx)}
                                aria-label="Remove variant"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Size / Label</Label>
                            <Input
                              required
                              value={v.label}
                              placeholder="e.g. 180g Amber Jar"
                              onChange={(e) => {
                                const label = e.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((row, i) =>
                                    i === idx
                                      ? {
                                          ...row,
                                          label,
                                          sku:
                                            !row.id && !row.skuEdited
                                              ? makeSku(prev.name, label, i)
                                              : row.sku,
                                        }
                                      : row,
                                  ),
                                }));
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">SKU</Label>
                            <Input
                              required
                              value={v.sku}
                              className="font-mono text-xs uppercase"
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((row, i) =>
                                    i === idx
                                      ? { ...row, sku: e.target.value.toUpperCase(), skuEdited: true }
                                      : row,
                                  ),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Low-stock alert at</Label>
                            <Input
                              type="number"
                              min={0}
                              value={v.lowStockThreshold}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((row, i) =>
                                    i === idx ? { ...row, lowStockThreshold: e.target.value } : row,
                                  ),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Price (₦)</Label>
                            <Input
                              type="number"
                              min={0}
                              required
                              value={v.price}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((row, i) =>
                                    i === idx ? { ...row, price: e.target.value } : row,
                                  ),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Sale price (₦)</Label>
                              {discountPct !== null && (
                                <span className="text-[10px] font-medium text-emerald-700">
                                  -{discountPct}%
                                </span>
                              )}
                            </div>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Optional"
                              value={v.salePrice}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((row, i) =>
                                    i === idx ? { ...row, salePrice: e.target.value } : row,
                                  ),
                                }))
                              }
                            />
                          </div>

                          {isOwner && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Cost price (₦)</Label>
                                {marginPct !== null && (
                                  <span className="text-[10px] font-medium text-forest">
                                    {marginPct}% margin
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                min={0}
                                value={v.costPrice}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    variants: prev.variants.map((row, i) =>
                                      i === idx ? { ...row, costPrice: e.target.value } : row,
                                    ),
                                  }))
                                }
                              />
                            </div>
                          )}

                          {!v.id ? (
                            <div className="space-y-1 sm:col-span-3">
                              <Label className="text-xs">Initial opening stock</Label>
                              <Input
                                type="number"
                                min={0}
                                value={v.initialStock}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    variants: prev.variants.map((row, i) =>
                                      i === idx ? { ...row, initialStock: e.target.value } : row,
                                    ),
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs sm:col-span-3">
                              <span>
                                Available stock: <strong>{v.available}</strong> (On hand:{" "}
                                {v.currentStock})
                              </span>
                              <span className="text-muted-foreground">
                                Adjust via Stock popover on Products table
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="fragrance" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ChipInput
                    label="Top notes"
                    values={form.scentTop}
                    onChange={(scentTop) => setForm((prev) => ({ ...prev, scentTop }))}
                    placeholder="Bergamot, Fig…"
                  />
                  <ChipInput
                    label="Heart notes"
                    values={form.scentHeart}
                    onChange={(scentHeart) => setForm((prev) => ({ ...prev, scentHeart }))}
                    placeholder="Jasmine, Saffron…"
                  />
                  <ChipInput
                    label="Base notes"
                    values={form.scentBase}
                    onChange={(scentBase) => setForm((prev) => ({ ...prev, scentBase }))}
                    placeholder="Amber, Cedar…"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-burn">Burn / scent time</Label>
                    <Input
                      id="prod-burn"
                      value={form.burnTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, burnTime: e.target.value }))}
                      placeholder="e.g. 40–45 hours"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-dim">Dimensions / weight</Label>
                    <Input
                      id="prod-dim"
                      value={form.dimensions}
                      onChange={(e) => setForm((prev) => ({ ...prev, dimensions: e.target.value }))}
                      placeholder="e.g. 8cm × 9.5cm · 200g"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-finish">Vessel / finish</Label>
                    <Input
                      id="prod-finish"
                      value={form.finish}
                      onChange={(e) => setForm((prev) => ({ ...prev, finish: e.target.value }))}
                      placeholder="e.g. Matte amber glass"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-ingredients">Ingredients &amp; materials</Label>
                  <Textarea
                    id="prod-ingredients"
                    rows={3}
                    value={form.ingredients}
                    onChange={(e) => setForm((prev) => ({ ...prev, ingredients: e.target.value }))}
                    placeholder="Soy & beeswax blend, phthalate-free botanical fragrance oils, braided cotton wick…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-safety">Safety &amp; care instructions</Label>
                  <Textarea
                    id="prod-safety"
                    rows={3}
                    value={form.safetyInfo}
                    onChange={(e) => setForm((prev) => ({ ...prev, safetyInfo: e.target.value }))}
                    placeholder="Trim wick to 5mm before each burn. Never leave unattended…"
                  />
                </div>
              </TabsContent>

              <TabsContent value="seo" className="mt-4 space-y-5">
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Search snippet preview
                  </p>
                  <p className="mt-1.5 text-sm text-forest">
                    https://ligerascents.com › products › {slugPreview}
                  </p>
                  <p className="mt-0.5 font-medium text-blue-800">{seoPreviewTitle} | Ligera</p>
                  <p className="mt-1 text-xs text-muted-foreground">{seoPreviewDesc}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prod-seo-title">SEO title</Label>
                    <span className="text-[11px] text-muted-foreground">
                      {form.seoTitle.length}/70
                    </span>
                  </div>
                  <Input
                    id="prod-seo-title"
                    maxLength={70}
                    value={form.seoTitle}
                    onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="Optional custom search title"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prod-seo-desc">Meta description</Label>
                    <span className="text-[11px] text-muted-foreground">
                      {form.seoDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    id="prod-seo-desc"
                    rows={3}
                    maxLength={160}
                    value={form.seoDescription}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, seoDescription: e.target.value }))
                    }
                    placeholder="Optional search snippet summary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-og-img">Social share (OG) image URL</Label>
                  <Input
                    id="prod-og-img"
                    value={form.seoOgImage}
                    onChange={(e) => setForm((prev) => ({ ...prev, seoOgImage: e.target.value }))}
                    placeholder="Defaults to primary product image"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Pairs well with ({form.pairsWith.length}/4)</Label>
                  <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
                    {allProducts
                      .filter((p) => p.id !== productId)
                      .map((p) => {
                        const checked = form.pairsWith.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setForm((prev) => {
                                  if (checked) {
                                    return {
                                      ...prev,
                                      pairsWith: prev.pairsWith.filter((id) => id !== p.id),
                                    };
                                  }
                                  if (prev.pairsWith.length >= 4) {
                                    toast.error("Select up to 4 pairings.");
                                    return prev;
                                  }
                                  return { ...prev, pairsWith: [...prev.pairsWith, p.id] };
                                });
                              }}
                            />
                            <span className="truncate">{p.name}</span>
                            {p.variants[0] && (
                              <span className="ml-auto text-muted-foreground">
                                {naira(p.variants[0].price)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/20 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-forest text-forest-foreground hover:bg-forest/90"
              >
                {saving ? "Saving…" : productId ? "Save changes" : "Create product"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
