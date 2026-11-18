"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import ProfileFields, { profileValues, type ProfileRole } from "@/components/auth/ProfileFields";
import { Field, FormFeedback } from "@/components/ui/fields";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, clearSession, parseResponse, readError } from "@/lib/api";
import { bookingList } from "@/lib/contracts";
import { formatDate, formatMoney } from "@/lib/format";
import { useFormRequest, valueOf } from "@/lib/use-form-request";

type Bookings = z.infer<typeof bookingList>;
function CompleteProfile({ role }: { role: ProfileRole }) {
  const { reload } = useAuth();
  const form = useFormRequest(async (fields) => {
    const response = await apiFetch("/me/profile", { method: "POST", body: JSON.stringify({ role, profile: profileValues(role, fields) }) });
    if (!response.ok) throw new Error(await readError(response, "Unable to save your profile"));
    await reload();
  });
  return <form onSubmit={form.onSubmit} className="panel grid max-w-xl gap-4" aria-busy={form.pending}>
    <h2 className="text-xl font-semibold">Complete your profile</h2>
    <ProfileFields role={role} />
    <FormFeedback error={form.error} />
    <button className="action" type="submit" disabled={form.pending}>{form.pending ? "Saving…" : "Save profile"}</button>
  </form>;
}

function BookingHistory() {
  const [bookings, setBookings] = useState<Bookings | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setBookings(null);
    void apiFetch("/me/bookings", { signal: controller.signal })
      .then(response => parseResponse(response, bookingList, "Unable to load bookings"))
      .then(setBookings).catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to load bookings");
      });
    return () => controller.abort();
  }, [retry]);

  return <section className="space-y-3">
    <h2 className="text-2xl font-semibold">My bookings</h2>
    {error && <div className="space-y-2">
      <p role="alert" className="status-error">{error}</p>
      <button type="button" className="secondary-action" onClick={() => setRetry(value => value + 1)}>Try again</button>
    </div>}
    {!error && !bookings && <p role="status">Loading bookings…</p>}
    {bookings?.length === 0 && <p className="panel">You have no bookings yet. <Link className="text-primary underline" href="/destinations">Explore trips</Link></p>}
    <ul className="grid gap-3">{bookings?.map(booking => <BookingCard key={booking.id} booking={booking} onCanceled={() => {
      setBookings(current => current?.map(row => row.id === booking.id ? { ...row, status: "canceled" } : row) ?? null);
    }} />)}</ul>
  </section>;
}

function BookingCard({ booking, onCanceled }: { booking: Bookings[number]; onCanceled: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const form = useFormRequest(async () => {
    const response = await apiFetch(`/bookings/${booking.id}`, { method: "PUT", body: JSON.stringify({ status: "canceled" }) });
    if (!response.ok) throw new Error(await readError(response, "Unable to cancel booking"));
    onCanceled();
    return "Booking canceled.";
  });
  return <li className="panel space-y-2">
    <h3 className="text-lg font-semibold"><Link href={`/destinations/${booking.tripId}`} className="text-primary underline">{booking.origin} to {booking.destination}</Link></h3>
    <p className="text-muted-foreground">{formatDate(booking.departureDate)} · {booking.travelers} {booking.travelers === 1 ? "traveler" : "travelers"}</p>
    <p className="flex flex-wrap items-center gap-2 font-medium">
      <span className="travel-cyan travel-cyan-wash rounded-full px-3 py-1 text-sm capitalize">{booking.status}</span>
      <span aria-hidden="true">·</span> {formatMoney(booking.totalPrice)}
    </p>
    {booking.status !== "canceled" && (confirm
      ? <form onSubmit={form.onSubmit} className="flex flex-wrap gap-2">
        <button className="action" type="submit" disabled={form.pending}>{form.pending ? "Canceling…" : "Confirm cancellation"}</button>
        <button className="secondary-action" type="button" disabled={form.pending} onClick={() => setConfirm(false)}>Keep booking</button>
      </form>
      : <button className="secondary-action" type="button" onClick={() => setConfirm(true)}>Cancel booking</button>)}
    <FormFeedback error={form.error} success={form.success} />
  </li>;
}

function PasswordChange() {
  const router = useRouter();
  const form = useFormRequest(async (fields) => {
    const response = await apiFetch("/me/password", { method: "PUT", body: JSON.stringify({
      currentPassword: valueOf(fields, "currentPassword"), newPassword: valueOf(fields, "newPassword"),
    }) });
    if (!response.ok) throw new Error(await readError(response, "Unable to change your password"));
    clearSession();
    router.push("/login");
  });
  return <details className="panel max-w-xl">
    <summary className="cursor-pointer font-semibold">Change password</summary>
    <form className="mt-4 grid gap-3" onSubmit={form.onSubmit} aria-busy={form.pending}>
      <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
      <p className="text-sm text-muted-foreground">Changing your password signs out your existing sessions.</p>
      <FormFeedback error={form.error} />
      <button type="submit" className="action" disabled={form.pending}>Save password</button>
    </form>
  </details>;
}

export default function UserPage() {
  const { user, isReady, error, reload } = useAuth();
  const [retryError, setRetryError] = useState("");
  return <section className="travel-page">
    <div className="page-shell max-w-4xl space-y-6">
    <header className="rounded-2xl bg-linear-to-r from-blue-700 to-cyan-700 p-7 text-white shadow-lg sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-100">My account</p>
      <h1 className="mt-1 text-3xl font-bold">{user ? "Welcome back" : "My account"}</h1>
      {user && <p className="mt-3 wrap-anywhere">{user.email} · <span className="capitalize">{user.role}</span></p>}
    </header>
    {!isReady && <p role="status">Loading your account…</p>}
    {(error || retryError) && <div className="space-y-2">
      <p className="status-error" role="alert">{retryError || error}</p>
      <button className="secondary-action" type="button" onClick={() => {
        setRetryError("");
        void reload().catch((failure: unknown) => setRetryError(failure instanceof Error ? failure.message : "Unable to restore your session"));
      }}>Try again</button>
    </div>}
    {isReady && !error && !user && <Link className="action" href="/login">Sign in to view your account</Link>}
    {user && <>
      {user.role === "customer" && (user.customerId ? <BookingHistory key={user.id} /> : <CompleteProfile role="customer" />)}
      {user.role === "agent" && (user.agentId
        ? <Link href="/destinations/new" className="action">Add destination</Link>
        : <CompleteProfile role="agent" />)}
      <PasswordChange />
    </>}
    </div>
  </section>;
}
