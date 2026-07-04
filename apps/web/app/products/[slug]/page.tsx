import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "../../../lib/api";
import type { Product } from "../../../lib/types";
import { AddToCart } from "../../../components/add-to-cart";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product: Product;
  try {
    product = await apiFetch<Product>(`/products/${slug}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div>
      <Link href="/" className="text-gray-500 hover:text-gray-900">
        &larr; All products
      </Link>
      <h1 className="text-xl font-semibold mt-4">{product.name}</h1>
      {product.description && (
        <p className="text-gray-500 mt-2">{product.description}</p>
      )}
      <AddToCart product={product} />
    </div>
  );
}
