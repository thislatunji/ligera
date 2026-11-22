"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import { naira } from "@/lib/products";
import { useLigeraAdmin } from "@/components/ligera-admin/LigeraAdminContext";
import { EmailHistoryPanel } from "@/components/admin/EmailHistoryPanel";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["paid", "abandoned", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["refunded"],
  refunded: [],
  abandoned: [],
};

const LIFECYCLE_STEPS = ["pending_payment", "paid", "processing", "out_for_delivery", "delivered"];

export default function LigeraOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id || "";
  const qc = useQueryClient();
  const { isOwner } = useLigeraAdmin();

  const [transitionNote, setTransitionNote] = useState("");
  const [emailCustomer, setEmailCustomer] = useState(true);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Cancelled by studio");
  const [restoreStock, setRestoreStock] = useState(true);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("Customer refund");

  const { data: order, isLoading } = useQuery({
    queryKey: ["ligera-order", orderId],
    queryFn: () => adminApi.getOrder(orderId),
    enabled: Boolean(orderId),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ligera-order", orderId] });
    qc.invalidateQueries({ queryKey: ["ligera-orders"] });
    qc.invalidateQueries({ queryKey: ["ligera-dashboard"] });
    qc.invalidateQueries({ queryKey: ["ligera-admin-nav-badges"] });
  };

  const transitionMutation = useMutation({
    mutationFn: (nextStatus: string) =>
      adminApi.transitionOrder(orderId, {
        status: nextStatus,
        note: transitionNote.trim() || undefined,
        emailCustomer,
      }),
    onSuccess: (res) => {
      toast.success(`Order moved to ${res.status.replace(/_/g, " ")}`);
      setTransitionNote("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const verifyMutation = useMutation({
    mutationFn: () => adminApi.verifyOrderPayment(orderId),
    onSuccess: (res) => {
      toast.success(res?.message || "Payment verification checked");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      adminApi.cancelOrder(orderId, {
        reason: cancelReason.trim() || "Cancelled by studio",
        restoreStock,
      }),
    onSuccess: () => {
      toast.success("Order cancelled");
      setCancelOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const refundMutation = useMutation({
    mutationFn: () =>
      adminApi.refundOrder(orderId, {
        amount: refundAmount.trim() ? Math.round(Number(refundAmount)) : undefined,
        reason: refundReason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Refund processed");
      setRefundOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading order…</p>;
  }

  if (!order) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-lg font-medium">Order not found</p>
        <Link href="/ligera/orders">
          <Button variant="outline">Back to orders</Button>
        </Link>
      </div>
    );
  }

  const nextTransitions = (ALLOWED_TRANSITIONS[order.status] || []).filter(
    (s) => s !== "cancelled" && s !== "refunded",
  );
  const canCancel = (ALLOWED_TRANSITIONS[order.status] || []).includes("cancelled");
  const canRefund = isOwner && order.paymentStatus === "paid" && order.status !== "refunded";

  const currentStepIdx = LIFECYCLE_STEPS.indexOf(
    order.status === "ready_for_pickup" ? "out_for_delivery" : order.status,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/ligera/orders"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl text-forest">{order.orderNumber}</h1>
            <Badge className="capitalize">{order.status.replace(/_/g, " ")}</Badge>
            <Badge variant="outline" className="capitalize">
              Payment: {order.paymentStatus}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed {new Date(order.placedAt).toLocaleString("en-NG")} · Source: {order.source}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/admin/orders/${order.id}/packing-slip`, "_blank")}
          >
            <Printer className="h-3.5 w-3.5" />
            Packing slip
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={verifyMutation.isPending}
            onClick={() => verifyMutation.mutate()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${verifyMutation.isPending ? "animate-spin" : ""}`} />
            Verify payment
          </Button>
          {canCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setCancelOpen(true)}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Cancel order
            </Button>
          )}
          {canRefund && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setRefundAmount(String(order.total));
                setRefundOpen(true);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refund
            </Button>
          )}
        </div>
      </div>

      {/* Stepper + Actions */}
      <Card className="border-border/70">
        <CardContent className="space-y-5 p-5">
          <div className="grid grid-cols-5 gap-2">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const reached = currentStepIdx >= idx;
              return (
                <div key={step} className="space-y-1.5">
                  <div
                    className={`h-2 rounded-full ${reached ? "bg-forest" : "bg-secondary"}`}
                  />
                  <p className="text-[11px] font-medium capitalize text-muted-foreground">
                    {step.replace(/_/g, " ")}
                  </p>
                </div>
              );
            })}
          </div>

          {nextTransitions.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-wider text-forest uppercase">
                  Advance fulfillment
                </p>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={emailCustomer} onCheckedChange={setEmailCustomer} />
                  Notify customer by email
                </label>
              </div>

              <Input
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                placeholder="Optional internal / customer dispatch note…"
                className="h-8 text-xs"
              />

              <div className="flex flex-wrap gap-2">
                {nextTransitions.map((next) => (
                  <Button
                    key={next}
                    type="button"
                    size="sm"
                    disabled={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(next)}
                    className="bg-forest text-xs capitalize text-forest-foreground hover:bg-forest/90"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark {next.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Line items & Gift note */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.label} · <span className="font-mono">{item.sku}</span> · Qty {item.qty}
                    </p>
                  </div>
                  <p className="font-medium text-sm">{naira(item.unitPrice * item.qty)}</p>
                </div>
              ))}

              <div className="mt-4 space-y-1.5 pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{naira(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{naira(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery ({order.deliveryZoneName || order.deliveryMethod})</span>
                  <span>{naira(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-display text-xl text-forest">
                  <span>Total</span>
                  <span>{naira(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {(order.giftNote || order.hidePrices) && (
            <Card className="border-gold/50 bg-gold/10">
              <CardContent className="flex items-start gap-3 p-4">
                <Gift className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                <div className="text-sm">
                  <p className="font-semibold">Gift instructions</p>
                  {order.giftNote && <p className="mt-1 italic">“{order.giftNote}”</p>}
                  {order.hidePrices && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hide prices on packing slip requested.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isOwner && (
            <Card className="border-border/70">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="font-display text-xl">Email Log</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <EmailHistoryPanel orderId={order.id} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Customer, Address, Payment & Timeline */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Customer &amp; Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Contact</p>
                <p className="mt-1 font-medium">{order.customer.name}</p>
                <p className="text-muted-foreground">{order.customer.email}</p>
                <p className="text-muted-foreground">{order.customer.phone}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase">Method</p>
                <p className="mt-1 capitalize">
                  {order.deliveryMethod}
                  {order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ""}
                </p>
                {order.deliveryAddress?.address && (
                  <p className="mt-1 text-muted-foreground">
                    {[
                      order.deliveryAddress.address,
                      order.deliveryAddress.landmark,
                      order.deliveryAddress.city,
                      order.deliveryAddress.state,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase">Payment Reference</p>
                <p className="mt-1 font-mono text-xs">{order.payment?.reference || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {order.statusTimeline.length === 0 ? (
                <p className="text-xs text-muted-foreground">No status events logged yet.</p>
              ) : (
                order.statusTimeline.map((evt, idx) => (
                  <div key={idx} className="border-l-2 border-gold/60 pl-3 text-xs">
                    <p className="font-semibold capitalize">{evt.status.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground">
                      {new Date(evt.at).toLocaleString("en-NG")}
                      {evt.byUserName ? ` · ${evt.byUserName}` : ""}
                    </p>
                    {evt.note && <p className="mt-0.5 italic">“{evt.note}”</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Cancel {order.orderNumber}</DialogTitle>
            <DialogDescription className="text-xs">
              This cancels the order and optionally returns reserved/sold quantities to inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <label className="flex items-center justify-between text-sm">
              <span>Restore stock quantities</span>
              <Switch checked={restoreStock} onCheckedChange={setRestoreStock} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Confirm cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Issue Flutterwave refund</DialogTitle>
            <DialogDescription className="text-xs">
              Maximum refundable amount: {naira(order.total)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                min={1}
                max={order.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={refundMutation.isPending}
              onClick={() => refundMutation.mutate()}
            >
              {refundMutation.isPending ? "Processing…" : "Process refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
