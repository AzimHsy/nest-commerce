"use client";

import { useState } from "react";
import { useCart } from "./cart";
import { formatRM } from "../lib/format";
import type { Product, Variant } from "../lib/types";

// The product page's interactive part: pick a variant, add to cart.
// Stock numbers come from the server-rendered fetch; the API re-validates
// everything at checkout anyway.
export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [selectedId, setSelectedId] = useState<string | null>(
    product.variants.find((v) => v.stockQty > 0)?.id ?? null,
  );
  const [added, setAdded] = useState(false);

  const selected: Variant | undefined = product.variants.find(
    (v) => v.id === selectedId,
  );

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2">
        {product.variants.map((v) => {
          const soldOut = v.stockQty <= 0;
          return (
            <label
              key={v.id}
              className={`border border-gray-200 rounded-md p-3 flex justify-between ${
                soldOut ? "text-gray-400" : "cursor-pointer"
              } ${v.id === selectedId ? "border-gray-900" : ""}`}
            >
              <span>
                <input
                  type="radio"
                  name="variant"
                  className="mr-2"
                  disabled={soldOut}
                  checked={v.id === selectedId}
                  onChange={() => setSelectedId(v.id)}
                />
                {v.name}
                {soldOut ? " — sold out" : ` — ${v.stockQty} in stock`}
              </span>
              <span>{formatRM(v.priceSen)}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          if (!selected) return;
          add({
            variantId: selected.id,
            productSlug: product.slug,
            productName: product.name,
            variantName: selected.name,
            priceSen: selected.priceSen,
          });
          setAdded(true);
        }}
        className="mt-4 bg-gray-900 text-white rounded-md px-4 py-2 disabled:bg-gray-400"
      >
        Add to cart
      </button>
      {added && <p className="text-green-600 mt-2">Added to cart.</p>}
    </div>
  );
}
