"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  Copy,
  Download,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { adminApi, type AdminProductRow } from "@/lib/admin/client";
import { naira } from "@/lib/products";
import { useLigeraAdmin } from "@/components/ligera-admin/LigeraAdminContext";
import { ProductEditorDialog } from "@/components/ligera-admin/ProductEditorDialog";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type StockPopoverProps = {
  product: AdminProductRow;
  onAdjusted: () => void;
};

function StockAdjustPopover({ product, onAdjusted }: StockPopoverProps) {
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState(product.variants[0]?.id || "");
  const [change, setChange] = useState("5");
  const [reason, setReason] = useState<"restock" | "correction" | "damaged" | "sample">("restock");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const totalAvail = product.variants.reduce((sum, v) => sum + Math.max(0, v.available || 0), 0);
  const selectedVariant = product.variants.find((v) => v.id === variantId) || product.variants[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;
    const delta = Math.round(Number(change));
    if (!delta || Number.isNaN(delta)) {
      toast.error("Enter a non-zero quantity adjustment.");
      return;
    }
    setBusy(true);
    try {
      await adminApi.adjustStock(selectedVariant.id, {
        change: delta,
        reason,
        note: note.trim() || undefined,
      });
      toast.success("Stock adjusted");
      setOpen(false);
      onAdjusted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not adjust stock.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs transition-colors hover:border-gold"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              totalAvail === 0
                ? "bg-destructive"
                : product.lowStock
                  ? "bg-amber-500"
                  : "bg-emerald-600"
            }`}
          />
          <span className="font-medium">{totalAvail}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <p className="text-xs font-semibold">Adjust stock · {product.name}</p>
            {selectedVariant && (
              <p className="text-[11px] text-muted-foreground">
                Current available: {selectedVariant.available} (On hand:{" "}
                {selectedVariant.stockQty})
              </p>
            )}
          </div>

          {product.variants.length > 1 && (
            <div className="space-y-1">
              <Label className="text-[11px]">Variant</Label>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.available} avail)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Change (+/-)</Label>
              <Input
                type="number"
                value={change}
                onChange={(e) => setChange(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Reason</Label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="restock">Restock</option>
                <option value="correction">Correction</option>
                <option value="damaged">Damaged</option>
                <option value="sample">Sample</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Batch or reason"
              className="h-8 text-xs"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={busy}
            className="w-full bg-forest text-xs text-forest-foreground hover:bg-forest/90"
          >
            {busy ? "Updating…" : "Apply adjustment"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default function LigeraProductsPage() {
  const qc = useQueryClient();
  const { isOwner } = useLigeraAdmin();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    failures: { row: number; error: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new") === "1" && isOwner) {
      setEditingId(null);
      setEditorOpen(true);
    }
    if (sp.get("lowStock") === "true") {
      setLowStockOnly(true);
    }
  }, [isOwner]);

  const { data: categories = [] } = useQuery({
    queryKey: ["ligera-categories"],
    queryFn: () => adminApi.listCategories(),
  });

  const { data: productsRes, isLoading } = useQuery({
    queryKey: ["ligera-products", search, statusFilter, categoryFilter, lowStockOnly, page],
    queryFn: () =>
      adminApi.listProducts({
        q: search.trim() || undefined,
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        lowStock: lowStockOnly || undefined,
        page,
        limit: 25,
      }),
  });

  const products = productsRes?.data || [];
  const meta = productsRes?.meta;

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["ligera-products"] });
    qc.invalidateQueries({ queryKey: ["ligera-dashboard"] });
    qc.invalidateQueries({ queryKey: ["ligera-admin-nav-badges"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "published" | "archived" }) =>
      adminApi.updateProductStatus(id, status),
    onSuccess: (_, vars) => {
      toast.success(`Product marked ${vars.status}`);
      refreshAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => adminApi.duplicateProduct(id),
    onSuccess: (res) => {
      toast.success("Product duplicated as draft");
      refreshAll();
      setEditingId(res.id);
      setEditorOpen(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteTarget(null);
      refreshAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mainCategories = useMemo(
    () => categories.filter((c) => c.type === "category"),
    [categories],
  );

  const stats = useMemo(() => {
    const published = products.filter((p) => p.status === "published").length;
    const draft = products.filter((p) => p.status === "draft").length;
    const low = products.filter((p) => p.lowStock).length;
    return {
      total: meta?.total ?? products.length,
      published,
      draft,
      low,
    };
  }, [products, meta]);

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await adminApi.importProductsCsv(file);
      setImportResult(res);
      toast.success(`Imported: ${res.created} created, ${res.updated} updated`);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const downloadSampleCsv = () => {
    const csv = [
      "product_name,product_slug,category,status,sku,variant_label,price,sale_price,stock_qty,low_stock_threshold",
      '"Amber Hush Candle","amber-hush-candle","Scented Candles","published","AMB-180G","180g Jar",18500,,15,5',
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ligera-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Catalog &amp; Inventory</p>
          <h1 className="mt-1 font-display text-3xl text-forest">
            Products ({meta?.total ?? products.length})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportResult(null);
                  setImportOpen(true);
                }}
              >
                <Upload className="h-3.5 w-3.5" />
                Import CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/admin/products/export.csv", "_blank")}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setEditorOpen(true);
                }}
                className="bg-forest text-forest-foreground hover:bg-forest/90"
              >
                <Plus className="h-4 w-4" />
                New product
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Catalog Total</p>
            <p className="mt-1 font-display text-2xl text-forest">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Published (page)</p>
            <p className="mt-1 font-display text-2xl text-emerald-700">{stats.published}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Drafts (page)</p>
            <p className="mt-1 font-display text-2xl text-amber-700">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Low Stock (page)</p>
            <p className="mt-1 font-display text-2xl text-destructive">{stats.low}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products by name…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
            {[
              { val: "", label: "All" },
              { val: "published", label: "Published" },
              { val: "draft", label: "Draft" },
              { val: "archived", label: "Archived" },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setStatusFilter(s.val);
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s.val
                    ? "bg-forest text-forest-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
          >
            <option value="">All categories</option>
            {mainCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Button
            type="button"
            size="sm"
            variant={lowStockOnly ? "default" : "outline"}
            onClick={() => {
              setLowStockOnly((v) => !v);
              setPage(1);
            }}
            className={`h-8 text-xs ${lowStockOnly ? "bg-amber-600 text-white hover:bg-amber-700" : ""}`}
          >
            Low stock
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Price</TableHead>
                <TableHead className="text-xs">Variants</TableHead>
                <TableHead className="text-xs">Stock</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Loading products…
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No products match this filter</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adjust filters or upload a new fragrance piece to your catalog.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const prices = p.variants.map((v) =>
                    v.salePrice != null ? v.salePrice : v.price,
                  );
                  const minP = prices.length ? Math.min(...prices) : 0;
                  const maxP = prices.length ? Math.max(...prices) : 0;

                  return (
                    <TableRow key={p.id} className="hover:bg-secondary/25">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40">
                            {p.imageThumb ? (
                              <img
                                src={p.imageThumb}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-sm">{p.name}</span>
                              {p.featured && (
                                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                              )}
                            </div>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              /{p.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {p.category?.name ? (
                          <Badge variant="outline" className="font-normal">
                            {p.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm font-medium">
                        {minP === maxP ? naira(minP) : `${naira(minP)} – ${naira(maxP)}`}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {p.variants.length} option{p.variants.length === 1 ? "" : "s"}
                      </TableCell>

                      <TableCell>
                        <StockAdjustPopover product={p} onAdjusted={refreshAll} />
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            p.status === "published"
                              ? "default"
                              : p.status === "draft"
                                ? "secondary"
                                : "outline"
                          }
                          className={`text-[11px] capitalize ${
                            p.status === "published"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : ""
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {isOwner && p.status === "draft" && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Publish"
                              className="h-8 w-8 text-emerald-700"
                              onClick={() =>
                                statusMutation.mutate({ id: p.id, status: "published" })
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && p.status === "published" && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Archive"
                              className="h-8 w-8 text-amber-700"
                              onClick={() =>
                                statusMutation.mutate({ id: p.id, status: "archived" })
                              }
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && p.status === "archived" && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Restore to draft"
                              className="h-8 w-8"
                              onClick={() => statusMutation.mutate({ id: p.id, status: "draft" })}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title="Edit product"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingId(p.id);
                                  setEditorOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title="Duplicate product"
                                className="h-8 w-8"
                                onClick={() => duplicateMutation.mutate(p.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title="Delete product"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteTarget(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {meta && (meta.pages || 1) > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {meta.pages} · {meta.total} products
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= (meta.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Full 4-tab Product Editor */}
      <ProductEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        productId={editingId}
        categories={categories}
        allProducts={products}
        isOwner={isOwner}
        onSaved={refreshAll}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === "published"
                ? "Published products must be archived first before they can be permanently deleted."
                : "This permanently removes the product and its variants from the studio catalog."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleteTarget?.status === "published" ? (
              <AlertDialogAction
                onClick={() => {
                  if (deleteTarget) {
                    statusMutation.mutate({ id: deleteTarget.id, status: "archived" });
                    setDeleteTarget(null);
                  }
                }}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Archive instead
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Import products CSV</DialogTitle>
            <DialogDescription className="text-xs">
              Upload a CSV matching Ligera’s export format (up to 2,000 rows, max 5MB).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button type="button" variant="outline" size="sm" onClick={downloadSampleCsv}>
              <Download className="h-3.5 w-3.5" />
              Download sample CSV
            </Button>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/20 px-4 py-6 text-center hover:border-gold">
              <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium">
                {importing ? "Importing…" : "Choose CSV file to upload"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importing}
                onChange={handleImportCsv}
              />
            </label>

            {importResult && (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/25 p-3 text-xs">
                <p className="font-medium">
                  Created: {importResult.created} · Updated: {importResult.updated} · Failed:{" "}
                  {importResult.failed}
                </p>
                {importResult.failures.length > 0 && (
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-destructive">
                    {importResult.failures.map((f, idx) => (
                      <li key={idx}>
                        Row {f.row}: {f.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
