import { customerProfile, customerResponse, bearer, body, createRoute, errors, id, idParam, json, message, pagination, z } from "@/routes/contracts";

const tags = ["customers"];
const security = bearer;
export const listRoute = createRoute({
  method: "get", path: "/", tags, security, summary: "List customers",
  request: { query: pagination },
  responses: { 200: json(z.array(customerResponse), "Customers"), ...errors },
});
export const getRoute = createRoute({
  method: "get", path: "/{id}", tags, security, summary: "Get a customer profile",
  request: { params: idParam },
  responses: { 200: json(customerResponse, "Profile"), ...errors },
});
export const createProfile = createRoute({
  method: "post", path: "/", tags, security, summary: "Create a customer profile as administrator",
  request: { body: body(customerProfile.extend({ userId: id })) },
  responses: { 201: json(customerResponse, "Profile created"), ...errors },
});
export const updateRoute = createRoute({
  method: "put", path: "/{id}", tags, security, summary: "Update a customer profile",
  request: { params: idParam, body: body(customerProfile.partial()) },
  responses: { 200: json(customerResponse, "Profile updated"), ...errors },
});
export const deleteRoute = createRoute({
  method: "delete", path: "/{id}", tags, security, summary: "Delete an unused customer profile",
  request: { params: idParam },
  responses: { 200: json(message, "Profile deleted"), ...errors },
});
