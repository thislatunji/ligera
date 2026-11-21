import { describe, it, expect, vi, beforeEach } from "vitest";
import cron from "node-cron";
import { registerScheduler } from "@/lib/jobs/scheduler";

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

describe("registerScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("registers both cron jobs exactly once", async () => {
    const { registerScheduler: register } = await import("@/lib/jobs/scheduler");
    register();
    register();
    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });

  it("job wrapper catches errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    vi.doMock("node-cron", () => ({
      default: {
        schedule: vi.fn((cronExpression: string, fn: any) => {
          return { cronExpression, fn };
        }),
      },
    }));
    vi.doMock("@/lib/services/checkout/hold-release", () => ({
      releaseExpiredHolds: vi.fn().mockRejectedValue(new Error("fail")),
    }));
    vi.doMock("@/lib/services/notifications/queue", () => ({
      processNotificationQueue: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/db/connect", () => ({
      connectDb: vi.fn().mockResolvedValue(undefined),
    }));
    const { registerScheduler: register } = await import("@/lib/jobs/scheduler");
    const cronMod = await import("node-cron");
    register();
    // Run the first scheduled job
    const calls = (cronMod.default.schedule as any).mock.calls;
    if (calls.length > 0) {
      await calls[0][1]();
    }
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
