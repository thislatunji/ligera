import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Category } from "@/lib/db/models/category";
import { ProductQuery } from "@/lib/api/schemas/catalog";

function getBadge(product: any, variants: any[]) {
  if (product.madeToOrder) return "made_to_order";
  let totalAvailable = 0;
  let hasLowStock = false;
  for (const v of variants) {
    if (v.active === false) continue;
    const available = (v.stockQty || 0) - (v.heldQty || 0);
    totalAvailable += available;
    if (available > 0 && available <= (v.lowStockThreshold || 5)) {
      hasLowStock = true;
    }
  }
  if (totalAvailable <= 0) return "sold_out";
  if (hasLowStock) return "low_stock";
  return "in_stock";
}

function resolveImageUrl(img: any, width: number): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (typeof img.publicId === "string" && img.publicId.length > 0) {
    if (/^(https?:\/\/|\/|data:)/.test(img.publicId)) {
      return img.publicId;
    }
    return `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_${width}/${img.publicId}.jpg`;
  }
  if (typeof img.url === "string") {
    return img.url;
  }
  return "";
}

function buildImageUrl(product: any) {
  if (product.images && product.images.length > 0) {
    return resolveImageUrl(product.images[0], 400);
  }
  return "";
}

export async function listProducts(query: Partial<ProductQuery>) {
  await connectDb();
  const parsed = ProductQuery.parse(query);

  const filter: any = { status: "published" };

  // Category filter by slug
  if (parsed.category) {
    const cat = await Category.findOne({ slug: parsed.category, active: true });
    if (cat) {
      filter.categoryId = cat._id;
    } else {
      return { data: [], meta: { page: parsed.page, limit: parsed.limit, total: 0 } };
    }
  }

  // Space filter
  if (parsed.space) {
    const space = await Category.findOne({ slug: parsed.space, type: "space", active: true });
    if (space) {
      filter.spaceTagIds = { $in: [space._id] };
    } else {
      return { data: [], meta: { page: parsed.page, limit: parsed.limit, total: 0 } };
    }
  }

  // Text search
  if (parsed.q) {
    filter.$text = { $search: parsed.q };
  }

  // Price range on effective price - need to consider variants
  if (parsed.minPrice !== undefined || parsed.maxPrice !== undefined) {
    const priceFilter: any = {};
    if (parsed.minPrice !== undefined) priceFilter.$gte = parsed.minPrice;
    if (parsed.maxPrice !== undefined) priceFilter.$lte = parsed.maxPrice;
    filter.minPrice = priceFilter;
  }

  let sort: any = {};
  if (parsed.sort === "newest") {
    sort = { createdAt: -1 };
  } else if (parsed.sort === "price-asc") {
    sort = { minPrice: 1 };
  } else if (parsed.sort === "price-desc") {
    sort = { minPrice: -1 };
  } else if (parsed.sort === "popular") {
    sort = { popularity: -1 };
  }

  const skip = (parsed.page - 1) * parsed.limit;
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(parsed.limit).lean(),
    Product.countDocuments(filter),
  ]);

  const productIds = products.map((p: any) => p._id);
  const categoryIds = products.map((p: any) => p.categoryId).filter(Boolean);
  const [variants, cats] = await Promise.all([
    Variant.find({ productId: { $in: productIds }, active: true }).lean(),
    categoryIds.length > 0 ? Category.find({ _id: { $in: categoryIds } }).lean() : Promise.resolve([]),
  ]);

  const categoryMap = new Map<string, any>();
  for (const c of cats as any[]) {
    categoryMap.set(c._id.toString(), c);
  }

  const variantsByProduct: Record<string, any[]> = {};
  for (const v of variants) {
    const key = v.productId.toString();
    if (!variantsByProduct[key]) variantsByProduct[key] = [];
    variantsByProduct[key].push(v);
  }

  const data = products.map((product: any) => {
    const pVariants = variantsByProduct[product._id.toString()] || [];
    // compute priceFrom as min effective price
    let priceFrom = product.minPrice || 0;
    if (pVariants.length > 0) {
      let min = Infinity;
      for (const v of pVariants) {
        const eff = v.salePrice != null ? v.salePrice : v.price;
        if (eff < min) min = eff;
      }
      if (min !== Infinity) priceFrom = min;
    }
    const totalAvailable = product.madeToOrder
      ? 99
      : pVariants.reduce(
          (sum: number, v: any) => sum + Math.max(0, (v.stockQty || 0) - (v.heldQty || 0)),
          0
        );
    const cat = product.categoryId ? categoryMap.get(product.categoryId.toString()) : undefined;
    const notesFromScent = [
      ...(product.scentNotes?.top || []),
      ...(product.scentNotes?.heart || []),
      ...(product.scentNotes?.base || []),
    ].join(" · ");
    const badge = getBadge(product, pVariants);
    const img = product.images && product.images[0];
    return {
      id: product._id.toString(),
      variantId: pVariants[0]?._id?.toString(),
      slug: product.slug,
      name: product.name,
      notes: product.description || notesFromScent,
      category: cat?.name || "Candles",
      categorySlug: cat?.slug,
      price: priceFrom,
      priceFrom,
      stock: totalAvailable,
      badge,
      imageUrl: buildImageUrl(product),
      imageAlt: img?.alt || product.name,
    };
  });

  return {
    data,
    meta: {
      page: parsed.page,
      limit: parsed.limit,
      total,
    },
  };
}

