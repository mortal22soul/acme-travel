"use client";

import { Field, FormFeedback } from "@/components/ui/fields";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, readError } from "@/lib/api";
import { useFormRequest, valueOf } from "@/lib/use-form-request";

export default function CreateItinerary({ id, agentId }: { id: number; agentId: number }) {
  const { user, isReady, error } = useAuth();
  const form = useFormRequest(async (fields, element) => {
    const result = await apiFetch("/itineraries", { method: "POST", body: JSON.stringify({
      tripId: id, day: Number(valueOf(fields, "day")), activity: valueOf(fields, "activity"),
    }) });
    if (!result.ok) throw new Error(await readError(result, "Unable to add the itinerary entry"));
    element.reset();
    return "Itinerary entry added.";
  });
  if (!isReady) return <p role="status">Checking your account…</p>;
  if (error) return <p role="alert" className="status-error">{error}</p>;
  if (!user || (user.role !== "admin" && user.agentId !== agentId)) return <p>The trip owner can add itinerary entries.</p>;
  return <form className="panel grid gap-4" onSubmit={form.onSubmit} aria-busy={form.pending}>
    <Field label="Day" name="day" type="number" step="1" min="1" max="365" defaultValue="1" required />
    <label className="field-label">Activity<textarea className="field-input" name="activity" rows={5} minLength={2} maxLength={500} required /></label>
    <FormFeedback error={form.error} success={form.success} />
    <div className="flex flex-wrap gap-2">
      <button className="action" type="submit" disabled={form.pending}>{form.pending ? "Adding…" : "Add itinerary entry"}</button>
      <a className="secondary-action" href={`/destinations/${id}`}>Back to trip</a>
    </div>
  </form>;
}
