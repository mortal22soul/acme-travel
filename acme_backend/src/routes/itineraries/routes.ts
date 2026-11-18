import { bearer, body, createRoute, errors, id, idParam, itineraryResponse, json, message, pagination, text, tripParam, z } from "@/routes/contracts";

const tags = ["itineraries"];
const fields = z.object({ day: z.number().int().min(1).max(365), activity: text(500, 2) }).strict();
export const listRoute = createRoute({
  method: "get", path: "/", tags, security: bearer, summary: "List itineraries visible to an agent or administrator",
  request: { query: pagination },
  responses: { 200: json(z.array(itineraryResponse), "Itineraries"), ...errors },
});
export const getRoute = createRoute({
  method: "get", path: "/{tripId}", tags, summary: "List itinerary entries for a trip ID",
  request: { params: tripParam },
  responses: { 200: json(z.array(itineraryResponse), "Entries ordered by trip day"), ...errors },
});
export const createItinerary = createRoute({
  method: "post", path: "/", tags, security: bearer, summary: "Add a trip itinerary entry",
  request: { body: body(fields.extend({ tripId: id })) },
  responses: { 201: json(itineraryResponse, "Entry created"), ...errors },
});
export const updateRoute = createRoute({
  method: "put", path: "/{id}", tags, security: bearer, summary: "Update an itinerary entry by entry ID",
  request: { params: idParam, body: body(fields.partial()) },
  responses: { 200: json(itineraryResponse, "Entry updated"), ...errors },
});
export const deleteRoute = createRoute({
  method: "delete", path: "/{id}", tags, security: bearer, summary: "Delete an itinerary entry by entry ID",
  request: { params: idParam },
  responses: { 200: json(message, "Entry removed"), ...errors },
});
