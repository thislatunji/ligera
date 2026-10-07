import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminMe, useServerFn } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Ligeria" },
      { name: "description", content: "Ligeria studio admin dashboard." },
      { property: "og:title", content: "Admin — Ligeria" },
      { property: "og:description", content: "Ligeria studio admin dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const me = useServerFn(adminMe);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-me"], queryFn: () => me() });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!data?.isAdmin)
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-3xl">Admin access needed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account is signed in but hasn't been approved as an admin yet.
        </p>
        <Button variant="outline" className="mt-6" onClick={signOut}>Sign out</Button>
      </main>
    );

  const tab = "rounded-full px-4 py-2 text-sm transition-colors";
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Studio admin</h1>
        <div className="flex items-center gap-2">
          <Link to="/admin" activeOptions={{ exact: true }} className={tab} activeProps={{ className: "bg-forest text-forest-foreground" }}>
            Products & stock
          </Link>
          <Link to="/admin/orders" className={tab} activeProps={{ className: "bg-forest text-forest-foreground" }}>
            Orders
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </div>
      <div className="mt-8"><Outlet /></div>
    </main>
  );
}
