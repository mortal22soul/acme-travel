import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconCalendarEvent, IconMapPin, IconPlane, IconUsers } from "@tabler/icons-react";
import TripPhoto from "@/components/destinations/TripPhoto";
import { AddDestinationLink } from "@/components/destinations/TripActions";
import { formatDate, formatMoney, tripImage } from "@/lib/format";
import { getTrips } from "@/lib/public-api";

export const metadata: Metadata = { title: "Destinations", description: "Browse upcoming ACME trips, dates, prices and current availability." };
const pageSize = 12;

export default async function Destinations({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(1000, Number.parseInt((await searchParams).page ?? "", 10) || 1));
  const trips = await getTrips(pageSize + 1, (page - 1) * pageSize);
  if (!trips) throw new Error("Unable to load destinations");
  const visible = trips.slice(0, pageSize);
  return <section className="travel-page">
    <div className="page-shell lg:max-w-[1328px] lg:py-10">
      <header className="travel-surface mb-10 flex flex-wrap items-end justify-between gap-6 rounded-3xl p-6 shadow-xl shadow-blue-950/5 sm:p-10">
        <div className="max-w-2xl">
          <p className="travel-cyan mb-3 flex items-center gap-2 text-sm font-semibold tracking-[0.2em] uppercase">
            <IconPlane size={16} aria-hidden="true" /> Curated journeys
          </p>
          <h1 className="travel-heading text-4xl font-bold tracking-tight sm:text-5xl">Find your next adventure</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground sm:text-lg">Discover thoughtfully planned trips, memorable routes, and experiences ready to book.</p>
        </div>
        <div className="travel-cyan-wash travel-tint-border rounded-2xl border px-5 py-4 text-center">
          <p className="travel-blue text-3xl font-bold">{visible.length}{trips.length > pageSize ? "+" : ""}</p>
          <p className="text-sm font-medium">{page === 1 ? "Available journeys" : "Journeys on this page"}</p>
        </div>
      </header>
      <div className="mb-5 flex justify-end"><AddDestinationLink /></div>
      {visible.length === 0 && <p className="panel">No trips are available on this page.</p>}
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((trip, index) => {
          const image = tripImage(trip.images[0]);
          return <li key={trip.id} className="travel-surface flex min-w-0 flex-col overflow-hidden rounded-3xl p-5 shadow-lg shadow-blue-950/5 motion-safe:transition-shadow hover:shadow-xl sm:p-6">
            <h2 className="text-xl font-bold">{trip.destination}</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <IconMapPin size={16} className="travel-cyan shrink-0" aria-hidden="true" /> <span>From <strong>{trip.origin}</strong></span>
            </p>
            <div className="travel-blue-wash relative mt-4 h-52 w-full overflow-hidden rounded-2xl">
              {image && <TripPhoto src={image} alt="" priority={index === 0}
                sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw" />}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="travel-blue-wash rounded-xl p-3">
                <p className="travel-blue text-xs font-medium uppercase tracking-wide">From</p>
                <p className="mt-1 font-semibold">{formatMoney(trip.price)}</p>
              </div>
              <div className="travel-cyan-wash rounded-xl p-3">
                <p className="travel-cyan flex items-center gap-1 text-xs font-medium uppercase tracking-wide"><IconUsers size={14} aria-hidden="true" /> Seats</p>
                <p className="mt-1 font-semibold">{trip.availableSeats ? `${trip.availableSeats} available` : "Sold out"}</p>
              </div>
            </div>
            <p className="mt-4 mb-5 flex items-center gap-2 text-sm text-muted-foreground">
              <IconCalendarEvent size={17} className="travel-blue shrink-0" aria-hidden="true" /> <span>Departs <time dateTime={trip.departureDate}>{formatDate(trip.departureDate)}</time></span>
            </p>
            <Link href={`/destinations/${trip.id}`} className="secondary-action mt-auto w-full rounded-2xl"
              aria-label={`Explore trip to ${trip.destination}`}>
              Explore trip <IconArrowRight size={18} aria-hidden="true" />
            </Link>
          </li>;
        })}
      </ul>
      {(page > 1 || trips.length > pageSize) && <nav aria-label="Destination pages" className="mt-6 flex items-center gap-3">
        {page > 1 && <Link href={`?page=${page - 1}`} className="secondary-action">Previous</Link>}
        <span>Page {page}</span>
        {trips.length > pageSize && <Link href={`?page=${page + 1}`} className="secondary-action">Next</Link>}
      </nav>}
    </div>
  </section>;
}
