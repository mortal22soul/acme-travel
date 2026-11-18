"use client";

import TripPhoto from "./TripPhoto";
import { useId, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export default function TripGallery({ photos, destination }: { photos: string[]; destination: string }) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  if (!photos.length) return null;
  function move(delta: number) {
    setSelected(index => (index + delta + photos.length) % photos.length);
  }
  return <section aria-label={`Photos of ${destination}`}>
    <div id={id} className="travel-blue-wash relative h-56 overflow-hidden rounded-2xl shadow-lg sm:h-72 md:h-[28rem]">
      <TripPhoto key={selected} src={photos[selected]} alt={`${destination} travel photo ${selected + 1}`}
        sizes="(max-width: 1023px) 100vw, 960px" priority={selected === 0} />
    </div>
    {photos.length > 1 && <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
      <button type="button" className="secondary-action px-3" onClick={() => move(-1)} aria-controls={id} aria-label="Previous photo"><IconChevronLeft size={18} aria-hidden="true" /></button>
      <p role="status" aria-atomic="true">{selected + 1} of {photos.length}</p>
      <button type="button" className="secondary-action px-3" onClick={() => move(1)} aria-controls={id} aria-label="Next photo"><IconChevronRight size={18} aria-hidden="true" /></button>
    </div>}
  </section>;
}
