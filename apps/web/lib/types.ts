// Shapes returned by the API. The storefront only displays these — all math
// and validation happen server-side (architecture invariant 6).
export interface Variant {
  id: string;
  sku: string;
  name: string;
  priceSen: number;
  stockQty: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  variants: Variant[];
}

export interface OrderItem {
  id: string;
  variantId: string;
  qty: number;
  priceSenSnapshot: number;
}

export interface Order {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  customerName: string;
  customerEmail: string;
  subtotalSen: number;
  discountSen: number;
  totalSen: number;
  items: OrderItem[];
}
