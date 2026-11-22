"use client";

import { EmailHistoryPanel } from "@/components/admin/EmailHistoryPanel";
import { EmailTemplatesTab } from "@/components/admin/EmailTemplatesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LigeraEmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Communications</p>
        <h1 className="mt-1 font-display text-3xl text-forest">Emails &amp; Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect delivery status, preview rendered HTML emails, resend failures, and customize
          notification wording.
        </p>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Delivery History</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <EmailHistoryPanel />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
