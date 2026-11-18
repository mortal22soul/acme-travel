"use client";

import { useRef, useState, type FormEvent } from "react";

export const valueOf = (form: FormData, key: string) => String(form.get(key) ?? "");

export function useFormRequest(submit: (fields: FormData, form: HTMLFormElement) => Promise<string | void>) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    inFlight.current = true;
    setPending(true);
    setError("");
    setSuccess("");
    try {
      setSuccess((await submit(fields, form)) ?? "");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The request failed. Try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return { onSubmit, pending, error, success };
}
