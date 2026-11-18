import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IconArmchair, IconListDetails, IconMapPin, IconPlaneDeparture, IconStarFilled, IconTag } from "@tabler/icons-react";
import TripActions from "@/components/destinations/TripActions";
import TripGallery from "@/components/destinations/TripGallery";
import Retry from "@/components/ui/Retry";
import { formatDate, formatMoney, routeId, tripImage } from "@/lib/format";
import { getItinerary, getTrip, getTripReviews } from "@/lib/public-api";

type Props = { params: Promise<{ id: string }> };
async function load(params: Props["params"]) {
  const id = routeId((await params).id);
  if (!id) notFound();
  const trip = await getTrip(id);
  if (!trip) notFound();
  return trip;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trip = await load(params);
  return { title: trip.destination, description: `Trip from ${trip.origin} to ${trip.destination} on ${formatDate(trip.departureDate)}.` };
}

async function Itinerary({ id }: { id: number }) {
  const items = await getItinerary(id).catch(() => null);
  if (!items) return <div className="space-y-2"><p className="text-muted-foreground">The itinerary is temporarily unavailable.</p><Retry /></div>;
  if (!items.length) return <p className="text-muted-foreground">An itinerary has yet to be published.</p>;
  return <ol className="grid gap-3">{items.map(item => <li key={item.id} className="travel-surface rounded-lg p-4 shadow-sm">
    <h3 className="font-semibold">Day {item.day}</h3>
    {item.activity && <p className="mt-1 text-muted-foreground">{item.activity}</p>}
  </li>)}</ol>;
}

async function Reviews({ id }: { id: number }) {
  const items = await getTripReviews(id).catch(() => null);
  if (!items) return <div className="space-y-2"><p className="text-muted-foreground">Reviews are temporarily unavailable.</p><Retry /></div>;
  if (!items.length) return <p className="text-muted-foreground">There are no reviews yet.</p>;
  return <ul className="grid gap-3">{items.map(item => <li key={item.id} className="travel-surface rounded-lg p-4 shadow-sm">
    <h3 className="font-semibold">{item.title}</h3>
    <p className="mt-1 flex gap-1 text-sm text-yellow-600">
      <span className="sr-only">{item.rating} out of 5 stars</span>
      {Array.from({ length: 5 }, (_, index) => (
        <IconStarFilled key={index} aria-hidden="true" size={17} className={index < item.rating ? "" : "text-muted-foreground opacity-40"} />
      ))}
    </p>
    {item.comment && <p className="mt-1">{item.comment}</p>}
  </li>)}</ul>;
}

export default async function Destination({ params }: Props) {
  const trip = await load(params);
  const photos = trip.images.flatMap(value => { const image = tripImage(value); return image ? [image] : []; });
  const facts = [
    { label: "Route", icon: IconMapPin, value: `${trip.origin} → ${trip.destination}` },
    { label: "Departure", icon: IconPlaneDeparture, value: <time dateTime={trip.departureDate}>{formatDate(trip.departureDate)}</time> },
    { label: "Availability", icon: IconArmchair, value: trip.availableSeats ? `${trip.availableSeats} seats left` : "Sold out" },
    {
      label: "Trip type", icon: IconTag, value: trip.returnDate
        ? <>Round-trip · returns <time dateTime={trip.returnDate}>{formatDate(trip.returnDate)}</time></>
        : "One-way",
    },
  ];
  return <article className="travel-page">
    <div className="page-shell max-w-5xl space-y-8">
      <section className="travel-surface overflow-hidden rounded-3xl p-5 shadow-xl shadow-blue-950/5 sm:p-8 md:p-10">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="travel-cyan mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]">
              <IconPlaneDeparture size={16} aria-hidden="true" /> Curated journey
            </p>
            <h1 className="travel-heading text-4xl font-bold tracking-tight sm:text-5xl">{trip.destination}</h1>
            <p className="mt-3 text-muted-foreground">A journey from <strong>{trip.origin}</strong> to <strong>{trip.destination}</strong></p>
          </div>
          <div className="travel-cyan-wash travel-tint-border rounded-2xl border px-5 py-3 text-right">
            <p className="travel-cyan text-xs font-semibold uppercase tracking-wide">Starting from</p>
            <p className="travel-blue text-3xl font-bold">{formatMoney(trip.price)}</p>
          </div>
        </header>
        <TripGallery photos={photos} destination={trip.destination} />
      </section>
      <section aria-labelledby="trip-details">
        <h2 className="sr-only" id="trip-details">Trip details</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(({ label, icon: Icon, value }) => <div key={label} className="travel-surface rounded-2xl p-5 shadow-sm">
            <Icon size={22} className="travel-blue mb-3" aria-hidden="true" />
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>)}
        </dl>
      </section>
      <TripActions trip={trip} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="travel-surface rounded-3xl p-5 shadow-lg shadow-blue-950/5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="travel-blue travel-blue-wash rounded-xl p-3"><IconListDetails size={22} aria-hidden="true" /></span>
            <div><h2 className="text-xl font-bold">Itinerary</h2><p className="text-sm text-muted-foreground">Your day-by-day outline</p></div>
          </div>
          <Itinerary id={trip.id} />
        </section>
        <section className="travel-surface rounded-3xl p-5 shadow-lg shadow-blue-950/5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="travel-cyan travel-cyan-wash rounded-xl p-3"><IconStarFilled size={22} aria-hidden="true" /></span>
            <div><h2 className="text-xl font-bold">Reviews</h2><p className="text-sm text-muted-foreground">What travelers are saying</p></div>
          </div>
          <Reviews id={trip.id} />
        </section>
      </div>
    </div>
  </article>;
}
