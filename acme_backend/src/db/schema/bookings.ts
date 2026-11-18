import { sql } from "drizzle-orm";
import { check, index, numeric,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { customers } from "@/db/schema/customers";
import { trips } from "@/db/schema/trips";
import { relations } from "drizzle-orm";

export const bookingStatus = pgEnum("bookingStatus", [
  "confirmed",
  "canceled",
  "pending",
]);

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id),
  bookingDate: timestamp("booking_date", { mode: "string" }).notNull(),
  status: bookingStatus("status").notNull().default("pending"),
  travelers: integer("travelers").notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  check("bookings_traveler_bounds", sql`${table.travelers} BETWEEN 1 AND 10`),
  check("bookings_positive_total", sql`${table.totalPrice} > 0`),
  index("bookings_customer_id_idx").on(table.customerId),
  index("bookings_trip_id_idx").on(table.tripId),
]);

export const bookingsRelations = relations(bookings, ({ one }) => ({
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  trip: one(trips, {
    fields: [bookings.tripId],
    references: [trips.id],
  }),
}));
