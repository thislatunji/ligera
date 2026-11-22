"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import { useLigeraAdmin } from "@/components/ligera-admin/LigeraAdminContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function LigeraSettingsPage() {
  const qc = useQueryClient();
  const { user, refreshSession } = useLigeraAdmin();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ligera-settings"],
    queryFn: () => adminApi.getSettings(),
  });

  // Store profile
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instagram, setInstagram] = useState("");
  const [openingHours, setOpeningHours] = useState("");

  // Homepage
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementText, setAnnouncementText] = useState("");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubline, setHeroSubline] = useState("");
  const [heroCtaText, setHeroCtaText] = useState("");
  const [heroCtaHref, setHeroCtaHref] = useState("/collections");
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);

  // Payment
  const [payOnDelivery, setPayOnDelivery] = useState(false);

  // Security: password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Security: 2FA setup
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (!settings) return;
    setStoreName(settings.store?.name || "");
    setTagline(settings.store?.tagline || "");
    setContactEmail(settings.store?.contactEmail || "");
    setPhone(settings.store?.phone || "");
    setWhatsappNumber(settings.store?.whatsappNumber || "");
    setInstagram(settings.store?.instagram || "");
    setOpeningHours(settings.store?.openingHours || "");

    setAnnouncementActive(settings.homepage?.announcement?.active !== false);
    setAnnouncementText(settings.homepage?.announcement?.text || "");
    setHeroHeadline(settings.homepage?.hero?.headline || "");
    setHeroSubline(settings.homepage?.hero?.subline || "");
    setHeroCtaText(settings.homepage?.hero?.ctaText || "Shop Now");
    setHeroCtaHref(settings.homepage?.hero?.ctaHref || "/collections");
    setNewsletterEnabled(settings.homepage?.newsletterEnabled !== false);

    setPayOnDelivery(Boolean(settings.payment?.payOnDelivery));
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => adminApi.updateSettings(patch),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["ligera-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => adminApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const start2faMutation = useMutation({
    mutationFn: () => adminApi.setup2fa(),
    onSuccess: (res) => {
      setTotpSetup(res);
      toast.success("2FA secret generated. Add it to your authenticator app.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const enable2faMutation = useMutation({
    mutationFn: () => adminApi.enable2fa(totpCode.trim()),
    onSuccess: async () => {
      toast.success("Two-factor authentication enabled");
      setTotpSetup(null);
      setTotpCode("");
      await refreshSession();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Configuration</p>
        <h1 className="mt-1 font-display text-3xl text-forest">Studio Settings</h1>
      </div>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList>
          <TabsTrigger value="store">Store Profile</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="security">Account &amp; Security</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Brand &amp; Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveSettingsMutation.mutate({
                      store: {
                        name: storeName.trim(),
                        tagline: tagline.trim(),
                        contactEmail: contactEmail.trim(),
                        phone: phone.trim(),
                        whatsappNumber: whatsappNumber.replace(/\D/g, ""),
                        instagram: instagram.trim(),
                        openingHours: openingHours.trim(),
                      },
                    });
                  }}
                >
                  <div className="space-y-1.5">
                    <Label>Store name</Label>
                    <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tagline</Label>
                    <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact email</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Display phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp number (10–14 digits, no +)</Label>
                    <Input
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="2348096613114"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instagram URL</Label>
                    <Input
                      type="url"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Opening hours</Label>
                    <Input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} />
                  </div>
                  <div className="flex justify-end sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={saveSettingsMutation.isPending}
                      className="bg-forest text-forest-foreground hover:bg-forest/90"
                    >
                      <Save className="h-4 w-4" />
                      Save store profile
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homepage">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Homepage Banner &amp; Hero Copy</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSettingsMutation.mutate({
                    homepage: {
                      announcement: { text: announcementText, active: announcementActive },
                      hero: {
                        headline: heroHeadline,
                        subline: heroSubline,
                        image: settings?.homepage?.hero?.image || {
                          publicId: "ligera/hero",
                          alt: "Ligera candles",
                        },
                        ctaText: heroCtaText,
                        ctaHref: heroCtaHref,
                      },
                      newsletterEnabled,
                    },
                  });
                }}
              >
                <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
                  <label className="flex items-center justify-between text-sm font-medium">
                    <span>Show announcement bar</span>
                    <Switch
                      checked={announcementActive}
                      onCheckedChange={setAnnouncementActive}
                    />
                  </label>
                  <Input
                    maxLength={140}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Free delivery over ₦150,000"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Hero headline</Label>
                    <Input
                      maxLength={90}
                      value={heroHeadline}
                      onChange={(e) => setHeroHeadline(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Hero subline</Label>
                    <Input
                      maxLength={160}
                      value={heroSubline}
                      onChange={(e) => setHeroSubline(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Primary CTA label</Label>
                    <Input
                      maxLength={30}
                      value={heroCtaText}
                      onChange={(e) => setHeroCtaText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Primary CTA link</Label>
                    <Input value={heroCtaHref} onChange={(e) => setHeroCtaHref(e.target.value)} />
                  </div>
                </div>

                <label className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4 text-sm font-medium">
                  <span>Enable newsletter signup</span>
                  <Switch checked={newsletterEnabled} onCheckedChange={setNewsletterEnabled} />
                </label>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                    className="bg-forest text-forest-foreground hover:bg-forest/90"
                  >
                    <Save className="h-4 w-4" />
                    Save homepage settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Checkout Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <label className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4 text-sm">
                <div>
                  <p className="font-medium">Pay on Delivery</p>
                  <p className="text-xs text-muted-foreground">
                    Allow eligible Lagos customers to pay upon dispatch instead of prepaid Flutterwave checkout.
                  </p>
                </div>
                <Switch checked={payOnDelivery} onCheckedChange={setPayOnDelivery} />
              </label>

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={saveSettingsMutation.isPending}
                  onClick={() => saveSettingsMutation.mutate({ payment: { payOnDelivery } })}
                  className="bg-forest text-forest-foreground hover:bg-forest/90"
                >
                  <Save className="h-4 w-4" />
                  Save payment settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form
                className="max-w-md space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newPassword !== confirmPassword) {
                    toast.error("New passwords do not match.");
                    return;
                  }
                  changePasswordMutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Current password</Label>
                  <Input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>New password (min 8 characters)</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm new password</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-forest text-forest-foreground hover:bg-forest/90"
                >
                  <KeyRound className="h-4 w-4" />
                  {changePasswordMutation.isPending ? "Updating…" : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Two-Factor Authentication (TOTP)</CardTitle>
              <Badge variant={user?.twoFactorEnabled ? "default" : "outline"}>
                {user?.twoFactorEnabled ? "Enabled" : "Not configured"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {user?.twoFactorEnabled ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Your account is protected with authenticator-app 2FA.
                </p>
              ) : totpSetup ? (
                <div className="max-w-md space-y-4">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs">
                    <p className="font-semibold">1. Add this secret key to your authenticator app:</p>
                    <p className="mt-1 select-all font-mono text-sm font-bold text-forest">
                      {totpSetup.secret}
                    </p>
                    <p className="mt-2 break-all text-[11px] text-muted-foreground">
                      {totpSetup.otpauthUri}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>2. Enter 6-digit codes to verify (may require consecutive codes)</Label>
                    <div className="flex gap-2">
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="font-mono tracking-widest"
                      />
                      <Button
                        type="button"
                        disabled={totpCode.length !== 6 || enable2faMutation.isPending}
                        onClick={() => enable2faMutation.mutate()}
                        className="bg-forest text-forest-foreground hover:bg-forest/90"
                      >
                        Verify code
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of protection with Google Authenticator, 1Password, or Authy.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={start2faMutation.isPending}
                    onClick={() => start2faMutation.mutate()}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Set up 2FA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
