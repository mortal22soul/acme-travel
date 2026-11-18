"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconCheck, IconCreditCard, IconLockOpen, IconShoppingBag, IconTrash } from "@tabler/icons-react";
import TripPhoto from "@/components/destinations/TripPhoto";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { apiFetch, parseResponse } from "@/lib/api";
import { checkoutReceipt, trip, type Trip } from "@/lib/contracts";
import { formatDate, formatMoney, todayUtc, tripImage } from "@/lib/format";

const paymentMethods = ["credit card", "debit card", "net banking"] as const;
const savedOrder = z.object({
  key: z.uuid(), fingerprint: z.string(), body: z.string(), method: z.enum(paymentMethods),
  expires: z.number().int(),
});
type SavedOrder = z.infer<typeof savedOrder>;
type Quote = { id: number; trip: Trip | null };

function newOrder(fingerprint: string, body: string, method: SavedOrder["method"]): SavedOrder {
  return { key: crypto.randomUUID(), fingerprint, body, method, expires: Date.now() + 86400000 };
}

function readOrder(key: string): SavedOrder | null {
  try {
    const order = savedOrder.parse(JSON.parse(localStorage.getItem(key) ?? "null"));
    return order.expires > Date.now() ? order : null;
  } catch { return null; }
}

export default function CartPage() {
  const { user, error: sessionError } = useAuth();
  const { items, ready, canImport, importBrowserCart, updateTravelers, removeItem, clearCart } = useCart();
  const [method, setMethod] = useState<(typeof paymentMethods)[number]>("credit card");
  const [quote, setQuote] = useState<Quote[] | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [paid, setPaid] = useState(false);
  const [retry, setRetry] = useState(0);
  const [previous, setPrevious] = useState<SavedOrder | null>(null);
  const paying = useRef(false);
  const orderStorage = `acme:checkout:${user?.id ?? "guest"}`;
  const quantities = items.map(item => ({ tripId: item.tripId, travelers: item.travelers })).sort((a, b) => a.tripId - b.tripId);
  const fingerprint = JSON.stringify({ items: quantities, paymentMethod: method });
  const retryOrder = previous?.fingerprint === fingerprint ? previous : null;
  const tripIds = items.map(item => item.tripId).join(",");

  useEffect(() => {
    const stored = readOrder(orderStorage);
    setPrevious(stored);
    if (stored) setMethod(stored.method);
  }, [orderStorage]);

  useEffect(() => {
    setQuote(null);
    setQuoteError("");
    if (!tripIds) return;
    const controller = new AbortController();
    void Promise.all(tripIds.split(",").map(async value => {
      const id = Number(value);
      const response = await apiFetch(`/trips/${id}`, { signal: controller.signal });
      return { id, trip: response.status === 404 ? null : await parseResponse(response, trip, "Unable to refresh availability") };
    })).then(setQuote).catch((failure: unknown) => {
      if (!controller.signal.aborted) setQuoteError(failure instanceof Error ? failure.message : "Unable to refresh availability");
    });
    return () => controller.abort();
  }, [tripIds, retry]);

  const current = new Map(quote?.map(row => [row.id, row.trip]));
  const availability = items.map(item => {
    const live = current.get(item.tripId);
    const unavailable = quote && (!live || live.availableSeats < item.travelers || live.departureDate <= todayUtc());
    return { item, live, unavailable };
  });
  const total = availability.reduce((sum, { item, live }) => sum + Number(live?.price ?? item.price) * item.travelers, 0);
  const canPay = !!user?.customerId && (retryOrder || (quote && !availability.some(row => row.unavailable)));

  function storeOrder(order: SavedOrder | null) {
    setPrevious(order);
    try {
      if (order) localStorage.setItem(orderStorage, JSON.stringify(order));
      else localStorage.removeItem(orderStorage);
    } catch { /* Retain the key in memory for the current tab. */ }
  }

  async function pay() {
    if (!canPay || paying.current) return;
    paying.current = true;
    setPending(true);
    setError("");
    const body = JSON.stringify({ items: quantities.map(item => ({ ...item, expectedPrice: current.get(item.tripId)?.price })), paymentMethod: method });
    const order = retryOrder ?? newOrder(fingerprint, body, method);
    storeOrder(order);
    try {
      const response = await apiFetch("/checkout", {
        method: "POST", headers: { "Idempotency-Key": order.key }, body: order.body,
      });
      if ([400, 403, 404, 409].includes(response.status)) {
        storeOrder(null);
        setRetry(value => value + 1);
      }
      await parseResponse(response, checkoutReceipt, "Unable to complete checkout");
      storeOrder(null);
      clearCart();
      setPaid(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to complete checkout");
    } finally {
      paying.current = false;
      setPending(false);
    }
  }

  if (paid) return <section className="travel-page px-4 py-16">
    <div className="travel-surface mx-auto max-w-xl rounded-3xl p-8 text-center shadow-xl shadow-blue-950/10 sm:p-10">
      <div className="travel-cyan travel-cyan-wash mx-auto grid size-16 place-items-center rounded-full">
        <IconCheck size={34} aria-hidden="true" />
      </div>
      <p role="status" className="travel-cyan mt-5 text-sm font-semibold uppercase tracking-[0.2em]">Mock payment approved</p>
      <h1 className="mt-2 text-3xl font-bold">Your trips are confirmed</h1>
      <p className="mt-3 text-muted-foreground">This was a simulated payment. No financial details were collected or stored.</p>
      <Link href="/user" className="action mt-7">View my bookings</Link>
    </div>
  </section>;

  return <section className="travel-page">
    <div className="page-shell max-w-6xl space-y-5">
      <Link href="/destinations" className="travel-blue mb-1 inline-flex min-h-8 items-center gap-2 text-sm font-semibold hover:underline">
        <IconArrowLeft size={17} aria-hidden="true" /> Keep exploring
      </Link>
      <header className="travel-surface rounded-3xl p-6 shadow-xl shadow-blue-950/5 sm:p-7">
        <p className="travel-cyan flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em]">
          <IconShoppingBag size={16} aria-hidden="true" /> Trip cart
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Ready when you are</h1>
        <p className="mt-3 text-muted-foreground">Review your journeys, choose traveler counts, then complete a simulated checkout.</p>
      </header>
      {sessionError && <p role="alert" className="status-error">{sessionError}</p>}
      {!ready && <p role="status">Loading your cart…</p>}
      {canImport && <button className="secondary-action" type="button" onClick={importBrowserCart}>Import saved trips from this browser</button>}
      {ready && items.length === 0 && <div className="travel-surface rounded-3xl p-8 text-center shadow-lg sm:p-10">
        <IconShoppingBag className="travel-cyan mx-auto" size={38} aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">Find a trip you love and add it here.</p>
        <Link href="/destinations" className="action mt-6">Explore trips</Link>
      </div>}
      {items.length > 0 && <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <ul className="grid gap-4">
          {availability.map(({ item, live, unavailable }) => {
            const photo = tripImage(live?.images[0] ?? item.image);
            return <li className="travel-surface flex gap-4 rounded-3xl p-4 shadow-lg shadow-blue-950/5 sm:p-5" key={item.tripId}>
              {photo && <div className="travel-blue-wash relative hidden h-28 w-36 shrink-0 overflow-hidden rounded-2xl sm:block">
                <TripPhoto src={photo} alt="" sizes="144px" />
              </div>}
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-lg font-bold">{live?.destination ?? item.destination}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">From {live?.origin ?? item.origin} · Departs {formatDate(live?.departureDate ?? item.departureDate)}</p>
                  </div>
                  <button type="button" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-60"
                    disabled={pending || !!retryOrder} onClick={() => removeItem(item.tripId)} aria-label={`Remove ${item.destination}`}>
                    <IconTrash size={20} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">Travelers
                    <input type="number" min="1" max="10" step="1" inputMode="numeric" disabled={pending || !!retryOrder} className="field-input w-20 px-2 text-center"
                      aria-label={`Travelers for ${item.destination}`} value={item.travelers} onChange={event => updateTravelers(item.tripId, event.target.valueAsNumber)} />
                  </label>
                  <span className="travel-blue font-bold">{formatMoney(Number(live?.price ?? item.price) * item.travelers)}</span>
                </div>
                {unavailable && <p className="text-sm text-destructive">This trip has fewer seats than requested or is no longer bookable.</p>}
                {live && Number(live.price) !== item.price && <p className="text-sm text-muted-foreground">The price has changed since this trip was added.</p>}
              </div>
            </li>;
          })}
        </ul>
        <aside className="travel-surface space-y-4 rounded-3xl p-6 shadow-xl shadow-blue-950/10">
          <h2 className="text-xl font-bold">Mock checkout</h2>
          {quote && <dl className="travel-tint-border space-y-2 border-y py-4">
            <div className="flex justify-between gap-2 text-muted-foreground"><dt>Trip total</dt><dd>{formatMoney(total)}</dd></div>
            <div className="flex justify-between gap-2 text-lg font-bold"><dt>Due today</dt><dd>{formatMoney(total)}</dd></div>
          </dl>}
          {!quote && !quoteError && <p role="status">Checking prices and seats…</p>}
          {quoteError && <div className="space-y-2">
            <p role="alert" className="status-error">{quoteError}</p>
            <button type="button" className="secondary-action" onClick={() => setRetry(value => value + 1)}>Check again</button>
          </div>}
          <fieldset className="grid gap-2" disabled={pending || !!retryOrder}>
            <legend className="mb-2 text-sm font-semibold">Simulated payment method</legend>
            {paymentMethods.map(option => <label key={option} className={`travel-tint-border flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 capitalize ${method === option ? "travel-cyan-wash" : "bg-card"}`}>
              <input type="radio" name="payment-method" value={option} checked={method === option} onChange={() => setMethod(option)} /> {option}
            </label>)}
          </fieldset>
          <p className="travel-blue-wash flex gap-2 rounded-xl p-3 text-sm text-muted-foreground">
            <IconLockOpen className="travel-blue shrink-0" size={18} aria-hidden="true" />
            Demo only. Checkout collects no bank or card details.
          </p>
          {!user && <Link href="/login" className="action w-full">Sign in to check out</Link>}
          {user?.role === "customer" && !user.customerId && <Link href="/user" className="action w-full">Complete your traveler profile</Link>}
          {user?.customerId && <button type="button" className="action w-full" disabled={!canPay || pending} onClick={() => void pay()}>
            <IconCreditCard size={18} aria-hidden="true" /> {pending ? "Processing…" : retryOrder ? "Retry checkout" : `Pay ${formatMoney(total)} (mock)`}
          </button>}
          {user && user.role !== "customer" && <p className="text-sm text-muted-foreground">Checkout is available through a customer account.</p>}
          <p role="alert" className="status-error">{error}</p>
          {retryOrder && !pending && <p role="status" className="text-sm">The last checkout is awaiting confirmation. Retry it to use the same order.</p>}
        </aside>
      </div>}
    </div>
  </section>;
}
