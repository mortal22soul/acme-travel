import { bearer, createRoute, errors, idParam, json, message, pagination, paymentResponse, z } from "@/routes/contracts";

const tags = ["payments"];
const security = bearer;
const immutable = { 405: json(message, "Payments are recorded through checkout"), ...errors };
export const listRoute = createRoute({
  method: "get", path: "/", tags, security, summary: "List payment history",
  request: { query: pagination },
  responses: { 200: json(z.array(paymentResponse), "Payments"), ...errors },
});
export const getRoute = createRoute({
  method: "get", path: "/{id}", tags, security, summary: "Get a payment record",
  request: { params: idParam },
  responses: { 200: json(paymentResponse, "Payment"), ...errors },
});
export const createPayment = createRoute({ method: "post", path: "/", tags, security, summary: "Retired", responses: immutable });
export const updatePayment = createRoute({ method: "put", path: "/{id}", tags, security, summary: "Payment records are immutable", request: { params: idParam }, responses: immutable });
export const deletePayment = createRoute({ method: "delete", path: "/{id}", tags, security, summary: "Payment records are retained", request: { params: idParam }, responses: immutable });
