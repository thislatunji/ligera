"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TEMPLATE_KEYS = [
  { key: "order.paid.customer", label: "Order Confirmed (Customer)" },
  { key: "order.status.customer", label: "Order Status Update (Customer)" },
  { key: "order.cancelled.customer", label: "Order Cancelled (Customer)" },
  { key: "custom_request.submitted.customer", label: "Custom Request Received" },
  { key: "custom_request.quoted.customer", label: "Custom Quote Sent" },
] as const;

export function EmailTemplatesTab() {
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>(TEMPLATE_KEYS[0].key);
  const [templates, setTemplates] = useState<Record<string, { subject: string; body: string }>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ligera-settings"],
    queryFn: () => adminApi.getSettings(),
  });

  useEffect(() => {
    if (settings?.emailTemplates && typeof settings.emailTemplates === "object") {
      setTemplates(settings.emailTemplates);
    }
  }, [settings]);

  const current = templates[selectedKey] || { subject: "", body: "" };

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updateSettings({
        emailTemplates: {
          ...templates,
          [selectedKey]: {
            subject: current.subject.slice(0, 120),
            body: current.body.slice(0, 4000),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Email template saved");
      qc.invalidateQueries({ queryKey: ["ligera-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading templates…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_KEYS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSelectedKey(t.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedKey === t.key
                ? "border-forest bg-forest text-forest-foreground"
                : "border-border bg-card text-muted-foreground hover:border-forest hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label>Subject override</Label>
              <span className="text-[11px] text-muted-foreground">
                {current.subject.length}/120
              </span>
            </div>
            <Input
              maxLength={120}
              value={current.subject}
              onChange={(e) =>
                setTemplates((prev) => ({
                  ...prev,
                  [selectedKey]: { ...current, subject: e.target.value },
                }))
              }
              placeholder="Leave blank to use default Ligera subject line"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label>Intro / body message override</Label>
              <span className="text-[11px] text-muted-foreground">
                {current.body.length}/4000
              </span>
            </div>
            <Textarea
              rows={6}
              maxLength={4000}
              value={current.body}
              onChange={(e) =>
                setTemplates((prev) => ({
                  ...prev,
                  [selectedKey]: { ...current, body: e.target.value },
                }))
              }
              placeholder="Custom studio message shown inside the branded Ligera email…"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="bg-forest text-forest-foreground hover:bg-forest/90"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving…" : "Save template"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmailTemplatesTab;
