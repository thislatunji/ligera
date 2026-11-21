"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListOrders,
  setFulfilledQuantity,
  updateOrderStatus,
  type AdminOrderStatus,
} from "@/lib/admin.functions";
import { naira } from "@/lib/products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TRANSITION_STATUSES: AdminOrderStatus[] = [
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
];

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default function OrdersAdminPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => adminListOrders(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const statusM = useMutation({
    mutationFn: (v: { id: string; status: AdminOrderStatus }) => updateOrderStatus({ data: v }),
    onSuccess: refresh,
  });

  const fulfilM = useMutation({
    mutationFn: (v: { itemId: string; fulfilledQuantity: number }) =>
      setFulfilledQuantity({ data: v }),
    onSuccess: refresh,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (data.length === 0) return <p className="text-muted-foreground">No orders yet.</p>;

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl">Orders ({data.length})</h2>
      {data.map((o) => {
        const statusOptions = TRANSITION_STATUSES.includes(o.status)
          ? TRANSITION_STATUSES
          : [o.status, ...TRANSITION_STATUSES];

        return (
          <article key={o.id} className="rounded-xl border border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    {o.reference}
                  </Link>{" "}
                  · {o.customer_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("en-NG")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {o.email} · {o.phone}
                </p>
                {o.address && (
                  <p className="text-sm text-muted-foreground">
                    {[o.address, o.city, o.state].filter(Boolean).join(", ")}
                  </p>
                )}
                {o.delivery_note && <p className="mt-1 text-sm italic">“{o.delivery_note}”</p>}
              </div>
              <div className="text-right">
                <p className="font-display text-xl">{naira(o.total)}</p>
                <select
                  className="mt-2 h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
                  value={o.status}
                  onChange={(e) =>
                    statusM.mutate({ id: o.id, status: e.target.value as AdminOrderStatus })
                  }
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {o.order_items.length > 0 ? (
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-1">Item</th>
                    <th>Ordered</th>
                    <th>Fulfilled</th>
                    <th className="text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {o.order_items.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="py-2">{i.product_name}</td>
                      <td>{i.quantity}</td>
                      <td>
                        <Input
                          type="number"
                          min={0}
                          max={i.quantity}
                          defaultValue={i.fulfilled_quantity}
                          key={`f${i.fulfilled_quantity}`}
                          className="h-8 w-20"
                          onBlur={(e) => {
                            const v = Math.min(Number(e.target.value), i.quantity);
                            if (v !== i.fulfilled_quantity && v >= 0) {
                              fulfilM.mutate({ itemId: i.id, fulfilledQuantity: v });
                            }
                          }}
                        />
                      </td>
                      <td className="text-right">{naira(i.unit_price * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{o.item_count} item(s)</p>
            )}

            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  for (const i of o.order_items) {
                    if (i.fulfilled_quantity !== i.quantity) {
                      await fulfilM.mutateAsync({ itemId: i.id, fulfilledQuantity: i.quantity });
                    }
                  }
                  statusM.mutate({ id: o.id, status: "delivered" });
                }}
              >
                Mark delivered
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
