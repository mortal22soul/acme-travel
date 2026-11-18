import { notFound } from "next/navigation";
import CreateReview from "@/components/reviews/CreateReview";
import { routeId } from "@/lib/format";
import { getTrip } from "@/lib/public-api";

export const metadata = { title: "Write a review" };
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const id = routeId((await params).id);
  if (!id) notFound();
  const trip = await getTrip(id);
  if (!trip) notFound();
  return <section className="page-shell form-shell">
    <h1 className="travel-blue mb-5 text-center text-3xl font-bold sm:text-4xl">Review {trip.destination}</h1>
    <p className="text-muted-foreground">Customers can post one review per trip with a confirmed booking.</p>
    <CreateReview id={id} />
  </section>;
}
