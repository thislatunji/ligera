"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMe } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

const LOCAL_ADMIN_KEY = "ligera-local-admin-v1";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [localAdmin, setLocalAdmin] = useState(false);
  const [checkedLocal, setCheckedLocal] = useState(false);

  const isLoginPage = pathname === "/admin/login";
  const { data, isLoading } = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => adminMe(),
    enabled: !isLoginPage,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LOCAL_ADMIN_KEY);
      const isLocalHost =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      setLocalAdmin(stored === "1" || (stored === null && isLocalHost));
    } catch {
      setLocalAdmin(false);
    } finally {
      setCheckedLocal(true);
    }
  }, []);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const enableLocalStudio = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCAL_ADMIN_KEY, "1");
      } catch {
        // ignore
      }
    }
    setLocalAdmin(true);
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCAL_ADMIN_KEY, "0");
      } catch {
        // ignore
      }
    }
    setLocalAdmin(false);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    await queryClient.invalidateQueries({ queryKey: ["admin-me"] });
    router.push("/auth");
  };

  if (isLoading || !checkedLocal) {
    return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  }

  if (!data?.isAdmin && !localAdmin) {
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-3xl">Admin access needed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Please sign in with an approved studio admin account to continue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/auth">
            <Button>Sign in</Button>
          </Link>
          <Button variant="outline" onClick={enableLocalStudio}>
            Continue in local studio mode
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  const tab = "rounded-full px-4 py-2 text-sm transition-colors";
  const isProductsActive = pathname === "/admin";
  const isImagesActive = pathname.startsWith("/admin/images");
  const isOrdersActive = pathname.startsWith("/admin/orders");

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Studio admin</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className={`${tab} ${isProductsActive ? "bg-forest text-forest-foreground" : ""}`}
          >
            Products &amp; stock
          </Link>
          <Link
            href="/admin/images"
            className={`${tab} ${isImagesActive ? "bg-forest text-forest-foreground" : ""}`}
          >
            Site images
          </Link>
          <Link
            href="/admin/orders"
            className={`${tab} ${isOrdersActive ? "bg-forest text-forest-foreground" : ""}`}
          >
            Orders
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );
}
