import { connectDb } from "@/lib/db/connect";
import { ContentPage } from "@/lib/db/models/contentPage";
import { ActivityLog } from "@/lib/db/models/activityLog";
import mongoose from "mongoose";

const ALLOWED_SLUGS = ["our-story", "faqs", "delivery-returns", "privacy", "terms", "returns", "candle-safety"];

function sanitizeMarkdownLite(text: string) {
  if (!text) return text;
  // Strip raw HTML/script tags
  let cleaned = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  return cleaned;
}

function resolveImages(sections: any[]) {
  return (sections || []).map((s) => {
    if (s.image && s.image.publicId) {
      // For tests and general case, just pass through; could construct URL
      return {
        ...s,
        image: {
          url: s.image.url || `/images/${s.image.publicId}.jpg`,
          alt: s.image.alt || "",
        },
      };
    }
    if (s.image === null) {
      return { ...s, image: undefined };
    }
    return { ...s };
  });
}

export async function listContentPages() {
  await connectDb();
  const pages = await ContentPage.find({}).sort({ slug: 1 }).lean();
  return pages;
}

export async function getContentPage(slug: string, forAdmin = false) {
  await connectDb();
  const normalized = slug.toLowerCase();
  if (!ALLOWED_SLUGS.includes(normalized)) {
    const err: any = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const page = await ContentPage.findOne({ slug: normalized }).lean();
  if (!page) {
    const err: any = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (forAdmin) {
    return page;
  }
  // Public view
  return {
    slug: page.slug,
    title: page.title,
    sections: resolveImages(
      (page.sections || []).map((s: any) => ({
        heading: s.heading || "",
        body: sanitizeMarkdownLite(s.body || ""),
        image: s.image
          ? { url: s.image.url || `/images/${s.image.publicId}.jpg`, alt: s.image.alt || "" }
          : undefined,
      }))
    ),
    seo: page.seo || { title: "", metaDescription: "" },
    updatedAt: page.updatedAt?.toISOString ? page.updatedAt.toISOString() : page.updatedAt,
  };
}

export async function updateContentPage(slug: string, input: any, userId: string) {
  await connectDb();
  const normalized = slug.toLowerCase();
  if (!ALLOWED_SLUGS.includes(normalized)) {
    const err: any = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  // Validate alt text required if image present
  if (input.sections) {
    for (const s of input.sections) {
      if (s.image && s.image.publicId) {
        if (!s.image.alt || s.image.alt.trim().length === 0) {
          const err: any = new Error("Alt text required");
          err.code = "VALIDATION_ERROR";
          throw err;
        }
      }
    }
  }
  const before = await ContentPage.findOne({ slug: normalized }).lean();
  const updated = await ContentPage.findOneAndUpdate(
    { slug: normalized },
    {
      $set: {
        title: input.title,
        sections: (input.sections || []).map((s: any) => ({
          heading: s.heading || "",
          body: sanitizeMarkdownLite(s.body || ""),
          image: s.image && s.image.publicId ? { publicId: s.image.publicId, alt: s.image.alt } : null,
        })),
        seo: input.seo || { title: "", metaDescription: "" },
        updatedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    { new: true, upsert: true }
  ).lean();
  try {
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action: "content.update",
      entity: { type: "content_page", id: normalized },
      before,
      after: updated,
    });
  } catch (e) {}
  return updated;
}
