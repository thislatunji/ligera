import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Category } from "@/lib/db/models/category";

export async function exportCsv() {
  await connectDb();
  const products = await Product.find({}).lean();
  const variants = await Variant.find({}).lean();
  const categories = await Category.find({}).lean();
  const catMap = new Map(categories.map((c: any) => [c._id.toString(), c]));

  const headers = ["product_name", "product_slug", "category", "status", "sku", "variant_label", "price", "sale_price", "stock_qty", "low_stock_threshold"];
  const rows = [headers.join(",")];

  const vByProd: Record<string, any[]> = {};
  for (const v of variants) {
    const key = v.productId.toString();
    if (!vByProd[key]) vByProd[key] = [];
    vByProd[key].push(v);
  }

  for (const product of products) {
    const pVars = vByProd[product._id.toString()] || [];
    const cat = product.categoryId ? catMap.get(product.categoryId.toString()) : null;
    if (pVars.length === 0) {
      rows.push([
        escapeCsv(product.name),
        escapeCsv(product.slug),
        escapeCsv(cat?.name || ""),
        escapeCsv(product.status),
        "",
        "",
        "",
        "",
        "",
        "",
      ].join(","));
    } else {
      for (const v of pVars) {
        rows.push([
          escapeCsv(product.name),
          escapeCsv(product.slug),
          escapeCsv(cat?.name || ""),
          escapeCsv(product.status),
          escapeCsv(v.sku),
          escapeCsv(v.label),
          v.price ?? "",
          v.salePrice ?? "",
          v.stockQty ?? 0,
          v.lowStockThreshold ?? 5,
        ].join(","));
      }
    }
  }
  return rows.join("\n");
}

function escapeCsv(field: any) {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function importCsv(csvContent: string, fileSize?: number) {
  await connectDb();
  if (fileSize && fileSize > 5 * 1024 * 1024) {
    const err: any = new Error("File too large");
    err.code = "IMPORT_ERROR";
    err.status = 400;
    throw err;
  }

  const lines = csvContent.split(/\r?\n/);
  if (lines.length === 0) {
    return { created: 0, updated: 0, failed: 0, failures: [] };
  }

  // Skip header
  const dataLines = lines.slice(1).filter((l) => l.trim());
  if (dataLines.length > 2000) {
    const err: any = new Error("Too many rows");
    err.code = "IMPORT_ERROR";
    err.status = 400;
    throw err;
  }

  let created = 0,
    updated = 0,
    failed = 0;
  const failures: any[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    try {
      const cols = parseCsvLine(line);
      const [product_name, product_slug, category, status, sku, variant_label, price, sale_price, stock_qty, low_stock_threshold] = cols;

      if (!sku) {
        failed++;
        failures.push({ row: i + 2, error: "Missing SKU" });
        continue;
      }

      let product = null;
      if (product_slug) {
        product = await Product.findOne({ slug: product_slug });
      }
      if (!product && product_name) {
        product = await Product.findOne({ name: product_name });
      }

      if (!product) {
        // create new product
        const slug = product_slug || product_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        product = await Product.create({
          name: product_name || slug,
          slug,
          description: "",
          status: status === "published" || status === "draft" || status === "archived" ? status : "draft",
          images: [],
        });
        created++;
      } else {
        updated++;
      }

      let variant = await Variant.findOne({ sku: sku.toUpperCase() });
      if (variant) {
        if (price) variant.price = parseInt(price);
        if (sale_price) variant.salePrice = parseInt(sale_price) || null;
        if (stock_qty !== undefined && stock_qty !== "") variant.stockQty = parseInt(stock_qty) || 0;
        if (low_stock_threshold) variant.lowStockThreshold = parseInt(low_stock_threshold) || 5;
        await variant.save();
        updated++;
      } else {
        await Variant.create({
          productId: product._id,
          label: variant_label || "Standard",
          sku: sku.toUpperCase(),
          price: price ? parseInt(price) : 0,
          salePrice: sale_price ? parseInt(sale_price) : null,
          stockQty: stock_qty ? parseInt(stock_qty) : 0,
          heldQty: 0,
          lowStockThreshold: low_stock_threshold ? parseInt(low_stock_threshold) : 5,
          costPrice: 0,
          active: true,
        });
        created++;
      }

      // recompute min price
      const variants = await Variant.find({ productId: product._id, active: true }).lean();
      if (variants.length > 0) {
        let min = Infinity;
        for (const v of variants) {
          const eff = v.salePrice != null ? v.salePrice : v.price;
          if (eff < min) min = eff;
        }
        if (min !== Infinity) await Product.findByIdAndUpdate(product._id, { minPrice: min });
      }
    } catch (e: any) {
      failed++;
      failures.push({ row: i + 2, error: e.message || "Import error" });
    }
  }

  return { created, updated, failed, failures };
}

function parseCsvLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
