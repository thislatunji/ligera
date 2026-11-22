"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, Users } from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import { naira } from "@/lib/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LigeraCustomersPage() {
  const [search, setSearch] = useState("");
  const [consentOnly, setConsentOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data: customersRes, isLoading } = useQuery({
    queryKey: ["ligera-customers", search, consentOnly, page],
    queryFn: () =>
      adminApi.listCustomers({
        q: search.trim() || undefined,
        consentOnly: consentOnly || undefined,
        page,
        limit: 25,
      }),
  });

  const customers = customersRes?.data || [];
  const meta = customersRes?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Clientele</p>
          <h1 className="mt-1 font-display text-3xl text-forest">
            Customers ({meta?.total ?? customers.length})
          </h1>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.open("/api/admin/customers/export.csv", "_blank")}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customers by name or email…"
            className="pl-9"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-medium">
          <Switch
            checked={consentOnly}
            onCheckedChange={(v) => {
              setConsentOnly(v);
              setPage(1);
            }}
          />
          Marketing consent only
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="hidden sm:table-cell text-xs">Phone</TableHead>
              <TableHead className="text-xs">Orders</TableHead>
              <TableHead className="text-xs">Total Spend</TableHead>
              <TableHead className="hidden md:table-cell text-xs">Marketing</TableHead>
              <TableHead className="hidden lg:table-cell text-xs">Last Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Loading customers…
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No customers found</p>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-secondary/25">
                  <TableCell>
                    <p className="font-medium text-sm">{c.name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs">{c.phone || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{c.orderCount}</TableCell>
                  <TableCell className="text-sm font-medium">{naira(c.totalSpend)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={c.marketingConsent ? "default" : "outline"} className="text-[11px]">
                      {c.marketingConsent ? "Opted in" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {c.lastOrderAt
                      ? new Date(c.lastOrderAt).toLocaleDateString("en-NG")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (meta.pages || 1) > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {meta.pages} · {meta.total} customers
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
