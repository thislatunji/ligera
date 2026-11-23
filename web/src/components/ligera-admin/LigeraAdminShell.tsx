"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChevronRight,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  Users,
} from "lucide-react";
import mark from "@/assets/ligera-mark-gold.png";
import type { AdminUser } from "@/lib/admin/client";
import { useLigeraAdmin } from "./LigeraAdminContext";
import { StealthLoginView } from "./StealthLoginView";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function ShellContent({ user, children }: { user: AdminUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isOwner, badges, signOut } = useLigeraAdmin();
  const { setOpenMobile } = useSidebar();
  const [commandOpen, setCommandOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut for fast navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const sections: NavSection[] = useMemo(() => {
    const raw: NavSection[] = [
      {
        title: "Overview",
        items: [{ label: "Dashboard", href: "/ligera", icon: LayoutDashboard, ownerOnly: true }],
      },
      {
        title: "Catalog",
        items: [
          {
            label: "Products",
            href: "/ligera/products",
            icon: Package,
            badge: badges.lowStockCount || undefined,
          },
          { label: "Categories", href: "/ligera/categories", icon: Tag, ownerOnly: true },
          { label: "Site Media", href: "/ligera/images", icon: ImageIcon },
        ],
      },
      {
        title: "Commerce",
        items: [
          {
            label: "Orders",
            href: "/ligera/orders",
            icon: ShoppingCart,
            badge: badges.pendingOrders || undefined,
          },
          {
            label: "Custom Orders",
            href: "/ligera/custom-requests",
            icon: Sparkles,
            ownerOnly: true,
            badge: badges.newCustomRequests || undefined,
          },
          { label: "Customers", href: "/ligera/customers", icon: Users, ownerOnly: true },
          { label: "Delivery", href: "/ligera/delivery", icon: Truck, ownerOnly: true },
        ],
      },
      {
        title: "Studio",
        items: [
          { label: "Content Pages", href: "/ligera/content", icon: FileText, ownerOnly: true },
          { label: "Emails & Logs", href: "/ligera/emails", icon: Mail, ownerOnly: true },
          { label: "Activity Log", href: "/ligera/activity", icon: History, ownerOnly: true },
          { label: "Settings", href: "/ligera/settings", icon: Settings, ownerOnly: true },
        ],
      },
    ];

    return raw
      .map((s) => ({
        ...s,
        items: s.items.filter((item) => !item.ownerOnly || isOwner),
      }))
      .filter((s) => s.items.length > 0);
  }, [isOwner, badges]);

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  const activeItem = flatItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/ligera" && pathname.startsWith(`${item.href}/`)),
  );

  const initials = (user.name || user.email || "LG")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  const navigate = (href: string) => {
    setCommandOpen(false);
    setOpenMobile(false);
    router.push(href);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <Link href="/ligera" className="flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gold/40 bg-forest-foreground/5 p-1.5">
              <Image src={mark} alt="Ligera" width={40} height={40} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl tracking-[0.2em] text-sidebar-foreground uppercase">
                Ligera
              </p>
              <p className="text-[10px] tracking-[0.22em] text-gold uppercase">Atelier</p>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          {sections.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel className="px-3 text-[10px] tracking-[0.22em] text-sidebar-foreground/55 uppercase">
                {section.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/ligera" && pathname.startsWith(`${item.href}/`));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          onClick={() => setOpenMobile(false)}
                          className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                            isActive
                              ? "bg-gold font-medium text-ink hover:bg-gold/90 hover:text-ink"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          }`}
                        >
                          <Link href={item.href} className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.badge !== undefined && item.badge > 0 && (
                          <SidebarMenuBadge
                            className={
                              isActive
                                ? "bg-forest text-forest-foreground"
                                : "bg-gold/20 text-gold"
                            }
                          >
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-forest-foreground/5 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/25 text-xs font-semibold text-gold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
              <p className="truncate text-[10px] tracking-wider text-sidebar-foreground/65 uppercase">
                {user.role}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Storefront
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-sidebar-foreground/80 transition-colors hover:bg-destructive/20 hover:text-sidebar-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex min-h-screen flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 rounded-md p-2 hover:bg-secondary" />
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/ligera">Ligera</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {activeItem && (
                  <>
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeItem.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="gap-2 text-xs text-muted-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Quick jump</span>
              <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium md:inline">
                ⌘K
              </kbd>
            </Button>

            {isOwner && (
              <Button
                type="button"
                size="sm"
                onClick={() => navigate("/ligera/products?new=1")}
                className="gap-1.5 bg-forest text-xs text-forest-foreground hover:bg-forest/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New product</span>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Jump to a section or action…" />
        <CommandList>
          <CommandEmpty>No matching section.</CommandEmpty>
          <CommandGroup heading="Workspace">
            {flatItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <CommandShortcut>{item.badge}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
          {isOwner && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => navigate("/ligera/products?new=1")}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Upload New Product</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate("/ligera/categories?new=1")}>
                  <Tag className="mr-2 h-4 w-4" />
                  <span>Create Category</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate("/ligera/delivery?new=1")}>
                  <Truck className="mr-2 h-4 w-4" />
                  <span>Add Delivery Zone</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false);
                    window.open("/api/admin/orders/export.csv", "_blank");
                  }}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  <span>Export Orders CSV</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export function LigeraAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authChecked } = useLigeraAdmin();

  // If an unauthenticated visitor attempts to access a sub-path client-side, return to /ligera
  useEffect(() => {
    if (authChecked && !user && pathname !== "/ligera") {
      router.replace("/ligera");
    }
  }, [authChecked, user, pathname, router]);

  if (!authChecked) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="text-xs tracking-[0.2em] uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <StealthLoginView />;
  }

  return (
    <SidebarProvider>
      <ShellContent user={user}>{children}</ShellContent>
    </SidebarProvider>
  );
}
