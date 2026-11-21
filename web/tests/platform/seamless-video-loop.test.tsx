/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { SeamlessVideoLoop } from "@/components/SeamlessVideoLoop";

describe("SeamlessVideoLoop", () => {
  let playMock: ReturnType<typeof vi.fn>;
  let pauseMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined);
    pauseMock = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      writable: true,
      value: playMock,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      writable: true,
      value: pauseMock,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("sets poster, muted, defaultMuted, and playsInline on primary video and omits standby src initially", () => {
    const { container } = render(
      <SeamlessVideoLoop src="/hero-video.mp4" poster="/hero-poster.jpg" />,
    );
    const videos = Array.from(container.querySelectorAll("video"));
    expect(videos).toHaveLength(2);

    const [primary, standby] = videos;
    expect(primary.getAttribute("src")).toBe("/hero-video.mp4");
    expect(primary.getAttribute("poster")).toBe("/hero-poster.jpg");
    expect(primary.muted).toBe(true);
    expect(primary.defaultMuted).toBe(true);
    expect(primary.playsInline).toBe(true);
    expect(primary.hasAttribute("muted")).toBe(true);
    expect(primary.hasAttribute("playsinline")).toBe(true);

    expect(standby.hasAttribute("src")).toBe(false);
    expect(standby.getAttribute("preload")).toBe("none");
  });

  it("retries play() when canplay fires on a paused primary video", () => {
    const { container } = render(<SeamlessVideoLoop src="/hero-video.mp4" />);
    const [primary] = Array.from(container.querySelectorAll("video"));

    playMock.mockClear();
    Object.defineProperty(primary, "paused", { configurable: true, get: () => true });

    act(() => {
      primary.dispatchEvent(new Event("canplay"));
    });

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock.mock.instances[0]).toBe(primary);
  });

  it("attaches src to the standby video only after canplaythrough fires on primary", () => {
    const { container } = render(<SeamlessVideoLoop src="/hero-video.mp4" />);
    const [primary, standby] = Array.from(container.querySelectorAll("video"));

    expect(standby.hasAttribute("src")).toBe(false);

    act(() => {
      primary.dispatchEvent(new Event("canplaythrough"));
    });

    expect(standby.getAttribute("src")).toBe("/hero-video.mp4");
    expect(standby.getAttribute("preload")).toBe("auto");
  });

  it("restarts the primary video on ended when standby is not buffered (readyState === 0)", () => {
    const { container } = render(<SeamlessVideoLoop src="/hero-video.mp4" />);
    const [primary, standby] = Array.from(container.querySelectorAll("video"));

    expect(standby.readyState).toBe(0);
    primary.currentTime = 9.5;
    playMock.mockClear();

    act(() => {
      primary.dispatchEvent(new Event("ended"));
    });

    expect(primary.currentTime).toBe(0);
    expect(primary.style.opacity).toBe("1");
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock.mock.instances[0]).toBe(primary);
  });
});
