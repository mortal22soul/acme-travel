import { bearer, body, createRoute, email, errors, idParam, json, message, pagination, publicUser, role, text, z } from "@/routes/contracts";

const tags = ["users"];
const security = bearer;
const profile = z.object({ firstName: text(80), lastName: text(80), email, role }).partial().strict();
export const listRoute = createRoute({
  method: "get", path: "/", tags, security, summary: "List users",
  request: { query: pagination },
  responses: { 200: json(z.array(publicUser), "Users"), ...errors },
});
export const getRoute = createRoute({
  method: "get", path: "/{id}", tags, security, summary: "Get a user",
  request: { params: idParam },
  responses: { 200: json(publicUser, "User"), ...errors },
});
export const updateRoute = createRoute({
  method: "put", path: "/{id}", tags, security, summary: "Update user identity or role",
  request: { params: idParam, body: body(profile) },
  responses: { 200: json(publicUser, "User updated"), ...errors },
});
export const deleteRoute = createRoute({
  method: "delete", path: "/{id}", tags, security, summary: "Delete a user without associated records",
  request: { params: idParam },
  responses: { 200: json(message, "User deleted"), ...errors },
});
