"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/lib/admin/client";
import { naira } from "@/lib/products";
import { useLigeraAdmin } from "@/components/ligera-admin/LigeraAdminContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function computeTrend(current: number, previous: number): { pct: number; label: string } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, label: "0% vs prior" };
    return { pct: 100, label: "+100% vs prior" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct, label: `${pct >= 0 ? "+" : ""}${pct}% vs prior` };
}

function TrendPill({ current, previous }: { current: number; previous: number }) {
  const { pct, label } = computeTrend(current, previous);
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        up ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {label}
    </span>
  );
}

function StaffOperationsHome() {
  const { user } = useLigeraAdmin();
  const { data: ordersData } = useQuery({
    queryKey: ["staff-home-orders"],
    queryFn: () => adminApi.listOrders({ view: "actionable", limit: 10 }),
  });
  const { data: lowStockData } = useQuery({
    queryKey: ["staff-home-low-stock"],
    queryFn: () => adminApi.listProducts({ lowStock: true, limit: 20 }),
  });

  const actionableOrders = ordersData?.data || [];
  const lowProducts = lowStockData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Studio Operations</p>
        <h1 className="mt-1 font-display text-3xl text-forest">
          Welcome, {user?.name || "Team"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Focus on order fulfillment, packing slips, and stock counts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders to prepare</CardTitle>
            <ShoppingCart className="h-4 w-4 text-forest" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl text-forest">{actionableOrders.length}</p>
            <Link
              href="/ligera/orders?view=actionable"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest hover:underline"
            >
              Open fulfillment queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low-stock products</CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl text-forest">{lowProducts.length}</p>
            <Link
              href="/ligera/products?lowStock=true"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest hover:underline"
            >
              Review inventory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LigeraDashboardPage() {
  const { isOwner, user } = useLigeraAdmin();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("today");
  const [restockTarget, setRestockTarget] = useState<{
    variantId: string;
    productName: string;
    label: string;
    available: number;
  } | null>(null);
  const [restockQty, setRestockQty] = useState("10");
  const [restockNote, setRestockNote] = useState("Studio restock");

  const {
    data: snapshot,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["ligera-dashboard", period],
    queryFn: () => adminApi.dashboard(period),
    enabled: isOwner,
  });

  const { data: recentOrdersRes } = useQuery({
    queryKey: ["ligera-dashboard-recent-orders"],
    queryFn: () => adminApi.listOrders({ page: 1, limit: 6 }),
    enabled: isOwner,
  });

  const restockMutation = useMutation({
    mutationFn: (vars: { variantId: string; change: number; note: string }) =>
      adminApi.adjustStock(vars.variantId, {
        change: vars.change,
        reason: "restock",
        note: vars.note,
      }),
    onSuccess: () => {
      toast.success("Stock replenished");
      setRestockTarget(null);
      qc.invalidateQueries({ queryKey: ["ligera-dashboard"] });
      qc.invalidateQueries({ queryKey: ["ligera-admin-nav-badges"] });
      qc.invalidateQueries({ queryKey: ["ligera-products"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isOwner) {
    return <StaffOperationsHome />;
  }

  const recentOrders = recentOrdersRes?.data || [];
  const periodLabel =
    period === "today" ? "Today (WAT)" : period === "7d" ? "Last 7 days" : "Last 30 days";

  const actionTotal =
    (snapshot?.actionList.ordersAwaitingProcessing || 0) +
    (snapshot?.actionList.customRequestsNew || 0) +
    (snapshot?.actionList.failedOrAbandonedPayments || 0) +
    (snapshot?.lowStock.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Studio Executive</p>
          <h1 className="mt-1 font-display text-3xl text-forest sm:text-4xl">
            Good to see you, {user?.name?.split(" ")[0] || "Owner"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance snapshot for {periodLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {(
              [
                { key: "today", label: "Today" },
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === opt.key
                    ? "bg-forest text-forest-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {actionTotal > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span className="font-medium text-foreground">
              {actionTotal} item{actionTotal === 1 ? "" : "s"} need your attention across orders,
              custom requests, and inventory.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(snapshot?.actionList.ordersAwaitingProcessing || 0) > 0 && (
              <Link href="/ligera/orders?view=actionable">
                <Badge className="bg-forest text-forest-foreground hover:bg-forest/90">
                  {snapshot?.actionList.ordersAwaitingProcessing} Paid Orders
                </Badge>
              </Link>
            )}
            {(snapshot?.actionList.customRequestsNew || 0) > 0 && (
              <Link href="/ligera/custom-requests?status=new">
                <Badge variant="outline" className="border-gold text-foreground">
                  {snapshot?.actionList.customRequestsNew} Custom Requests
                </Badge>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Bento KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Revenue
            </p>
            <p className="mt-2 font-display text-3xl text-forest">
              {isLoading ? "…" : naira(snapshot?.headline.revenue || 0)}
            </p>
            {snapshot && (
              <div className="mt-3">
                <TrendPill
                  current={snapshot.headline.revenue}
                  previous={snapshot.headline.previousRevenue}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Paid Orders
            </p>
            <p className="mt-2 font-display text-3xl text-forest">
              {isLoading ? "…" : snapshot?.headline.paidOrders || 0}
            </p>
            {snapshot && (
              <div className="mt-3">
                <TrendPill
                  current={snapshot.headline.paidOrders}
                  previous={snapshot.headline.previousPaidOrders}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Avg Order Value
            </p>
            <p className="mt-2 font-display text-3xl text-forest">
              {isLoading ? "…" : naira(snapshot?.headline.averageOrderValue || 0)}
            </p>
            {snapshot && (
              <div className="mt-3">
                <TrendPill
                  current={snapshot.headline.averageOrderValue}
                  previous={snapshot.headline.previousAverageOrderValue}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-forest text-forest-foreground shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <p className="text-[11px] tracking-[0.18em] text-gold uppercase">
              Inventory Value
            </p>
            <p className="mt-2 font-display text-3xl">
              {isLoading ? "…" : naira(snapshot?.stockValue.atSelling || 0)}
            </p>
            <p className="mt-3 text-xs text-forest-foreground/75">
              Cost basis: {naira(snapshot?.stockValue.atCost || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/ligera/orders?view=actionable" className="group">
          <Card className="h-full border-border/70 transition-colors group-hover:border-gold">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest/10 text-forest">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Awaiting processing</p>
                  <p className="text-lg font-semibold">
                    {snapshot?.actionList.ordersAwaitingProcessing || 0} orders
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/ligera/custom-requests?status=new" className="group">
          <Card className="h-full border-border/70 transition-colors group-hover:border-gold">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/20 text-ink">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bespoke inquiries</p>
                  <p className="text-lg font-semibold">
                    {snapshot?.actionList.customRequestsNew || 0} new
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/ligera/orders?view=failed_abandoned" className="group">
          <Card className="h-full border-border/70 transition-colors group-hover:border-gold">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Failed / abandoned</p>
                  <p className="text-lg font-semibold">
                    {snapshot?.actionList.failedOrAbandonedPayments || 0} payments
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts + Top Products */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-border/70 lg:col-span-7">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="font-display text-xl">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {!snapshot || snapshot.revenueByCategory.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No paid category revenue recorded in this window yet.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={snapshot.revenueByCategory}
                    margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `₦${Math.round(v / 1000)}k` : `₦${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        fontSize: 12,
                      }}
                      formatter={(val: number | string) => [naira(Number(val)), "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="var(--forest)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <CardTitle className="font-display text-xl">Top Products</CardTitle>
            <Link href="/ligera/products" className="text-xs text-forest hover:underline">
              All products →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!snapshot || snapshot.topProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No sales in this period yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-right text-xs">Units</TableHead>
                    <TableHead className="text-right text-xs">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.topProducts.map((tp) => (
                    <TableRow key={tp.productId}>
                      <TableCell className="font-medium text-sm">{tp.name}</TableCell>
                      <TableCell className="text-right text-sm">{tp.unitsSold}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {naira(tp.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Low Stock Watchlist */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-border/70 lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <CardTitle className="font-display text-xl">Recent Orders</CardTitle>
            <Link href="/ligera/orders" className="text-xs text-forest hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-secondary/40">
                      <TableCell>
                        <Link href={`/ligera/orders/${o.id}`} className="block">
                          <p className="font-medium text-sm">{o.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{o.customer.name}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {o.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {naira(o.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
            <CardTitle className="font-display text-xl">Low-Stock Watchlist</CardTitle>
            <Link href="/ligera/products?lowStock=true" className="text-xs text-forest hover:underline">
              Inventory →
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {!snapshot || snapshot.lowStock.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-600" />
                All stock levels are healthy.
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshot.lowStock.slice(0, 6).map((item) => (
                  <div
                    key={item.variantId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.label} · <span className="font-mono">{item.sku}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.soldOut ? "destructive" : "secondary"}>
                        {item.soldOut ? "Sold out" : `${item.available} left`}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setRestockTarget({
                            variantId: item.variantId,
                            productName: item.productName,
                            label: item.label,
                            available: item.available,
                          });
                          setRestockQty("10");
                          setRestockNote("Studio restock");
                        }}
                      >
                        Restock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Restock Dialog */}
      <Dialog open={!!restockTarget} onOpenChange={(o) => !o && setRestockTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Quick restock</DialogTitle>
            <DialogDescription className="text-xs">
              {restockTarget?.productName} ({restockTarget?.label}) · Currently{" "}
              {restockTarget?.available} available.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!restockTarget) return;
              const qty = Math.round(Number(restockQty));
              if (!qty || qty <= 0) {
                toast.error("Enter a positive quantity to add.");
                return;
              }
              restockMutation.mutate({
                variantId: restockTarget.variantId,
                change: qty,
                note: restockNote,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="quick-restock-qty">Units to add</Label>
              <Input
                id="quick-restock-qty"
                type="number"
                min={1}
                required
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-restock-note">Note</Label>
              <Input
                id="quick-restock-note"
                value={restockNote}
                onChange={(e) => setRestockNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRestockTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={restockMutation.isPending}
                className="bg-forest text-forest-foreground hover:bg-forest/90"
              >
                {restockMutation.isPending ? "Saving…" : "Add stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
