import Link from "next/link";
import { apiFetch } from "../lib/api";
import { formatRM } from "../lib/format";
import type { Product } from "../lib/types";

export default async function HomePage() {
  const products = await apiFetch<Product[]>("/products");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Products</h1>
      {products.length === 0 && (
        <p className="text-gray-500">No products yet.</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p) => {
          const prices = p.variants.map((v) => v.priceSen);
          const inStock = p.variants.some((v) => v.stockQty > 0);
          return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-gray-400"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-gray-500 text-sm mt-1">
                {prices.length > 0
                  ? `from ${formatRM(Math.min(...prices))}`
                  : "No variants"}
              </div>
              {!inStock && (
                <div className="text-gray-400 text-sm mt-1">Sold out</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
