"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json.error || "Sign in failed.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-me"] });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-16">
      <h1 className="font-display text-4xl">Studio admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to manage products and orders.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}

