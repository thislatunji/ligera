"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import mark from "@/assets/ligera-mark-gold.png";
import { adminApi, AdminApiError } from "@/lib/admin/client";
import { useLigeraAdmin } from "./LigeraAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function StealthLoginView() {
  const queryClient = useQueryClient();
  const { setAuthenticatedUser } = useLigeraAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Password reset drawer state
  const [resetMode, setResetMode] = useState<"none" | "request" | "confirm">("none");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await adminApi.login({
        email: email.trim(),
        password,
        ...(requiresTotp && totpCode.trim() ? { totpCode: totpCode.trim() } : {}),
      });
      await queryClient.invalidateQueries();
      setAuthenticatedUser(res.user);
      toast.success(`Welcome back, ${res.user.name}`);
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "TOTP_REQUIRED") {
        setRequiresTotp(true);
        setErrorMsg("Enter the 6-digit verification code from your authenticator app.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Could not sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetBusy(true);
    try {
      await adminApi.requestPasswordReset(resetEmail.trim());
      toast.success("If an account matches that email, a reset token has been sent.");
      setResetMode("confirm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setResetBusy(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetBusy(true);
    try {
      await adminApi.confirmPasswordReset(resetToken.trim(), resetPassword);
      toast.success("Password updated. You can sign in now.");
      setResetMode("none");
      setResetToken("");
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired reset token.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,oklch(0.935_0.021_82_/_0.9),transparent_65%)]"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-xl border border-clay/60 bg-card/95 p-8 shadow-[var(--shadow-lift)] backdrop-blur-sm sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-forest/95 p-2.5 shadow-sm">
              <Image
                src={mark}
                alt="Ligera monogram"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <h1 className="mt-5 font-display text-4xl tracking-[0.14em] text-forest uppercase">
              Ligera
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {resetMode === "none" ? "Sign in to continue" : "Reset your password"}
            </p>
          </div>

          {resetMode === "none" ? (
            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="ligera-login-email">Email</Label>
                <Input
                  id="ligera-login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="name@ligerascents.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ligera-login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetMode("request");
                    }}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="ligera-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {requiresTotp && (
                <div className="space-y-1.5 rounded-lg border border-gold/40 bg-sand/50 p-3.5">
                  <Label htmlFor="ligera-login-totp" className="flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-forest" />
                    Two-factor code
                  </Label>
                  <Input
                    id="ligera-login-totp"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="font-mono tracking-[0.35em]"
                  />
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
                >
                  {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-10 w-full bg-forest text-forest-foreground hover:bg-forest/90"
              >
                <Lock className="h-3.5 w-3.5" />
                {submitting ? "Verifying…" : "Sign in"}
              </Button>
            </form>
          ) : resetMode === "request" ? (
            <form onSubmit={handleRequestReset} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Account email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@ligerascents.com"
                />
              </div>
              <Button
                type="submit"
                disabled={resetBusy}
                className="w-full bg-forest text-forest-foreground hover:bg-forest/90"
              >
                {resetBusy ? "Sending…" : "Send reset link"}
              </Button>
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setResetMode("none")}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Back to sign in
                </button>
                <button
                  type="button"
                  onClick={() => setResetMode("confirm")}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Already have a token?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-token">Reset token</Label>
                <Input
                  id="reset-token"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste token from email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-new-password">New password</Label>
                <Input
                  id="reset-new-password"
                  type="password"
                  required
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <Button
                type="submit"
                disabled={resetBusy}
                className="w-full bg-forest text-forest-foreground hover:bg-forest/90"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {resetBusy ? "Updating…" : "Set new password"}
              </Button>
              <button
                type="button"
                onClick={() => setResetMode("none")}
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
