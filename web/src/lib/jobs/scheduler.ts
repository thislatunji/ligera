import cron from "node-cron";
import { releaseExpiredHolds } from "@/lib/services/checkout/hold-release";
import { connectDb } from "@/lib/db/connect";
import { processNotificationQueue } from "@/lib/services/notifications/queue";

let registered = false;

export function registerScheduler() {
  if (registered) {
    return;
  }

  const jobWrapper = (fn: () => Promise<void> | void) => {
    return async () => {
      try {
        await connectDb();
        await fn();
      } catch (error) {
        console.error("Scheduler job failed:", error);
      }
    };
  };

  // release-expired-holds every minute
  cron.schedule("* * * * *", jobWrapper(async () => {
    await releaseExpiredHolds();
  }));

  // process-notification-queue every 30 seconds
  try {
    cron.schedule("*/30 * * * * *", jobWrapper(async () => {
      await processNotificationQueue();
    }));
  } catch (e) {
    cron.schedule("* * * * *", jobWrapper(async () => {
      await processNotificationQueue();
    }));
  }

  registered = true;
}
