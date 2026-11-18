import type { ComponentProps, ReactNode } from "react";

export function Field({ label, ...input }: ComponentProps<"input"> & { label: ReactNode }) {
  return <label className="field-label">{label}<input className="field-input" {...input} /></label>;
}

export function FormFeedback({ error, success }: { error: string; success?: string }) {
  return <>
    <p role="alert" aria-atomic="true" className="status-error">{error}</p>
    <p role="status" aria-atomic="true" className="text-sm text-accent-foreground">{success}</p>
  </>;
}
