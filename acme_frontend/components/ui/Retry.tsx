"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function Retry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="secondary-action" type="button" disabled={pending} onClick={() => {
    startTransition(() => router.refresh());
  }}>{pending ? "Retrying…" : "Try again"}</button>;
}
