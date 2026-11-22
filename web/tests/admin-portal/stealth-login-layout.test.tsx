/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mockUseLigeraAdmin = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/image", () => ({
  default: ({ src, alt, priority: _priority, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/ligera",
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/components/ligera-admin/LigeraAdminContext", () => ({
  useLigeraAdmin: () => mockUseLigeraAdmin(),
}));

import { LigeraAdminShell } from "@/components/ligera-admin/LigeraAdminShell";

describe("LigeraAdminShell & StealthLoginView layout", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("centers StealthLoginView across full viewport width outside SidebarProvider when unauthenticated", () => {
    mockUseLigeraAdmin.mockReturnValue({
      user: null,
      authChecked: true,
      isOwner: false,
      isStaff: false,
      badges: { pendingOrders: 0, newCustomRequests: 0, lowStockCount: 0, failedPayments: 0 },
      setAuthenticatedUser: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(
      <LigeraAdminShell>
        <div>Protected Dashboard</div>
      </LigeraAdminShell>,
    );

    expect(container.querySelector(".group\\/sidebar-wrapper")).toBeNull();
    expect(screen.queryByText("Protected Dashboard")).toBeNull();

    const heading = screen.getByRole("heading", { level: 1, name: /Ligera/i });
    const outerWrapper = container.firstElementChild as HTMLElement;
    expect(outerWrapper).not.toBeNull();
    expect(outerWrapper.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["flex", "min-h-screen", "w-full", "items-center", "justify-center"]),
    );

    const cardContainer = heading.closest(".max-w-md") as HTMLElement;
    expect(cardContainer).not.toBeNull();
    expect(cardContainer.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["w-full", "max-w-md"]),
    );
  });

  it("centers loading state across full viewport width outside SidebarProvider while checking session", () => {
    mockUseLigeraAdmin.mockReturnValue({
      user: null,
      authChecked: false,
      isOwner: false,
      isStaff: false,
      badges: { pendingOrders: 0, newCustomRequests: 0, lowStockCount: 0, failedPayments: 0 },
      setAuthenticatedUser: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(
      <LigeraAdminShell>
        <div>Protected Dashboard</div>
      </LigeraAdminShell>,
    );

    expect(container.querySelector(".group\\/sidebar-wrapper")).toBeNull();
    expect(screen.getByText(/Loading/i)).toBeDefined();

    const loadingWrapper = container.firstElementChild as HTMLElement;
    expect(loadingWrapper).not.toBeNull();
    expect(loadingWrapper.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["flex", "min-h-screen", "w-full", "items-center", "justify-center"]),
    );
  });

  it("mounts SidebarProvider wrapper and renders children when authenticated", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockUseLigeraAdmin.mockReturnValue({
      user: {
        id: "1",
        name: "Admin",
        email: "admin@ligerascents.com",
        role: "owner",
      },
      authChecked: true,
      isOwner: true,
      isStaff: false,
      badges: { pendingOrders: 0, newCustomRequests: 0, lowStockCount: 0, failedPayments: 0 },
      setAuthenticatedUser: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(
      <LigeraAdminShell>
        <div>Protected Dashboard</div>
      </LigeraAdminShell>,
    );

    expect(container.querySelector(".group\\/sidebar-wrapper")).not.toBeNull();
    expect(screen.getByText("Protected Dashboard")).toBeDefined();
  });
});
