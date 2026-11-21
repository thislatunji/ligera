import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";

export async function suggest(q: string) {
  await connectDb();
  if (!q || q.trim().length < 2) {
    return [];
  }
  const query = q.trim();
  // Try text search first, fallback to regex
  let products = await Product.find(
    { status: "published", $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(8)
    .lean();

  if (products.length === 0) {
    products = await Product.find({
      status: "published",
      name: { $regex: query, $options: "i" },
    })
      .limit(8)
      .lean();
  }

  return products.slice(0, 8).map((p: any) => {
    const img = p.images && p.images[0];
    let imageUrl = "";
    if (img?.publicId) {
      imageUrl = `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/${img.publicId}.jpg`;
    } else if (typeof img === "string") {
      imageUrl = img;
    }
    return {
      slug: p.slug,
      name: p.name,
      imageUrl,
    };
  });
}
