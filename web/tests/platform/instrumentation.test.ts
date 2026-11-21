import { describe, it, expect, vi, beforeEach } from "vitest";

describe("instrumentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("registers scheduler when not disabled", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    delete process.env.ENABLE_SCHEDULER;
    const registerScheduler = vi.fn();
    vi.doMock("@/lib/jobs/scheduler", () => ({
      registerScheduler,
    }));
    const { register } = await import("../../instrumentation");
    await register();
    expect(registerScheduler).toHaveBeenCalled();
  });

  it("skips when ENABLE_SCHEDULER=false", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    process.env.ENABLE_SCHEDULER = "false";
    const registerScheduler = vi.fn();
    vi.doMock("@/lib/jobs/scheduler", () => ({
      registerScheduler,
    }));
    const { register } = await import("../../instrumentation");
    await register();
    expect(registerScheduler).not.toHaveBeenCalled();
  });
});
