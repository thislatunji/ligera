"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, History, Search } from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import type { ActivityLogRow } from "@/lib/api/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ENTITY_TYPES = ["", "product", "variant", "category", "order", "custom_request", "delivery_zone", "settings", "content_page", "user"] as const;

export default function LigeraActivityPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ActivityLogRow | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ["ligera-activity-logs", actionFilter, entityFilter, page],
    queryFn: () =>
      adminApi.listActivityLogs({
        action: actionFilter.trim() || undefined,
        entity: entityFilter || undefined,
        page,
        limit: 25,
      }),
  });

  const rows = res?.data || [];
  const meta = res?.meta;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Audit Trail</p>
        <h1 className="mt-1 font-display text-3xl text-forest">
          Activity Log ({meta?.total ?? rows.length})
        </h1>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by action prefix (e.g. product., order., settings.)…"
            className="pl-9"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.filter(Boolean).map((ent) => (
            <option key={ent} value={ent}>
              {ent.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Actor</TableHead>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="hidden md:table-cell text-xs">Entity</TableHead>
              <TableHead className="text-right text-xs">Diff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  Loading audit logs…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No activity recorded</p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((log) => (
                <TableRow key={log.id} className="hover:bg-secondary/25">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.at).toLocaleString("en-NG")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.userName || "System"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {log.entity?.type} ·{" "}
                    <span className="font-mono">{log.entity?.id}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {Boolean(log.before || log.after) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSelected(log)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    )}
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
            Page {page} of {meta.pages} · {meta.total} entries
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">{selected?.action}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid gap-4 text-xs sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="font-semibold uppercase text-muted-foreground">Before</p>
                <pre className="max-h-80 overflow-auto rounded-md border border-border bg-secondary/30 p-3">
                  {JSON.stringify(selected.before ?? null, null, 2)}
                </pre>
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold uppercase text-muted-foreground">After</p>
                <pre className="max-h-80 overflow-auto rounded-md border border-border bg-secondary/30 p-3">
                  {JSON.stringify(selected.after ?? null, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
