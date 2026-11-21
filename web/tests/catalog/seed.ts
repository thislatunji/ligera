import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Category } from "@/lib/db/models/category";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function seedCatalog() {
  await connectDb();

  // Get categories and spaces
  const catCandles = await Category.findOne({ slug: "scented-candles" });
  const catDiffusers = await Category.findOne({ slug: "reed-diffusers" });
  const catSprays = await Category.findOne({ slug: "room-linen-sprays" });
  const catGypsum = await Category.findOne({ slug: "gypsum-decor" });
  const catGifts = await Category.findOne({ slug: "gift-sets-bundles" });
  const catCustom = await Category.findOne({ slug: "custom-bespoke" });
  const spaceBedroom = await Category.findOne({ slug: "bedroom" });
  const spaceLiving = await Category.findOne({ slug: "living-room" });
  const spaceBathroom = await Category.findOne({ slug: "bathroom" });
  const spaceKitchen = await Category.findOne({ slug: "kitchen" });
  const spaceOffice = await Category.findOne({ slug: "office" });
  const spaceEntry = await Category.findOne({ slug: "entryway" });
  const spaceEvents = await Category.findOne({ slug: "events" });

  const categories = [catCandles, catDiffusers, catSprays, catGypsum, catGifts, catCustom].filter(Boolean) as any[];

  const productsData = [
    { name: "Lavender Candle", categoryId: catCandles?._id, spaceTagIds: [spaceBedroom?._id, spaceLiving?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Citrus Candle", categoryId: catCandles?._id, spaceTagIds: [spaceKitchen?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Rose Reed Diffuser", categoryId: catDiffusers?._id, spaceTagIds: [spaceBedroom?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Ocean Diffuser", categoryId: catDiffusers?._id, spaceTagIds: [spaceBathroom?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Linen Spray", categoryId: catSprays?._id, spaceTagIds: [spaceBedroom?._id, spaceLiving?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Citrus Spray", categoryId: catSprays?._id, spaceTagIds: [spaceKitchen?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Gypsum Vase", categoryId: catGypsum?._id, spaceTagIds: [spaceLiving?._id, spaceEntry?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Gypsum Tray", categoryId: catGypsum?._id, spaceTagIds: [spaceLiving?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Gift Set A", categoryId: catGifts?._id, spaceTagIds: [spaceEvents?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Gift Set B", categoryId: catGifts?._id, spaceTagIds: [spaceEvents?._id].filter(Boolean), status: "published", madeToOrder: false },
    { name: "Custom Order", categoryId: catCustom?._id, spaceTagIds: [], status: "draft", madeToOrder: true },
    { name: "Archived Product", categoryId: catCandles?._id, spaceTagIds: [], status: "archived", madeToOrder: false },
  ];

  const createdProducts = [];
  for (let i = 0; i < productsData.length; i++) {
    const pd = productsData[i];
    const slug = slugify(pd.name);
    const product = await Product.create({
      name: pd.name,
      slug,
      description: `Description for ${pd.name}`,
      categoryId: pd.categoryId || null,
      spaceTagIds: pd.spaceTagIds || [],
      scentNotes: { top: ["citrus"], heart: ["floral"], base: ["woody"] },
      ingredients: "Soy wax",
      safetyInfo: "Keep away from children",
      burnTime: "45 hours",
      dimensions: "8cm x 8cm",
      finish: "Matte",
      madeToOrder: pd.madeToOrder,
      leadTimeDays: pd.madeToOrder ? 7 : 0,
      status: pd.status,
      images: [
        { publicId: `img1_${i}`, alt: `${pd.name} main`, width: 1200, height: 1200, position: 0 },
        { publicId: `img2_${i}`, alt: `${pd.name} side`, width: 1200, height: 1200, position: 1 },
        { publicId: `img3_${i}`, alt: `${pd.name} detail`, width: 1200, height: 1200, position: 2 },
        { publicId: `img4_${i}`, alt: `${pd.name} back`, width: 1200, height: 1200, position: 3 },
      ],
      pairsWith: [],
      seo: { title: pd.name, metaDescription: `Buy ${pd.name}` },
      popularity: i % 3 === 0 ? 10 : 0,
      featured: i === 0,
      sortOrder: i,
    });
    createdProducts.push(product);
  }

  // Create variants - make one sold-out, one low-stock
  let variantCount = 0;
  for (let i = 0; i < createdProducts.length; i++) {
    const product = createdProducts[i];
    const numVariants = (i % 3) + 1;
    let minPrice = Infinity;
    for (let v = 0; v < numVariants; v++) {
      const label = numVariants === 1 ? "Standard" : v === 0 ? "Small" : v === 1 ? "Medium" : "Large";
      let stockQty = 10;
      let lowStockThreshold = 5;
      // Make product at index 4 sold-out (or specific one)
      if (i === 4 && v === 0) {
        stockQty = 0;
      }
      // Make low stock
      if (i === 5 && v === 0) {
        stockQty = 2;
        lowStockThreshold = 5;
      }
      const price = 5000 + i * 1000 + v * 500;
      const salePrice = v === 0 && i % 2 === 0 ? price - 500 : null;
      const variant = await Variant.create({
        productId: product._id,
        label,
        sku: `SKU-${product.slug.toUpperCase()}-${v + 1}`,
        price,
        salePrice,
        stockQty,
        heldQty: 0,
        lowStockThreshold,
        costPrice: price * 0.4,
        active: true,
      });
      const effectivePrice = salePrice ?? price;
      if (effectivePrice < minPrice) minPrice = effectivePrice;
      variantCount++;
    }
    if (minPrice === Infinity) minPrice = 0;
    await Product.findByIdAndUpdate(product._id, { minPrice });
  }

  return { products: createdProducts };
}
