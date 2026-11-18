"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useAuth } from "./AuthContext";

const itemSchema = z.object({
  tripId: z.number().int().positive(),
  destination: z.string(),
  origin: z.string(),
  departureDate: z.string().transform(value => value.slice(0, 10)).pipe(z.iso.date()),
  image: z.string().optional(),
  price: z.number().nonnegative(),
  travelers: z.number().int().min(1).max(10),
});
const cartSchema = z.array(itemSchema).max(20);
export type CartItem = z.infer<typeof itemSchema>;

type CartContextValue = {
  ready: boolean;
  items: CartItem[];
  itemCount: number;
  addItem: (item: Omit<CartItem, "travelers">) => void;
  updateTravelers: (tripId: number, travelers: number) => void;
  removeItem: (tripId: number) => void;
  clearCart: () => void;
  canImport: boolean;
  importBrowserCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const guestKey = "acme:cart:guest";
const legacyKey = "acme:cart";

function readCart(key: string) {
  try {
    const parsed = cartSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? "[]"));
    return parsed.success ? [...new Map(parsed.data.map(item => [item.tripId, item])).values()] : [];
  } catch { return []; }
}

function joinCarts(current: CartItem[], imported: CartItem[]) {
  const merged = new Map(current.map(item => [item.tripId, item]));
  for (const item of imported) {
    const previous = merged.get(item.tripId);
    if (previous) merged.set(item.tripId, { ...previous, travelers: Math.min(10, previous.travelers + item.travelers) });
    else if (merged.size < 20) merged.set(item.tripId, item);
  }
  return [...merged.values()];
}

export function CartProvider({ children, storageKey = guestKey, enabled = true }: {
  children: React.ReactNode; storageKey?: string; enabled?: boolean;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const ready = enabled && loaded;

  useEffect(() => {
    if (!enabled) return;
    setItems(readCart(storageKey));
    setCanImport(storageKey !== guestKey && (readCart(guestKey).length > 0 || readCart(legacyKey).length > 0));
    setLoaded(true);
    const sync = (event: StorageEvent) => { if (event.key === storageKey) setItems(readCart(storageKey)); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey, enabled]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* Keep the cart in memory. */ }
  }, [ready, storageKey, items]);

  const value = useMemo<CartContextValue>(() => ({
    ready, items, canImport,
    itemCount: items.reduce((total, item) => total + item.travelers, 0),
    addItem: item => setItems(current => joinCarts(current, [{ ...item, travelers: 1 }])),
    updateTravelers: (id, quantity) => setItems(current => current.map(item => item.tripId === id
      ? { ...item, travelers: Math.max(1, Math.min(10, Number.isFinite(quantity) ? Math.trunc(quantity) : 1)) }
      : item)),
    removeItem: id => setItems(current => current.filter(item => item.tripId !== id)),
    clearCart: () => setItems([]),
    importBrowserCart: () => {
      const browser = joinCarts(readCart(guestKey), readCart(legacyKey));
      setItems(current => joinCarts(current, browser));
      try {
        localStorage.removeItem(guestKey);
        localStorage.removeItem(legacyKey);
      } catch { /* Storage is optional. */ }
      setCanImport(false);
    },
  }), [ready, items, canImport]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function AccountCart({ children }: { children: React.ReactNode }) {
  const { isReady, user } = useAuth();
  const key = user ? `acme:cart:user:${user.id}` : guestKey;
  // The key resets the cart state immediately on an account switch.
  return <CartProvider key={key} storageKey={key} enabled={isReady}>{children}</CartProvider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
