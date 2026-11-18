import { sql } from "drizzle-orm";
import { check, unique, index, pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customers } from "@/db/schema/customers";
import { trips } from "@/db/schema/trips";

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id),
  rating: integer().notNull(),
  title: text().notNull(),
  comment: text(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  check("reviews_rating_bounds", sql`${table.rating} BETWEEN 1 AND 5`),
  unique("reviews_customer_trip_unique").on(table.customerId, table.tripId),
  index("reviews_trip_id_idx").on(table.tripId),
]);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  trip: one(trips, {
    fields: [reviews.tripId],
    references: [trips.id],
  }),
}));
