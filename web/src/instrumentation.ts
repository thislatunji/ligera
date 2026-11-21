export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.ENABLE_SCHEDULER !== "false") {
    const { registerScheduler } = await import("@/lib/jobs/scheduler");
    registerScheduler();
  }
}
