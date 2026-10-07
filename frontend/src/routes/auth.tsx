import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — Ligeria" },
      { name: "description", content: "Sign in to the Ligeria studio admin." },
      { property: "og:title", content: "Admin sign in — Ligeria" },
      { property: "og:description", content: "Sign in to the Ligeria studio admin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    setBusy(false);
    if (res.error) return setMsg(res.error.message);
    if (mode === "up" && !res.data.session) return setMsg("Check your email to confirm your account.");
    navigate({ to: "/admin" });
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-16">
      <h1 className="font-display text-4xl">Studio admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "in" ? "Sign in to manage products and orders." : "Create your admin account."}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button
        className="mt-4 text-sm text-muted-foreground underline"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "Need an account? Create one" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
