"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import { adminApi, type AdminDeliveryZone } from "@/lib/admin/client";
import { naira } from "@/lib/products";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type ZoneDraft = {
  id?: string;
  name: string;
  fee: string;
  etaText: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_ZONE: ZoneDraft = {
  name: "",
  fee: "3500",
  etaText: "2–3 working days",
  active: true,
  sortOrder: "0",
};

export default function LigeraDeliveryPage() {
  const qc = useQueryClient();
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [zoneDraft, setZoneDraft] = useState<ZoneDraft>(EMPTY_ZONE);
  const [deleteTarget, setDeleteTarget] = useState<AdminDeliveryZone | null>(null);

  // Delivery rules state synced from settings
  const [freeThreshold, setFreeThreshold] = useState("150000");
  const [cutOffTime, setCutOffTime] = useState("15:00");
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [newBlackout, setNewBlackout] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupHours, setPickupHours] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setZoneDraft({ ...EMPTY_ZONE });
      setZoneDialogOpen(true);
    }
  }, []);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["ligera-delivery-zones"],
    queryFn: () => adminApi.listZones(),
  });

  const { data: settings } = useQuery({
    queryKey: ["ligera-settings"],
    queryFn: () => adminApi.getSettings(),
  });

  useEffect(() => {
    if (!settings?.delivery) return;
    setFreeThreshold(String(settings.delivery.freeDeliveryThreshold ?? 150000));
    setCutOffTime(settings.delivery.cutOffTime || "15:00");
    setBlackoutDates(Array.isArray(settings.delivery.blackoutDates) ? settings.delivery.blackoutDates : []);
    setPickupEnabled(settings.delivery.pickup?.enabled !== false);
    setPickupAddress(settings.delivery.pickup?.address || "");
    setPickupHours(settings.delivery.pickup?.hours || "");
  }, [settings]);

  const refreshZones = () => qc.invalidateQueries({ queryKey: ["ligera-delivery-zones"] });

  const saveZoneMutation = useMutation({
    mutationFn: async (d: ZoneDraft) => {
      const payload = {
        name: d.name.trim(),
        fee: Math.max(0, Math.round(Number(d.fee) || 0)),
        etaText: d.etaText.trim(),
        active: d.active,
        sortOrder: Math.max(0, Math.round(Number(d.sortOrder) || 0)),
      };
      if (d.id) {
        return adminApi.updateZone(d.id, payload);
      }
      return adminApi.createZone(payload);
    },
    onSuccess: () => {
      toast.success(zoneDraft.id ? "Zone updated" : "Zone created");
      setZoneDialogOpen(false);
      refreshZones();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleZoneMutation = useMutation({
    mutationFn: (z: AdminDeliveryZone) =>
      adminApi.updateZone(z._id, {
        name: z.name,
        fee: z.fee,
        etaText: z.etaText || "",
        active: !z.active,
        sortOrder: z.sortOrder || 0,
      }),
    onSuccess: () => {
      toast.success("Zone status updated");
      refreshZones();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteZone(id),
    onSuccess: () => {
      toast.success("Zone deleted");
      setDeleteTarget(null);
      refreshZones();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveRulesMutation = useMutation({
    mutationFn: () =>
      adminApi.updateSettings({
        delivery: {
          freeDeliveryThreshold: Math.max(0, Math.round(Number(freeThreshold) || 0)),
          cutOffTime: cutOffTime.trim(),
          blackoutDates,
          pickup: {
            enabled: pickupEnabled,
            address: pickupAddress.trim(),
            hours: pickupHours.trim(),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Delivery & pickup rules saved");
      qc.invalidateQueries({ queryKey: ["ligera-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Dispatch &amp; Logistics</p>
          <h1 className="mt-1 font-display text-3xl text-forest">
            Delivery Zones ({zones.length})
          </h1>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            setZoneDraft({ ...EMPTY_ZONE });
            setZoneDialogOpen(true);
          }}
          className="bg-forest text-forest-foreground hover:bg-forest/90"
        >
          <Plus className="h-4 w-4" />
          Add zone
        </Button>
      </div>

      {/* Zones Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Fee</TableHead>
              <TableHead className="hidden sm:table-cell text-xs">ETA</TableHead>
              <TableHead className="text-xs">Active</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  Loading delivery zones…
                </TableCell>
              </TableRow>
            ) : zones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <Truck className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No delivery zones configured</p>
                </TableCell>
              </TableRow>
            ) : (
              zones.map((z) => (
                <TableRow key={z._id} className="hover:bg-secondary/25">
                  <TableCell className="font-medium text-sm">{z.name}</TableCell>
                  <TableCell className="text-sm">{naira(z.fee)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {z.etaText || "—"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={z.active} onCheckedChange={() => toggleZoneMutation.mutate(z)} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setZoneDraft({
                          id: z._id,
                          name: z.name,
                          fee: String(z.fee),
                          etaText: z.etaText || "",
                          active: z.active,
                          sortOrder: String(z.sortOrder || 0),
                        });
                        setZoneDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTarget(z)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rules & Pickup Settings */}
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="font-display text-xl">Delivery Rules &amp; Studio Pickup</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              saveRulesMutation.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="del-threshold">Free delivery threshold (₦)</Label>
                <Input
                  id="del-threshold"
                  type="number"
                  min={0}
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="del-cutoff">Same-day dispatch cut-off (HH:MM)</Label>
                <Input
                  id="del-cutoff"
                  pattern="\d{2}:\d{2}"
                  value={cutOffTime}
                  onChange={(e) => setCutOffTime(e.target.value)}
                  placeholder="15:00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Blackout dates (no dispatch)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newBlackout}
                  onChange={(e) => setNewBlackout(e.target.value)}
                  className="max-w-[200px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newBlackout && !blackoutDates.includes(newBlackout)) {
                      setBlackoutDates([...blackoutDates, newBlackout].sort());
                      setNewBlackout("");
                    }
                  }}
                >
                  Add date
                </Button>
              </div>
              {blackoutDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {blackoutDates.map((d) => (
                    <Badge key={d} variant="secondary" className="gap-1">
                      {d}
                      <button
                        type="button"
                        onClick={() => setBlackoutDates(blackoutDates.filter((x) => x !== d))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
              <label className="flex items-center justify-between text-sm font-medium">
                <span>Enable Gbagada Studio Pickup</span>
                <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pickup-addr">Pickup address</Label>
                  <Input
                    id="pickup-addr"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pickup-hrs">Pickup hours</Label>
                  <Input
                    id="pickup-hrs"
                    value={pickupHours}
                    onChange={(e) => setPickupHours(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saveRulesMutation.isPending}
                className="bg-forest text-forest-foreground hover:bg-forest/90"
              >
                {saveRulesMutation.isPending ? "Saving…" : "Save delivery rules"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Add/Edit Zone Dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {zoneDraft.id ? "Edit delivery zone" : "New delivery zone"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Zones appear in checkout delivery quotes and shipping calculators.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!zoneDraft.name.trim()) {
                toast.error("Zone name is required.");
                return;
              }
              saveZoneMutation.mutate(zoneDraft);
            }}
          >
            <div className="space-y-1.5">
              <Label>Zone name</Label>
              <Input
                required
                value={zoneDraft.name}
                onChange={(e) => setZoneDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Lekki Phase 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fee (₦)</Label>
                <Input
                  type="number"
                  min={0}
                  required
                  value={zoneDraft.fee}
                  onChange={(e) => setZoneDraft((p) => ({ ...p, fee: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  min={0}
                  value={zoneDraft.sortOrder}
                  onChange={(e) => setZoneDraft((p) => ({ ...p, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated delivery window</Label>
              <Input
                value={zoneDraft.etaText}
                onChange={(e) => setZoneDraft((p) => ({ ...p, etaText: e.target.value }))}
                placeholder="e.g. 1–2 working days"
              />
            </div>
            <label className="flex items-center justify-between text-sm">
              <span>Active</span>
              <Switch
                checked={zoneDraft.active}
                onCheckedChange={(active) => setZoneDraft((p) => ({ ...p, active }))}
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setZoneDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveZoneMutation.isPending}
                className="bg-forest text-forest-foreground hover:bg-forest/90"
              >
                {saveZoneMutation.isPending ? "Saving…" : "Save zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Zone Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Zones referenced by past orders cannot be deleted — deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteZoneMutation.mutate(deleteTarget._id)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
