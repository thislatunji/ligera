import type { Metadata } from "next";
import { LigeraAdminProvider } from "@/components/ligera-admin/LigeraAdminContext";
import { LigeraAdminShell } from "@/components/ligera-admin/LigeraAdminShell";

export const metadata: Metadata = {
  title: {
    default: "Ligera",
    template: "%s · Ligera",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function LigeraPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <LigeraAdminProvider>
      <LigeraAdminShell>{children}</LigeraAdminShell>
    </LigeraAdminProvider>
  );
}
