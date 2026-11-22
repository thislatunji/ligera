"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Gift, Search, ShoppingCart } from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import { naira } from "@/lib/products";
import { useLigeraAdmin } from "@/components/ligera-admin/LigeraAdminContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TabFilter =
  | "all"
  | "actionable"
  | "processing"
  | "transit"
  | "delivered"
  | "failed_abandoned"
  | "cancelled";

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All Orders" },
  { key: "actionable", label: "Needs Action" },
  { key: "processing", label: "Processing" },
  { key: "transit", label: "Ready / Out" },
  { key: "delivered", label: "Delivered" },
  { key: "failed_abandoned", label: "Failed & Abandoned" },
  { key: "cancelled", label: "Cancelled" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "processing":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "ready_for_pickup":
    case "out_for_delivery":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "delivered":
      return "bg-forest text-forest-foreground border-forest";
    case "cancelled":
    case "refunded":
    case "abandoned":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-secondary text-foreground border-border";
  }
}

export default function LigeraOrdersPage() {
  const { isOwner } = useLigeraAdmin();
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const view = sp.get("view");
    if (view === "actionable") setTab("actionable");
    if (view === "failed_abandoned") setTab("failed_abandoned");
  }, []);

  const queryParams = (() => {
    const base: any = { q: search.trim() || undefined, page, limit: 25 };
    if (tab === "actionable" || tab === "failed_abandoned") {
      base.view = tab;
    } else if (tab === "processing") {
      base.status = "processing";
    } else if (tab === "transit") {
      base.status = "out_for_delivery";
    } else if (tab === "delivered") {
      base.status = "delivered";
    } else if (tab === "cancelled") {
      base.status = "cancelled";
    }
    return base;
  })();

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["ligera-orders", tab, search, page],
    queryFn: () => adminApi.listOrders(queryParams),
  });

  const orders = ordersRes?.data || [];
  const meta = ordersRes?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Fulfillment &amp; Commerce</p>
          <h1 className="mt-1 font-display text-3xl text-forest">
            Orders ({meta?.total ?? orders.length})
          </h1>
        </div>

        {isOwner && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/admin/orders/export.csv", "_blank")}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order number, customer name, or phone…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "border-forest bg-forest text-forest-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-forest hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="text-xs">Order</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="hidden md:table-cell text-xs">Fulfillment</TableHead>
                <TableHead className="text-xs">Payment</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="hidden sm:table-cell text-xs">Placed</TableHead>
                <TableHead className="text-right text-xs">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Loading orders…
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No orders match this view</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow
                    key={o.id}
                    className={`hover:bg-secondary/30 ${o.needsAction ? "bg-amber-50/40" : ""}`}
                  >
                    <TableCell>
                      <Link
                        href={`/ligera/orders/${o.id}`}
                        className="font-mono text-sm font-semibold text-forest hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{o.itemCount} item(s)</span>
                        {o.giftOrder && (
                          <span className="inline-flex items-center gap-0.5 text-gold">
                            <Gift className="h-3 w-3" /> Gift
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Link href={`/ligera/orders/${o.id}`} className="block">
                        <p className="font-medium text-sm">{o.customer.name || "Guest"}</p>
                        <p className="text-xs text-muted-foreground">{o.customer.phone}</p>
                      </Link>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-xs capitalize">
                      {o.deliveryMethod}
                      {o.deliveryZoneName ? ` · ${o.deliveryZoneName}` : ""}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {o.paymentStatus}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] capitalize ${statusBadgeClass(o.status)}`}
                      >
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {new Date(o.placedAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-right font-medium text-sm">
                      {naira(o.total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {meta && (meta.pages || 1) > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {meta.pages} · {meta.total} orders
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
    </div>
  );
}
