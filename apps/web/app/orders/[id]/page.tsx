import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "../../../lib/api";
import { formatRM } from "../../../lib/format";
import type { Order } from "../../../lib/types";
import { FakePayButton } from "../../../components/fake-pay-button";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let order: Order;
  try {
    order = await apiFetch<Order>(`/orders/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Order</h1>
      <p className="text-gray-500 text-sm mt-1">{order.id}</p>

      <p className="mt-4">
        Status:{" "}
        {order.status === "PAID" ? (
          <span className="text-green-600 font-medium">PAID</span>
        ) : (
          <span className="text-gray-500">{order.status}</span>
        )}
      </p>

      <div className="mt-4 border border-gray-200 rounded-lg p-4 max-w-md">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <span>
              {item.qty} × variant {item.variantId.slice(0, 8)}
            </span>
            <span>{formatRM(item.priceSenSnapshot * item.qty)}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 mt-2 pt-2 text-sm flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>{formatRM(order.subtotalSen)}</span>
        </div>
        {order.discountSen > 0 && (
          <div className="text-sm flex justify-between">
            <span className="text-gray-500">Discount</span>
            <span>-{formatRM(order.discountSen)}</span>
          </div>
        )}
        <div className="font-medium flex justify-between mt-1">
          <span>Total</span>
          <span>{formatRM(order.totalSen)}</span>
        </div>
      </div>

      {order.status === "PENDING" && <FakePayButton orderId={order.id} />}
      {order.status === "PAID" && (
        <p className="mt-4 text-green-600">
          Payment received — thank you, {order.customerName}.{" "}
          <Link href="/" className="underline text-gray-900">
            Continue shopping
          </Link>
        </p>
      )}
    </div>
  );
}
