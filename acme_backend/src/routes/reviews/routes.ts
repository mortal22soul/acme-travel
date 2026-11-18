import { bearer, body, createRoute, errors, id, idParam, json, message, pagination, reviewResponse, text, tripParam, z } from "@/routes/contracts";

const tags = ["reviews"];
const fields = z.object({ rating: z.number().int().min(1).max(5), title: text(120, 2), comment: text(1500, 2) }).strict();
export const listRoute = createRoute({
  method: "get", path: "/", tags, summary: "List published reviews",
  request: { query: pagination },
  responses: { 200: json(z.array(reviewResponse), "Public reviews"), ...errors },
});
export const getRoute = createRoute({
  method: "get", path: "/{tripId}", tags, summary: "List reviews for a trip ID",
  request: { params: tripParam, query: pagination },
  responses: { 200: json(z.array(reviewResponse), "Public reviews for the trip"), ...errors },
});
export const createReview = createRoute({
  method: "post", path: "/", tags, security: bearer, summary: "Review a trip from a confirmed booking",
  request: { body: body(fields.extend({ tripId: id })) },
  responses: { 201: json(reviewResponse, "Review created"), ...errors },
});
export const updateRoute = createRoute({
  method: "put", path: "/{id}", tags, security: bearer, summary: "Update the content of a review",
  request: { params: idParam, body: body(fields.partial()) },
  responses: { 200: json(reviewResponse, "Review updated"), ...errors },
});
export const deleteRoute = createRoute({
  method: "delete", path: "/{id}", tags, security: bearer, summary: "Remove a review",
  request: { params: idParam },
  responses: { 200: json(message, "Review deleted"), ...errors },
});
