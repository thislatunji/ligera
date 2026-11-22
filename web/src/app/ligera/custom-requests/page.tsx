"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MessageCircle, Search, Sparkles } from "lucide-react";
import { adminApi, type AdminCustomRequestSummary } from "@/lib/admin/client";
import { naira } from "@/lib/products";
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

const STATUSES = ["all", "new", "quoted", "accepted", "declined", "completed"] as const;

export default function LigeraCustomRequestsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [deliveryIncluded, setDeliveryIncluded] = useState(true);
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = new URLSearchParams(window.location.search).get("status");
    if (s && STATUSES.includes(s as any)) {
      setStatusFilter(s);
    }
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["ligera-custom-requests", statusFilter, search],
    queryFn: () =>
      adminApi.listCustomRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: search.trim() || undefined,
      }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["ligera-custom-request-detail", selectedId],
    queryFn: () => adminApi.getCustomRequest(selectedId!),
    enabled: Boolean(selectedId),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ligera-custom-requests"] });
    qc.invalidateQueries({ queryKey: ["ligera-custom-request-detail"] });
    qc.invalidateQueries({ queryKey: ["ligera-dashboard"] });
    qc.invalidateQueries({ queryKey: ["ligera-admin-nav-badges"] });
  };

  const quoteMutation = useMutation({
    mutationFn: () =>
      adminApi.quoteCustomRequest(selectedId!, {
        amount: Math.round(Number(quoteAmount)),
        note: quoteNote.trim() || undefined,
        deliveryIncluded,
      }),
    onSuccess: () => {
      toast.success("Quote & payment link sent to customer");
      setQuoteAmount("");
      setQuoteNote("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      adminApi.updateCustomRequestStatus(selectedId!, {
        status,
        note: statusNote.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Request status updated");
      setStatusNote("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openInspector = (row: AdminCustomRequestSummary) => {
    setSelectedId(row.id);
    setQuoteAmount(row.quoteAmount ? String(row.quoteAmount) : "");
    setQuoteNote("");
  };

  const waHref = (phone: string, reqNumber: string) => {
    const digits = phone.replace(/\D/g, "").replace(/^0/, "234");
    return `https://wa.me/${digits}?text=${encodeURIComponent(
      `Hello from Ligera! Following up on your bespoke request ${reqNumber}.`,
    )}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Bespoke Studio</p>
        <h1 className="mt-1 font-display text-3xl text-forest">
          Custom Orders ({requests.length})
        </h1>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by request number, customer name, or email…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "border-forest bg-forest text-forest-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-forest hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="text-xs">Request</TableHead>
              <TableHead className="text-xs">Client</TableHead>
              <TableHead className="hidden md:table-cell text-xs">Types &amp; Qty</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-right text-xs">Quote</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  Loading bespoke requests…
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No custom requests found</p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => openInspector(r)}
                  className="cursor-pointer hover:bg-secondary/30"
                >
                  <TableCell>
                    <p className="font-mono text-sm font-semibold text-forest">
                      {r.requestNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.spaceOrSetting}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{r.contact.name}</p>
                    <p className="text-xs text-muted-foreground">{r.contact.email}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs capitalize">
                    {r.productTypes.join(", ")} · {r.quantity} units
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px] capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {r.quoteAmount ? naira(r.quoteAmount) : r.budgetRange || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Inspector & Quote Modal */}
      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {detail?.requestNumber || "Bespoke Request"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submitted{" "}
              {detail?.createdAt ? new Date(detail.createdAt).toLocaleString("en-NG") : "…"}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading brief…</p>
          ) : (
            <div className="space-y-5 text-sm">
              <div className="grid gap-3 rounded-lg border border-border bg-secondary/25 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">{detail.contact.name}</p>
                  <p className="text-xs text-muted-foreground">{detail.contact.email}</p>
                  <p className="text-xs text-muted-foreground">{detail.contact.phone}</p>
                </div>
                <div className="flex flex-col items-start justify-between gap-2 sm:items-end">
                  <Badge className="capitalize">{detail.status}</Badge>
                  <a
                    href={waHref(detail.contact.phone, detail.requestNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs">
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
                      Chat on WhatsApp
                    </Button>
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Space / Occasion</p>
                  <p className="font-medium">{detail.spaceOrSetting}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Product Families &amp; Quantity</p>
                  <p className="font-medium capitalize">
                    {detail.productTypes.join(", ")} · {detail.quantity} units
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget Range</p>
                  <p className="font-medium">{detail.budgetRange || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Event Date</p>
                  <p className="font-medium">
                    {detail.eventDate
                      ? new Date(detail.eventDate).toLocaleDateString("en-NG")
                      : "Flexible"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Scent &amp; Styling Preferences</p>
                <p className="mt-1 rounded-md border border-border bg-card p-3 text-sm">
                  {detail.scentPreferences}
                </p>
              </div>

              {detail.referenceImage?.url && (
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Reference Image</p>
                  <img
                    src={detail.referenceImage.url}
                    alt={detail.referenceImage.alt || "Reference"}
                    className="max-h-56 rounded-lg border border-border object-contain"
                  />
                </div>
              )}

              {detail.paymentLink?.linkUrl && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs">
                  <p className="font-semibold text-emerald-900">
                    Quote active: {naira(detail.paymentLink.amount)} ({detail.paymentLink.status})
                  </p>
                  <a
                    href={detail.paymentLink.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-emerald-700 underline"
                  >
                    Open Flutterwave payment link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Quote form */}
              {(detail.status === "new" || detail.status === "quoted") && (
                <form
                  className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amt = Math.round(Number(quoteAmount));
                    if (!amt || amt < 1000) {
                      toast.error("Quote amount must be at least ₦1,000.");
                      return;
                    }
                    quoteMutation.mutate();
                  }}
                >
                  <p className="text-xs font-semibold tracking-wider text-forest uppercase">
                    Send Quote &amp; Payment Link
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quote amount (₦)</Label>
                      <Input
                        type="number"
                        min={1000}
                        required
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder="e.g. 85000"
                      />
                    </div>
                    <label className="flex items-center justify-between pt-5 text-xs">
                      <span>Delivery included</span>
                      <Switch checked={deliveryIncluded} onCheckedChange={setDeliveryIncluded} />
                    </label>
                  </div>
                  <Textarea
                    rows={2}
                    value={quoteNote}
                    onChange={(e) => setQuoteNote(e.target.value)}
                    placeholder="Lead time, vessel breakdown, or bespoke notes included in quote email…"
                    className="text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={quoteMutation.isPending}
                    className="bg-forest text-forest-foreground hover:bg-forest/90"
                  >
                    {quoteMutation.isPending ? "Generating link…" : "Send quote email"}
                  </Button>
                </form>
              )}

              {/* Status transitions */}
              <div className="space-y-2 border-t border-border pt-4">
                <Label className="text-xs">Update status</Label>
                <div className="flex flex-wrap gap-2">
                  {(["accepted", "completed", "declined"] as const).map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      type="button"
                      size="sm"
                      variant={detail.status === nextStatus ? "default" : "outline"}
                      disabled={statusMutation.isPending || detail.status === nextStatus}
                      onClick={() => statusMutation.mutate(nextStatus)}
                      className="text-xs capitalize"
                    >
                      Mark {nextStatus}
                    </Button>
                  ))}
                </div>
              </div>

              {detail.notes.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Activity notes</p>
                  {detail.notes.map((n, idx) => (
                    <div key={idx} className="rounded-md bg-secondary/40 px-3 py-2 text-xs">
                      <p className="font-medium">
                        {n.userName} ·{" "}
                        <span className="text-muted-foreground">
                          {new Date(n.at).toLocaleString("en-NG")}
                        </span>
                      </p>
                      <p className="mt-0.5">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
