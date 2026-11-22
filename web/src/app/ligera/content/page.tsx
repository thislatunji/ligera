"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/admin/client";
import { MediaUploader } from "@/components/ligera-admin/MediaUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EDITORIAL_PAGES = [
  { slug: "our-story", label: "Our Story" },
  { slug: "faqs", label: "FAQs" },
  { slug: "delivery-returns", label: "Delivery & Returns" },
  { slug: "candle-safety", label: "Candle Safety" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms & Conditions" },
] as const;

type EditableSection = {
  heading: string;
  body: string;
  image: { publicId: string; alt: string } | null;
};

export default function LigeraContentPage() {
  const qc = useQueryClient();
  const [activeSlug, setActiveSlug] = useState<string>("our-story");
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["ligera-content-page", activeSlug],
    queryFn: async () => {
      try {
        return await adminApi.getContentPage(activeSlug);
      } catch (err) {
        if (err instanceof AdminApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
  });

  useEffect(() => {
    const label = EDITORIAL_PAGES.find((p) => p.slug === activeSlug)?.label || activeSlug;
    if (page === undefined) return;
    if (page === null) {
      setTitle(label);
      setSections([{ heading: "", body: "", image: null }]);
      setSeoTitle("");
      setSeoDescription("");
      return;
    }

    setTitle(page.title || label);
    setSections(
      (page.sections || []).map((s: any) => ({
        heading: s.heading || "",
        body: s.body || "",
        image: s.image?.publicId
          ? { publicId: s.image.publicId, alt: s.image.alt || label }
          : s.image?.url
            ? { publicId: s.image.url, alt: s.image.alt || label }
            : null,
      })),
    );
    setSeoTitle(page.seo?.title || "");
    setSeoDescription(page.seo?.metaDescription || "");
  }, [page, activeSlug]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updateContentPage(activeSlug, {
        title: title.trim(),
        sections: sections.map((s) => ({
          heading: s.heading.trim(),
          body: s.body,
          image: s.image?.publicId
            ? {
                publicId: s.image.publicId,
                alt: s.image.alt?.trim() || title.trim() || "Section image",
              }
            : null,
        })),
        seo: {
          title: seoTitle.slice(0, 70),
          metaDescription: seoDescription.slice(0, 160),
        },
      }),
    onSuccess: () => {
      toast.success("Content page saved");
      qc.invalidateQueries({ queryKey: ["ligera-content-page", activeSlug] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveSection = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= sections.length) return;
    const copy = [...sections];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    setSections(copy);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Editorial CMS</p>
        <h1 className="mt-1 font-display text-3xl text-forest">Content Pages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit copy, sections, imagery, and SEO metadata for Ligera’s informational and policy pages.
        </p>
      </div>

      {/* Slug selector */}
      <div className="flex flex-wrap gap-2">
        {EDITORIAL_PAGES.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setActiveSlug(p.slug)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeSlug === p.slug
                ? "border-forest bg-forest text-forest-foreground"
                : "border-border bg-card text-muted-foreground hover:border-forest hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading page…</p>
      ) : error ? (
        <p className="py-12 text-center text-sm text-destructive">
          Could not load content page.
        </p>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) {
              toast.error("Page title is required.");
              return;
            }
            saveMutation.mutate();
          }}
        >
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="font-display text-xl">Page Header &amp; SEO</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Page title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">SEO title</Label>
                  <span className="text-[11px] text-muted-foreground">{seoTitle.length}/70</span>
                </div>
                <Input
                  maxLength={70}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">Meta description</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {seoDescription.length}/160
                  </span>
                </div>
                <Input
                  maxLength={160}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Sections ({sections.length})</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSections((prev) => [...prev, { heading: "", body: "", image: null }])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add section
              </Button>
            </div>

            {sections.map((sec, idx) => (
              <Card key={idx} className="border-border/70">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-forest uppercase">
                      Section {idx + 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === sections.length - 1}
                        onClick={() => moveSection(idx, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          setSections((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Heading</Label>
                    <Input
                      value={sec.heading}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, heading: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="Section heading or FAQ question"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Body copy</Label>
                    <Textarea
                      rows={4}
                      value={sec.body}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, body: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="Write section paragraphs…"
                    />
                  </div>

                  <MediaUploader
                    mode="single"
                    label="Optional section image"
                    value={sec.image}
                    onChange={(img) =>
                      setSections((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, image: img } : row)),
                      )
                    }
                    defaultAlt={sec.heading || title || "Content section"}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-forest text-forest-foreground hover:bg-forest/90"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving…" : "Save page"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
