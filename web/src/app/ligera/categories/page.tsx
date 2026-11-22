"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Sparkles, Tag, Trash2 } from "lucide-react";
import { adminApi, type AdminCategory } from "@/lib/admin/client";
import { MediaUploader } from "@/components/ligera-admin/MediaUploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type CategoryDraft = {
  id?: string;
  name: string;
  type: "category" | "space" | "collection";
  description: string;
  image: { publicId: string; alt: string } | null;
  active: boolean;
  sortOrder: string;
};

const EMPTY_DRAFT: CategoryDraft = {
  name: "",
  type: "category",
  description: "",
  image: null,
  active: true,
  sortOrder: "0",
};

const DEFAULT_FAMILIES = [
  {
    name: "Scented Candles",
    type: "category" as const,
    description: "Hand-poured soy & beeswax candles crafted in small batches in Lagos.",
    sortOrder: 1,
  },
  {
    name: "Reed Diffusers",
    type: "category" as const,
    description: "Long-lasting, flameless home fragrance oils with natural reeds.",
    sortOrder: 2,
  },
  {
    name: "Room & Linen Sprays",
    type: "category" as const,
    description: "Fine botanical mists for bedrooms, curtains, and living spaces.",
    sortOrder: 3,
  },
  {
    name: "Gypsum Decor",
    type: "category" as const,
    description: "Hand-cast and sealed mineral gypsum trays, vessels, and vases.",
    sortOrder: 4,
  },
];

export default function LigeraCategoriesPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"all" | "category" | "space" | "collection">("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setDraft({ ...EMPTY_DRAFT });
      setDialogOpen(true);
    }
  }, []);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["ligera-categories"],
    queryFn: () => adminApi.listCategories(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ligera-categories"] });
    qc.invalidateQueries({ queryKey: ["public-categories"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (d: CategoryDraft) => {
      const payload = {
        name: d.name.trim(),
        type: d.type,
        description: d.description.trim(),
        image: d.image ? { publicId: d.image.publicId, alt: d.image.alt || d.name.trim() } : null,
        active: d.active,
        sortOrder: Math.round(Number(d.sortOrder) || 0),
      };
      if (d.id) {
        return adminApi.updateCategory(d.id, payload);
      }
      return adminApi.createCategory(payload);
    },
    onSuccess: () => {
      toast.success(draft.id ? "Category updated" : "Category created");
      setDialogOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (cat: AdminCategory) =>
      adminApi.updateCategory(cat.id, { active: !cat.active }),
    onSuccess: () => {
      toast.success("Visibility updated");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      setDeleteTarget(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .filter((c) => (typeFilter === "all" ? true : c.type === typeFilter))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q),
      );
  }, [categories, typeFilter, search]);

  const seedDefaults = async () => {
    setSeedingDefaults(true);
    try {
      for (const fam of DEFAULT_FAMILIES) {
        await adminApi
          .createCategory({ ...fam, active: true })
          .catch(() => null);
      }
      toast.success("Default Ligera categories seeded");
      refresh();
    } finally {
      setSeedingDefaults(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Taxonomy &amp; Collections</p>
          <h1 className="mt-1 font-display text-3xl text-forest">
            Categories &amp; Spaces ({categories.length})
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.filter((c) => c.type === "category").length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={seedingDefaults}
              onClick={seedDefaults}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {seedingDefaults ? "Seeding…" : "Seed Default Families"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setDraft({ ...EMPTY_DRAFT });
              setDialogOpen(true);
            }}
            className="bg-forest text-forest-foreground hover:bg-forest/90"
          >
            <Plus className="h-4 w-4" />
            New category
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories or slugs…"
            className="pl-9"
          />
        </div>

        <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "category", label: "Categories" },
              { key: "space", label: "Spaces" },
              { key: "collection", label: "Collections" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTypeFilter(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t.key
                  ? "bg-forest text-forest-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="hidden md:table-cell text-xs">Slug</TableHead>
              <TableHead className="text-xs">Products</TableHead>
              <TableHead className="text-xs">Sort</TableHead>
              <TableHead className="text-xs">Active</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Loading categories…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Tag className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No categories found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Create a product family, room space tag, or curated collection.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cat) => (
                <TableRow key={cat.id} className="hover:bg-secondary/25">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40">
                        {cat.image?.publicId ? (
                          <img
                            src={cat.image.publicId}
                            alt={cat.image.alt || cat.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            <Tag className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{cat.name}</p>
                        {cat.description && (
                          <p className="max-w-xs truncate text-xs text-muted-foreground">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px] capitalize">
                      {cat.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {cat.slug}
                  </TableCell>
                  <TableCell className="text-sm">{cat.productCount ?? 0}</TableCell>
                  <TableCell className="text-sm">{cat.sortOrder}</TableCell>
                  <TableCell>
                    <Switch
                      checked={cat.active !== false}
                      onCheckedChange={() => toggleActiveMutation.mutate(cat)}
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setDraft({
                          id: cat.id,
                          name: cat.name,
                          type: cat.type,
                          description: cat.description || "",
                          image: cat.image?.publicId
                            ? { publicId: cat.image.publicId, alt: cat.image.alt || cat.name }
                            : null,
                          active: cat.active !== false,
                          sortOrder: String(cat.sortOrder || 0),
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTarget(cat)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {draft.id ? "Edit category" : "New category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Categories organize your storefront collections and space filters.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.name.trim()) {
                toast.error("Name is required.");
                return;
              }
              saveMutation.mutate(draft);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Scented Candles"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-type">Type</Label>
                <select
                  id="cat-type"
                  value={draft.type}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, type: e.target.value as any }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="category">Product Category</option>
                  <option value="space">Room / Space Tag</option>
                  <option value="collection">Curated Collection</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-sort">Sort order</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Shown on collection header and metadata…"
              />
            </div>

            <MediaUploader
              mode="single"
              label="Category cover image"
              value={draft.image}
              onChange={(image) => setDraft((prev) => ({ ...prev, image }))}
              defaultAlt={draft.name || "Category image"}
            />

            <label className="flex items-center justify-between rounded-lg border border-border bg-secondary/25 p-3 text-sm">
              <span>Active on storefront</span>
              <Switch
                checked={draft.active}
                onCheckedChange={(active) => setDraft((prev) => ({ ...prev, active }))}
              />
            </label>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-forest text-forest-foreground hover:bg-forest/90"
              >
                {saveMutation.isPending ? "Saving…" : "Save category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Categories assigned to existing products cannot be deleted until reassigned or
              deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
