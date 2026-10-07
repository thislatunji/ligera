import { queryOptions } from "@tanstack/react-query";
import { listProducts } from "./shop.functions";
import type { Product } from "./products";

export const productsQuery = queryOptions<Product[]>({
  queryKey: ["products"],
  queryFn: () => listProducts(),
});
