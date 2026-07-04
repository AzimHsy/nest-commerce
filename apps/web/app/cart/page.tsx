"use client";

import Link from "next/link";
import { useCart } from "../../components/cart";
import { formatRM } from "../../lib/format";

export default function CartPage() {
  const { lines, setQty, remove } = useCart();
  // Display-only subtotal from browse-time prices; the API computes the real
  // totals at checkout.
  const subtotalSen = lines.reduce((n, l) => n + l.priceSen * l.qty, 0);

  if (lines.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Cart</h1>
        <p className="text-gray-500">
          Your cart is empty.{" "}
          <Link href="/" className="underline">
            Browse products
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Cart</h1>
      <div className="flex flex-col gap-2">
        {lines.map((l) => (
          <div
            key={l.variantId}
            className="border border-gray-200 rounded-md p-3 flex items-center justify-between gap-4"
          >
            <div>
              <Link href={`/products/${l.productSlug}`} className="font-medium">
                {l.productName}
              </Link>
              <div className="text-gray-500 text-sm">{l.variantName}</div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={l.qty}
                onChange={(e) => setQty(l.variantId, Number(e.target.value))}
                className="w-16 border border-gray-200 rounded-md px-2 py-1"
              />
              <span>{formatRM(l.priceSen * l.qty)}</span>
              <button
                type="button"
                onClick={() => remove(l.variantId)}
                className="text-gray-500 hover:text-gray-900"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-gray-500">Subtotal: {formatRM(subtotalSen)}</span>
        <Link
          href="/checkout"
          className="bg-gray-900 text-white rounded-md px-4 py-2"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
