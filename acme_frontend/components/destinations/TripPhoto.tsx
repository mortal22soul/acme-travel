"use client";

import Image from "next/image";
import { useState } from "react";

export default function TripPhoto({ src, alt, sizes, priority = false }: {
  src: string; alt: string; sizes: string; priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">Photo unavailable</div>;
  return <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} priority={priority}
    fetchPriority={priority ? "high" : undefined} onError={() => setFailed(true)} />;
}
