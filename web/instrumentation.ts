import { registerScheduler } from "@/lib/jobs/scheduler";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.ENABLE_SCHEDULER !== "false") {
    registerScheduler();
  }
}
