"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi, type AdminUser } from "@/lib/admin/client";

type NavBadges = {
  pendingOrders: number;
  newCustomRequests: number;
  lowStockCount: number;
  failedPayments: number;
};

type LigeraAdminContextValue = {
  user: AdminUser | null;
  authChecked: boolean;
  isOwner: boolean;
  isStaff: boolean;
  badges: NavBadges;
  setAuthenticatedUser: (user: AdminUser | null) => void;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const LigeraAdminContext = createContext<LigeraAdminContextValue | null>(null);

const EMPTY_BADGES: NavBadges = {
  pendingOrders: 0,
  newCustomRequests: 0,
  lowStockCount: 0,
  failedPayments: 0,
};

export function LigeraAdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const res = await adminApi.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const isOwner = user?.role === "owner";
  const isStaff = user?.role === "staff";

  const { data: snapshot } = useQuery({
    queryKey: ["ligera-admin-nav-badges"],
    queryFn: () => adminApi.dashboard("today"),
    enabled: Boolean(user && isOwner),
    staleTime: 60 * 1000,
    retry: false,
  });

  const badges: NavBadges = snapshot
    ? {
        pendingOrders: snapshot.actionList?.ordersAwaitingProcessing || 0,
        newCustomRequests: snapshot.actionList?.customRequestsNew || 0,
        lowStockCount: snapshot.lowStock?.length || 0,
        failedPayments: snapshot.actionList?.failedOrAbandonedPayments || 0,
      }
    : EMPTY_BADGES;

  const setAuthenticatedUser = useCallback((nextUser: AdminUser | null) => {
    setUser(nextUser);
    setAuthChecked(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await adminApi.logout();
    } catch {
      // Clear local session state regardless of network result
    } finally {
      setUser(null);
      queryClient.clear();
      router.replace("/ligera");
    }
  }, [queryClient, router]);

  return (
    <LigeraAdminContext.Provider
      value={{
        user,
        authChecked,
        isOwner,
        isStaff,
        badges,
        setAuthenticatedUser,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </LigeraAdminContext.Provider>
  );
}

export function useLigeraAdmin() {
  const ctx = useContext(LigeraAdminContext);
  if (!ctx) {
    throw new Error("useLigeraAdmin must be used within LigeraAdminProvider");
  }
  return ctx;
}
