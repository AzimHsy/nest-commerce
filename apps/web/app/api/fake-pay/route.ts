import { createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

// Simulates the payment gateway's server calling our API's webhook.
// This route runs server-side only: WEBHOOK_SECRET is a server env var
// (no NEXT_PUBLIC_ prefix), so the signing key never reaches the browser.
export async function POST(request: Request) {
  const { orderId } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
  };
  if (!orderId) {
    return NextResponse.json({ message: "orderId required" }, { status: 400 });
  }

  const secret = process.env.WEBHOOK_SECRET;
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  if (!secret) {
    return NextResponse.json(
      { message: "WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  // A fresh eventId per click — replaying the SAME event is the API's
  // idempotency concern (covered by its e2e tests); each user click is a
  // distinct delivery, like a gateway retry with a new event.
  const body = JSON.stringify({ eventId: randomUUID(), orderId });
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  const res = await fetch(`${apiUrl}/webhooks/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-signature": signature,
    },
    body,
  });

  const payload: unknown = await res.json().catch(() => ({}));
  return NextResponse.json(payload, { status: res.status });
}