export async function getProductBySlug(slug: string) {
  await connectDb();
  const product = await Product.findOne({ slug, status: "published" }).lean();
  if (!product) return null;

  const variants = await Variant.find({ productId: product._id }).sort({ createdAt: 1 }).lean();
  const pVariants = variants.map((v: any) => {
    const available = (v.stockQty || 0) - (v.heldQty || 0);
    return {
      id: v._id.toString(),
      label: v.label,
      price: v.price,
      salePrice: v.salePrice ?? null,
      available,
      lowStock: available > 0 && available <= (v.lowStockThreshold || 5),
      soldOut: available <= 0,
    };
  });

  // pairsWith
  let pairsWith: any[] = [];
  if (product.pairsWith && product.pairsWith.length > 0) {
    const pairs = await Product.find({ _id: { $in: product.pairsWith }, status: "published" }).lean();
    const pairIds = pairs.map((p: any) => p._id);
    const pairVariants = await Variant.find({ productId: { $in: pairIds }, active: true }).lean();
    const pvByProd: Record<string, any[]> = {};
    for (const v of pairVariants) {
      const key = v.productId.toString();
      if (!pvByProd[key]) pvByProd[key] = [];
      pvByProd[key].push(v);
    }
    pairsWith = pairs.map((p: any) => {
      const pvs = pvByProd[p._id.toString()] || [];
      let priceFrom = p.minPrice || 0;
      if (pvs.length > 0) {
        let min = Infinity;
        for (const v of pvs) {
          const eff = v.salePrice != null ? v.salePrice : v.price;
          if (eff < min) min = eff;
        }
        if (min !== Infinity) priceFrom = min;
      }
      return {
        id: p._id.toString(),
        slug: p.slug,
        name: p.name,
        priceFrom,
        badge: getBadge(p, pvs),
        imageUrl: buildImageUrl(p),
        imageAlt: p.images?.[0]?.alt || p.name,
      };
    });
  }

  const allVariantsForBadge = await Variant.find({ productId: product._id, active: true }).lean();
  const badge = getBadge(product, allVariantsForBadge);

  let priceFrom = product.minPrice || 0;
  if (allVariantsForBadge.length > 0) {
    let min = Infinity;
    for (const v of allVariantsForBadge) {
      const eff = v.salePrice != null ? v.salePrice : v.price;
      if (eff < min) min = eff;
    }
    if (min !== Infinity) priceFrom = min;
  }

  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    priceFrom,
    badge,
    imageUrl: buildImageUrl(product),
    imageAlt: product.images?.[0]?.alt || product.name,
    description: product.description || "",
    scentNotes: product.scentNotes || { top: [], heart: [], base: [] },
    ingredients: product.ingredients || "",
    safetyInfo: product.safetyInfo || "",
    burnTime: product.burnTime || "",
    dimensions: product.dimensions || "",
    finish: product.finish || "",
    madeToOrder: product.madeToOrder || false,
    leadTimeDays: product.leadTimeDays || 0,
    images:
      product.images?.map((img: any) => ({
        url: resolveImageUrl(img, 1200),
        alt: img.alt,
        width: img.width || 1200,
        height: img.height || 1200,
      })) || [],
    variants: pVariants,
    pairsWith,
    seo: product.seo || { title: product.name, metaDescription: product.description || "" },
  };
}

export async function getCategories(type?: string) {
  await connectDb();
  const filter: any = { active: true };
  if (type) filter.type = type;
  const cats = await Category.find(filter).sort({ sortOrder: 1 }).lean();
  return cats.map((c: any) => ({
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    type: c.type,
    description: c.description,
    image: c.image,
    sortOrder: c.sortOrder,
  }));
}
