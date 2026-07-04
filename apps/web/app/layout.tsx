import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { CartProvider, CartCount } from "../components/cart";

export const metadata: Metadata = {
  title: "nest-commerce",
  description: "Reference storefront for the nest-commerce API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 font-sans">
        <CartProvider>
          <nav className="border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between">
              <Link href="/" className="font-semibold">
                nest-commerce
              </Link>
              <Link href="/cart" className="text-gray-500 hover:text-gray-900">
                <CartCount />
              </Link>
            </div>
          </nav>
          <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
