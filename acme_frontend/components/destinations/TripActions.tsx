"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { IconPlus } from "@tabler/icons-react";
import type { Trip } from "@/lib/contracts";
import { todayUtc, tripImage } from "@/lib/format";

export function AddDestinationLink() {
  const { user } = useAuth();
  return user?.role === "agent" && user.agentId
    ? <Link className="action" href="/destinations/new"><IconPlus size={18} aria-hidden="true" /> Add destination</Link>
    : null;
}

export default function TripActions({ trip }: { trip: Trip }) {
  const { user } = useAuth();
  const cart = useCart();
  const router = useRouter();
  const bookable = trip.availableSeats > 0 && trip.departureDate > todayUtc();
  const canBook = bookable && (!user || user.role === "customer");
  const canReview = !!user?.customerId;
  const canAddItinerary = user?.role === "agent" && user.agentId === trip.agentId;
  if (!canBook && !canReview && !canAddItinerary) return null;
  return <div className="travel-surface flex flex-wrap justify-center gap-3 rounded-3xl p-6 shadow-xl shadow-blue-950/5">
    {canBook && <button className="action" type="button" disabled={!cart.ready}
      onClick={() => {
        cart.addItem({
          tripId: trip.id, destination: trip.destination, origin: trip.origin, departureDate: trip.departureDate,
          image: tripImage(trip.images[0]), price: Number(trip.price),
        });
        router.push("/cart");
      }}>Add to cart</button>}
    {canReview && <Link className="secondary-action" href={`/reviews/${trip.id}`}>Write a review</Link>}
    {canAddItinerary &&
      <Link className="secondary-action" href={`/itinerary/${trip.id}`}>Add itinerary</Link>}
  </div>;
}
