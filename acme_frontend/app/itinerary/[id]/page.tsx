import { notFound } from "next/navigation";
import CreateItinerary from "@/components/itineraries/CreateItinerary";
import { routeId } from "@/lib/format";
import { getTrip } from "@/lib/public-api";

export const metadata = { title: "Add itinerary entry" };
export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const id = routeId((await params).id);
  if (!id) notFound();
  const trip = await getTrip(id);
  if (!trip) notFound();
  return <section className="page-shell form-shell">
    <h1 className="travel-blue mb-5 text-center text-3xl font-bold sm:text-4xl">Add an itinerary entry for {trip.destination}</h1>
    <CreateItinerary id={id} agentId={trip.agentId} />
  </section>;
}
