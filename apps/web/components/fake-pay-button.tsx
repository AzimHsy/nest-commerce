"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Posts to the storefront's own /api/fake-pay server route (which holds the
// webhook secret and signs the callback) — the browser never sees the secret.
export function FakePayButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    setError(null);
    setPaying(true);
    const res = await fetch("/api/fake-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (res.ok) {
      router.refresh(); // re-fetch the order server-side → status shows PAID
    } else {
      const body = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(body?.message ?? `Payment failed (${res.status})`);
      setPaying(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={pay}
        disabled={paying}
        className="bg-gray-900 text-white rounded-md px-4 py-2 disabled:bg-gray-400"
      >
        {paying ? "Paying…" : "Fake Pay"}
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
