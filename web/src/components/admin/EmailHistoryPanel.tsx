"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Mail, RotateCw } from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function EmailHistoryPanel({ orderId }: { orderId?: string } = {}) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["ligera-notifications", orderId || "all", statusFilter, page],
    queryFn: () =>
      adminApi.listNotifications({
        orderId,
        status: statusFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const rows = res?.data || [];
  const meta = res?.meta;

  const resendMutation = useMutation({
    mutationFn: (id: string) => adminApi.resendNotification(id),
    onSuccess: () => {
      toast.success("Email re-queued for delivery");
      qc.invalidateQueries({ queryKey: ["ligera-notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openPreview = async (id: string, label: string) => {
    try {
      const html = await adminApi.previewNotificationHtml(id);
      setPreviewSubject(label);
      setPreviewHtml(html);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load preview.");
    }
  };

  return (
    <div className="space-y-4">
      {!orderId && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
            {[
              { val: "", label: "All" },
              { val: "sent", label: "Sent" },
              { val: "pending", label: "Pending" },
              { val: "failed", label: "Failed" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setStatusFilter(opt.val);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === opt.val
                    ? "bg-forest text-forest-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Recipient</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="hidden md:table-cell text-xs">Error / Sent</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  Loading email history…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  <Mail className="mx-auto mb-1.5 h-6 w-6 opacity-40" />
                  No notifications recorded.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs font-medium">
                    <p>{row.type}</p>
                    {row.orderNumber && (
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {row.orderNumber}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{row.recipient}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "sent"
                          ? "default"
                          : row.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[11px] capitalize"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate text-xs text-muted-foreground">
                    {row.lastError
                      ? row.lastError
                      : row.sentAt
                        ? new Date(row.sentAt).toLocaleString("en-NG")
                        : "Queued"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => openPreview(row.id, `${row.type} → ${row.recipient}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="ml-1 h-7 px-2 text-xs"
                      disabled={row.status === "pending" || resendMutation.isPending}
                      onClick={() => resendMutation.mutate(row.id)}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Resend
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!orderId && meta && (meta.totalPages || 1) > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {meta.totalPages} · {meta.total} logs
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
              disabled={page >= (meta.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={previewHtml !== null} onOpenChange={(o) => !o && setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{previewSubject}</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              sandbox=""
              className="h-[460px] w-full rounded-md border border-border bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmailHistoryPanel;
