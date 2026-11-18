import { agentProfile, agentResponse, bearer, body, createRoute, errors, id, idParam, json, message, pagination, z } from "@/routes/contracts";

const tags = ["agents"];
const security = bearer;
export const listRoute = createRoute({
  method: "get", path: "/", tags, security, summary: "List agents",
  request: { query: pagination },
  responses: { 200: json(z.array(agentResponse), "Agents"), ...errors },
});
export const getRoute = createRoute({
  method: "get", path: "/{id}", tags, security, summary: "Get a agent profile",
  request: { params: idParam },
  responses: { 200: json(agentResponse, "Profile"), ...errors },
});
export const createProfile = createRoute({
  method: "post", path: "/", tags, security, summary: "Create a agent profile as administrator",
  request: { body: body(agentProfile.extend({ userId: id })) },
  responses: { 201: json(agentResponse, "Profile created"), ...errors },
});
export const updateRoute = createRoute({
  method: "put", path: "/{id}", tags, security, summary: "Update a agent profile",
  request: { params: idParam, body: body(agentProfile.partial()) },
  responses: { 200: json(agentResponse, "Profile updated"), ...errors },
});
export const deleteRoute = createRoute({
  method: "delete", path: "/{id}", tags, security, summary: "Delete an unused agent profile",
  request: { params: idParam },
  responses: { 200: json(message, "Profile deleted"), ...errors },
});
