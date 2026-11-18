import { bearer, body, createRoute, errors, id, idParam, json, message, pagination, tripFields, tripResponse, z } from "@/routes/contracts";

const tags = ["trips"];
export const listRoute = createRoute({
  method: "get", path: "/", tags, summary: "List upcoming destinations",
  request: { query: pagination },
  responses: { 200: json(z.array(tripResponse), "Trips"), ...errors },
});
export const getRoute = createRoute({
  method: "get", path: "/{id}", tags, summary: "Get a trip by ID",
  request: { params: idParam },
  responses: { 200: json(tripResponse, "Trip"), ...errors },
});
export const createTrip = createRoute({
  method: "post", path: "/", tags, security: bearer, summary: "Create an upcoming trip",
  request: { body: body(tripFields.extend({ agentId: id.optional() }).strict()) },
  responses: { 201: json(tripResponse, "Trip created"), ...errors },
});
export const updateRoute = createRoute({
  method: "put", path: "/{id}", tags, security: bearer, summary: "Update a trip owned by the agent",
  request: { params: idParam, body: body(tripFields.partial().extend({ returnDate: tripFields.shape.returnDate.unwrap().optional() }).strict()) },
  responses: { 200: json(tripResponse, "Trip updated"), ...errors },
});
export const deleteRoute = createRoute({
  method: "delete", path: "/{id}", tags, security: bearer, summary: "Delete an unreferenced trip",
  request: { params: idParam },
  responses: { 200: json(message, "Trip deleted"), ...errors },
});
