"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "../../components/cart";
import { apiFetch, ApiError } from "../../lib/api";
import type { Order } from "../../lib/types";

export default function CheckoutPage() {
  const { lines, clear } = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (lines.length === 0) {
    return <p className="text-gray-500">Your cart is empty.</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // The API validates stock and voucher, and computes all totals.
      const order = await apiFetch<Order>("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          ...(voucherCode.trim() ? { voucherCode: voucherCode.trim() } : {}),
        }),
      });
      clear();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Checkout</h1>
      <form onSubmit={submit} className="flex flex-col gap-3 max-w-md">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Voucher code (optional)</span>
          <input
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2"
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-gray-900 text-white rounded-md px-4 py-2 disabled:bg-gray-400"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </form>
    </div>
  );
}
