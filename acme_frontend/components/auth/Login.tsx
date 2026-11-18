"use client";

import { Field, FormFeedback } from "@/components/ui/fields";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, readError } from "@/lib/api";
import { useFormRequest, valueOf } from "@/lib/use-form-request";

export default function Login() {
  const { login } = useAuth();
  const form = useFormRequest(async (fields) => {
    const response = await apiFetch("/login", { method: "POST", body: JSON.stringify({
      email: valueOf(fields, "email"), password: valueOf(fields, "password"),
    }) });
    if (!response.ok) throw new Error(await readError(response, "Unable to sign in"));
    await login();
  });
  return <form className="panel travel-tint-border grid gap-4 md:p-8" onSubmit={form.onSubmit} aria-busy={form.pending}>
    <h1 className="mb-2 text-xl font-bold">Welcome to ACME</h1>
    <Field label="Email address" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required />
    <Field label="Password" name="password" type="password" autoComplete="current-password" maxLength={256} required />
    <FormFeedback error={form.error} />
    <button className="action w-full rounded-md" type="submit" disabled={form.pending}>{form.pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
