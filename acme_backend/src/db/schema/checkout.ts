import { integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers";

export type CheckoutBooking = { bookingId: number; tripId: number; totalPrice: string };

export const checkoutOrders = pgTable("checkout_orders", {
  customerId: integer("customer_id").notNull().references(() => customers.id),
  key: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  result: jsonb().$type<CheckoutBooking[]>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.customerId, table.key] })]);
