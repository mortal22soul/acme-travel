"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, FormFeedback } from "@/components/ui/fields";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, parseResponse } from "@/lib/api";
import { trip } from "@/lib/contracts";
import { todayUtc, tripImage } from "@/lib/format";
import { useFormRequest, valueOf } from "@/lib/use-form-request";

export default function AddDestination() {
  const { user, isReady, error } = useAuth();
  const router = useRouter();
  const [type, setType] = useState("one-way");
  const [departure, setDeparture] = useState("");
  const form = useFormRequest(async (fields) => {
    const images = valueOf(fields, "images").split(/[\n,]+/).map(url => url.trim()).filter(Boolean);
    if (images.length < 1 || images.length > 8 || images.some(url => !tripImage(url))) {
      throw new Error("Enter between one and eight Pexels or Unsplash photo URLs.");
    }
    const response = await apiFetch("/trips", { method: "POST", body: JSON.stringify({
      destination: valueOf(fields, "destination"), origin: valueOf(fields, "origin"),
      departureDate: departure, returnDate: type === "round-trip" ? valueOf(fields, "returnDate") : null,
      price: valueOf(fields, "price"), availableSeats: Number(valueOf(fields, "availableSeats")), type, images,
    }) });
    const created = await parseResponse(response, trip, "Unable to create the destination");
    router.push(`/destinations/${created.id}`);
    return "Destination published.";
  });
  if (!isReady) return <p role="status">Checking your account…</p>;
  if (error) return <p role="alert" className="status-error">{error}</p>;
  if (!user?.agentId || user.role !== "agent") return <p>Use an <Link href="/user" className="text-primary underline">agent account</Link> to publish a destination.</p>;
  return <form onSubmit={form.onSubmit} className="panel grid gap-4" aria-busy={form.pending}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Destination" name="destination" minLength={2} maxLength={100} required />
      <Field label="Origin" name="origin" minLength={2} maxLength={100} required />
    </div>
    <label className="field-label">Trip type
      <select className="field-input" name="type" value={type} onChange={event => setType(event.target.value)}>
        <option value="one-way">One-way</option><option value="round-trip">Round trip</option>
      </select>
    </label>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Departure date" name="departureDate" type="date" min={new Date(new Date(todayUtc()).getTime() + 86400000).toISOString().slice(0, 10)}
        value={departure} onChange={event => setDeparture(event.target.value)} required />
      {type === "round-trip" && <Field label="Return date" name="returnDate" type="date" min={departure || undefined} required />}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Price per traveler (USD)" name="price" type="number" step="0.01" min="0.01" max="9999999999.99" required />
      <Field label="Available seats" name="availableSeats" type="number" step="1" min="0" max="100000" required />
    </div>
    <label className="field-label">Photo URLs
      <textarea className="field-input" name="images" maxLength={8000} rows={3} aria-describedby="photo-help" required />
    </label>
    <p id="photo-help" className="text-sm text-muted-foreground">Use one to eight Pexels or Unsplash image links, separated by new lines.</p>
    <FormFeedback error={form.error} success={form.success} />
    <button className="action" type="submit" disabled={form.pending}>{form.pending ? "Publishing…" : "Publish destination"}</button>
  </form>;
}
