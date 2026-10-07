import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { adminListProducts, deleteProduct, saveProduct, setStock, useServerFn } from "@/lib/admin.functions";
import { naira, productCategories } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/")({ component: ProductsAdmin });

type Row = Awaited<ReturnType<typeof adminListProducts>>[number];
type Draft = { id?: string; name: string; notes: string; category: string; price: number; stock: number; lowStockThreshold: number; active: boolean; sortOrder: number };
const empty: Draft = { name: "", notes: "", category: "Candles", price: 0, stock: 0, lowStockThreshold: 5, active: true, sortOrder: 0 };

function ProductsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListProducts);
  const save = useServerFn(saveProduct);
  const del = useServerFn(deleteProduct);
  const stockFn = useServerFn(setStock);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => list() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
  const saveM = useMutation({
    mutationFn: (d: Draft) => save({ data: d }),
    onSuccess: () => { setDraft(null); refresh(); },
    onError: (e: Error) => setErr(e.message),
  });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: refresh });
  const stockM = useMutation({
    mutationFn: (v: { id: string; stock: number; lowStockThreshold?: number }) => stockFn({ data: v }),
    onSuccess: refresh,
  });

  const low = data.filter((p) => p.stock <= p.low_stock_threshold);
  const edit = (p: Row) =>
    setDraft({ id: p.id, name: p.name, notes: p.notes, category: p.category, price: p.price, stock: p.stock, lowStockThreshold: p.low_stock_threshold, active: p.active, sortOrder: p.sort_order });

  return (
    <div className="space-y-8">
      {low.length > 0 && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Low-stock alerts ({low.length})</p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {low.map((p) => (
              <li key={p.id}>{p.name} — <strong>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</strong> (alert at {p.low_stock_threshold})</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Products & inventory</h2>
        <Button onClick={() => { setErr(null); setDraft({ ...empty }); }}><Plus className="h-4 w-4" /> New product</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs tracking-wider uppercase">
              <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Alert at</th><th className="p-3">Live</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {data.map((p) => {
                const isLow = p.stock <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3">{naira(p.price)}</td>
                    <td className="p-3">
                      <Input type="number" min={0} defaultValue={p.stock} key={`s${p.stock}`} className={`h-8 w-20 ${isLow ? "border-destructive" : ""}`}
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== p.stock && v >= 0) stockM.mutate({ id: p.id, stock: v }); }} />
                    </td>
                    <td className="p-3">
                      <Input type="number" min={0} defaultValue={p.low_stock_threshold} key={`t${p.low_stock_threshold}`} className="h-8 w-16"
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== p.low_stock_threshold && v >= 0) stockM.mutate({ id: p.id, stock: p.stock, lowStockThreshold: v }); }} />
                    </td>
                    <td className="p-3">{p.active ? "Yes" : "Hidden"}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => { setErr(null); edit(p); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => { if (confirm(`Delete ${p.name}?`)) delM.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {draft && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveM.mutate(draft); }}>
              <div className="space-y-1.5"><Label>Name</Label><Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Category</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                    {productCategories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Price (₦)</Label><Input type="number" min={0} required value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Stock</Label><Input type="number" min={0} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Low-stock alert at</Label><Input type="number" min={0} value={draft.lowStockThreshold} onChange={(e) => setDraft({ ...draft, lowStockThreshold: Number(e.target.value) })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> Show on site</label>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={saveM.isPending}>{saveM.isPending ? "Saving…" : "Save product"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
