"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Client-side cart only: what the visitor intends to buy. Prices shown here
// are display hints from browse time — the API recomputes everything at
// checkout (invariant 6).
export interface CartLine {
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  priceSen: number;
  qty: number;
}

interface CartApi {
  lines: CartLine[];
  count: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartApi | null>(null);
const STORAGE_KEY = "nest-commerce-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  // localStorage survives reloads; read once on mount. Hydration-safe: the
  // server (and first client paint) must render an empty cart, then fill from
  // storage — the legitimate setState-in-effect case, hence the local disable.
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLines(JSON.parse(raw) as CartLine[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const api = useMemo<CartApi>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      add: (line, qty = 1) =>
        setLines((prev) => {
          const existing = prev.find((l) => l.variantId === line.variantId);
          if (existing) {
            return prev.map((l) =>
              l.variantId === line.variantId ? { ...l, qty: l.qty + qty } : l,
            );
          }
          return [...prev, { ...line, qty }];
        }),
      setQty: (variantId, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.variantId !== variantId)
            : prev.map((l) => (l.variantId === variantId ? { ...l, qty } : l)),
        ),
      remove: (variantId) =>
        setLines((prev) => prev.filter((l) => l.variantId !== variantId)),
      clear: () => setLines([]),
    }),
    [lines],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function CartCount() {
  const { count } = useCart();
  return <span>Cart ({count})</span>;
}
