import { connectDb } from "../src/lib/db/connect";
import { Product } from "../src/lib/db/models/product";
import { Variant } from "../src/lib/db/models/variant";
import { Order } from "../src/lib/db/models/order";
import { Payment } from "../src/lib/db/models/payment";
import { Counter } from "../src/lib/db/models/counter";

function mapProductStatus(status?: string) {
  if (!status) return "draft";
  const s = status.toLowerCase();
  if (s === "published" || s === "active" || s === "live") return "published";
  if (s === "archived") return "archived";
  return status;
}

function mapOrderStatus(status?: string) {
  if (!status) return "pending";
  return status.toLowerCase();
}

export async function migrateFromSupabase(supabaseClient?: any) {
  await connectDb();
  
  let products = [];
  let orders = [];
  
  if (supabaseClient) {
    // Try common patterns
    if (supabaseClient.from) {
      const productsRes = await supabaseClient.from("products").select("*");
      products = productsRes.data || [];
      const ordersRes = await supabaseClient.from("orders").select("*");
      orders = ordersRes.data || [];
    } else if (supabaseClient.products) {
      products = supabaseClient.products || [];
      orders = supabaseClient.orders || [];
    }
  }
  
  let productCount = 0;
  let variantCount = 0;
  
  for (const legacyProduct of products) {
    const externalRef = legacyProduct.id || legacyProduct.externalRef || legacyProduct._id;
    if (externalRef) {
      const existing = await Product.findOne({ externalRef });
      if (existing) {
        continue; // idempotent
      }
    }
    
    const product = await Product.create({
      name: legacyProduct.name || legacyProduct.title,
      slug: legacyProduct.slug || legacyProduct.name?.toLowerCase().replace(/\s+/g, "-"),
      description: legacyProduct.description,
      status: mapProductStatus(legacyProduct.status),
      category: legacyProduct.category,
      price: legacyProduct.price,
      images: legacyProduct.images || [],
      externalRef: externalRef?.toString(),
    });
    productCount++;
    
    const variant = await Variant.create({
      productId: product._id,
      sku: legacyProduct.sku || `${legacyProduct.slug || product._id}-default`,
      price: legacyProduct.price || legacyProduct.variant_price,
      stock: legacyProduct.stock || 0,
      lowStockThreshold: legacyProduct.lowStockThreshold ?? legacyProduct.threshold ?? 5,
      status: mapProductStatus(legacyProduct.status),
      externalRef: externalRef?.toString() ? `${externalRef}-variant` : undefined,
    });
    variantCount++;
  }
  
  let orderCount = 0;
  let paymentCount = 0;
  
  for (const legacyOrder of orders) {
    const externalRef = legacyOrder.id || legacyOrder.externalRef || legacyOrder.order_id;
    if (externalRef) {
      const existing = await Order.findOne({ externalRef });
      if (existing) {
        continue; // idempotent
      }
    }
    
    const order = await Order.create({
      orderNumber: legacyOrder.order_number || legacyOrder.orderNumber,
      status: mapOrderStatus(legacyOrder.status),
      total: legacyOrder.total || legacyOrder.amount,
      customer: legacyOrder.customer || legacyOrder.customer_info,
      items: legacyOrder.items || [],
      externalRef: externalRef?.toString(),
    });
    orderCount++;
    
    await Payment.create({
      orderId: order._id,
      amount: legacyOrder.total || legacyOrder.amount,
      status: mapOrderStatus(legacyOrder.payment_status || legacyOrder.status),
      provider: legacyOrder.payment_provider || "flutterwave",
      externalRef: externalRef?.toString() ? `${externalRef}-payment` : undefined,
    });
    paymentCount++;
  }
  
  // Seed counters past legacy max
  const maxOrderId = orders.length > 0 ? orders.length : 0;
  await Counter.findByIdAndUpdate("order", { seq: maxOrderId }, { upsert: true });
  await Counter.findByIdAndUpdate("custom_request", { seq: maxOrderId }, { upsert: true });
  
  return {
    products: productCount,
    variants: variantCount,
    orders: orderCount,
    payments: paymentCount,
  };
}

export default migrateFromSupabase;

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateFromSupabase()
    .then((result) => {
      console.log("Migration complete:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
