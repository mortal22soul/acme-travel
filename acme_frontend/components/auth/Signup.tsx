"use client";

import { useState } from "react";
import { Field, FormFeedback } from "@/components/ui/fields";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, readError } from "@/lib/api";
import { useFormRequest, valueOf } from "@/lib/use-form-request";
import ProfileFields, { profileValues, type ProfileRole } from "./ProfileFields";

export default function Signup() {
  const [role, setRole] = useState<ProfileRole>("customer");
  const { login } = useAuth();
  const form = useFormRequest(async (fields) => {
    const response = await apiFetch("/signup", { method: "POST", body: JSON.stringify({
      firstName: valueOf(fields, "firstName"), lastName: valueOf(fields, "lastName"),
      username: valueOf(fields, "username"), email: valueOf(fields, "email"),
      password: valueOf(fields, "password"), role, profile: profileValues(role, fields),
    }) });
    if (!response.ok) throw new Error(await readError(response, "Unable to create your account"));
    await login();
  });

  return <form onSubmit={form.onSubmit} className="panel travel-tint-border grid gap-4 md:p-8" aria-busy={form.pending}>
    <h1 className="mb-2 text-xl font-bold">Welcome to ACME</h1>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" name="firstName" autoComplete="given-name" maxLength={80} required />
      <Field label="Last name" name="lastName" autoComplete="family-name" maxLength={80} required />
    </div>
    <Field label="Username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={40}
      pattern="[A-Za-z0-9_.\x2d]{3,40}" title="Use letters, numbers, periods, underscores, or hyphens." required />
    <Field label="Email address" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required />
    <label className="field-label">Account type
      <select name="role" className="field-input" value={role} onChange={event => setRole(event.target.value === "agent" ? "agent" : "customer")}>
        <option value="customer">Customer</option><option value="agent">Agent</option>
      </select>
    </label>
    <ProfileFields role={role} />
    <Field label="Password" name="password" type="password" autoComplete="new-password" aria-describedby="password-rules" minLength={8} maxLength={72} required />
    <p id="password-rules" className="text-sm text-muted-foreground">Use at least eight characters, including uppercase and lowercase letters, a number, and a symbol.</p>
    <FormFeedback error={form.error} />
    <button className="action w-full rounded-md" type="submit" disabled={form.pending}>{form.pending ? "Creating account…" : "Create account"}</button>
  </form>;
}
