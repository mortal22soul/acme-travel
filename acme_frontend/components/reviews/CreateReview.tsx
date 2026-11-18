"use client";

import Link from "next/link";
import { Field, FormFeedback } from "@/components/ui/fields";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, readError } from "@/lib/api";
import { useFormRequest, valueOf } from "@/lib/use-form-request";

export default function CreateReview({ id }: { id: number }) {
  const { user, isReady, error } = useAuth();
  const form = useFormRequest(async (fields) => {
    const result = await apiFetch("/reviews", { method: "POST", body: JSON.stringify({
      tripId: id, rating: Number(valueOf(fields, "rating")), title: valueOf(fields, "title"), comment: valueOf(fields, "comment"),
    }) });
    if (!result.ok) throw new Error(await readError(result, "Unable to post the review"));
    window.location.replace(`/destinations/${id}`);
    return "Review published.";
  });
  if (!isReady) return <p role="status">Checking your account…</p>;
  if (error) return <p role="alert" className="status-error">{error}</p>;
  if (!user?.customerId) return <p>Use a <Link href="/user" className="text-primary underline">customer account</Link> to write a review.</p>;
  return <form className="panel grid gap-4" onSubmit={form.onSubmit} aria-busy={form.pending}>
    <fieldset className="flex flex-wrap gap-3">
      <legend className="mb-2 font-medium">Rating</legend>
      {[1, 2, 3, 4, 5].map(rating => <label key={rating} className="secondary-action">
        <input type="radio" name="rating" value={rating} required /> {rating}
      </label>)}
    </fieldset>
    <Field label="Title" name="title" minLength={2} maxLength={120} required />
    <label className="field-label">Comment<textarea className="field-input" name="comment" rows={5} minLength={2} maxLength={1500} required /></label>
    <FormFeedback error={form.error} success={form.success} />
    <button className="action" type="submit" disabled={form.pending}>{form.pending ? "Publishing…" : "Publish review"}</button>
  </form>;
}
