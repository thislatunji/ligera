/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

vi.mock("@/components/SeamlessVideoLoop", () => ({
  SeamlessVideoLoop: ({ src, poster, className }: any) => (
    <video src={src} poster={poster} className={className} />
  ),
}));

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CarouselContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CarouselItem: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CarouselPrevious: () => null,
  CarouselNext: () => null,
}));

import Home from "@/app/page";
import { CartProvider } from "@/lib/cart";

async function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const page = await Home();

  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>{page}</CartProvider>
    </QueryClientProvider>,
  );
}

describe("Home #story section", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lays the three craft icons in one row on mobile, uses pouring/leaf/amphora icons, and places the full story button below", async () => {
    await renderHome();

    const storySection = document.querySelector("section#story") as HTMLElement | null;
    expect(storySection).not.toBeNull();
    const story = storySection!;

    const pillarsGrid = within(story).getByTestId("story-pillars");
    expect(pillarsGrid.className.split(/\s+/)).toContain("grid-cols-3");

    const headings = Array.from(pillarsGrid.querySelectorAll("h3")).map((el) =>
      el.textContent?.trim(),
    );
    expect(headings).toEqual(["Hand-poured", "Softly composed", "Sculpted vessels"]);

    expect(pillarsGrid.querySelectorAll("p")).toHaveLength(0);
    expect(within(story).queryByText("Small batches, cotton wicks.")).toBeNull();
    expect(within(story).queryByText("Layered notes that linger.")).toBeNull();
    expect(within(story).queryByText("Gypsum & glass forms.")).toBeNull();

    const pillarItems = Array.from(pillarsGrid.children) as HTMLElement[];
    expect(pillarItems).toHaveLength(3);

    const [handPoured, softlyComposed, sculptedVessels] = pillarItems;

    expect(handPoured.querySelector('svg[data-icon="pouring"]')).not.toBeNull();
    expect(story.querySelector("svg.lucide-flame")).toBeNull();

    expect(softlyComposed.querySelector("svg.lucide-leaf")).not.toBeNull();

    expect(sculptedVessels.querySelector("svg.lucide-amphora")).not.toBeNull();
    expect(story.querySelector("svg.lucide-sparkles")).toBeNull();

    const fullStoryLink = within(story).getByRole("link", { name: "Read our full story" });
    expect(fullStoryLink.className.split(/\s+/)).toContain("btn-gold");
    expect(fullStoryLink.getAttribute("href")).toBe("/our-story");
    expect(
      pillarsGrid.compareDocumentPosition(fullStoryLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
