import { cache } from "react";
import type { z } from "zod";
import { backendRequest } from "./backend";
import { itinerary, reviews, trip, tripList } from "./contracts";

async function load<T>(path: string, schema: z.ZodType<T>) {
  const response = await backendRequest(path);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Travel information is temporarily unavailable");
  return schema.parse(await response.json());
}

export const getTrip = cache((id: number) => load(`/trips/${id}`, trip));
export const getTrips = (limit: number, offset: number) => load(`/trips?limit=${limit}&offset=${offset}`, tripList);
export const getTripReviews = (id: number) => load(`/reviews/${id}?limit=12`, reviews);
export const getReviews = () => load("/reviews?limit=8", reviews);
export const getItinerary = (id: number) => load(`/itineraries/${id}`, itinerary);
