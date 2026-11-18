"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { IconRefresh, IconTriangleInverted } from "@tabler/icons-react";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  function retry() {
    startTransition(() => { router.refresh(); reset(); });
  }
  return <section className="page-shell flex justify-center"><section className="max-w-xl rounded-3xl border border-border bg-card p-10 text-center shadow-xl shadow-blue-950/10 backdrop-blur-xl"><IconTriangleInverted className="mx-auto text-cyan-600" size={42} /><p className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-accent-foreground">Unexpected detour</p><h1 className="mt-2 text-3xl font-bold text-foreground">Something went wrong</h1><p className="mt-3 text-muted-foreground">Try loading this page again or return to the destinations list.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={retry} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"><IconRefresh size={18} /> Try again</button><Link href="/destinations" className="rounded-full border border-cyan-200 bg-white px-5 py-3 font-semibold text-cyan-800 hover:bg-cyan-50">Browse trips</Link></div></section></section>;
}
