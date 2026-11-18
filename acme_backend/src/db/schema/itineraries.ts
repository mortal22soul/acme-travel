import { sql } from "drizzle-orm";
import { check, index, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { trips } from "@/db/schema/trips";

export const itineraries = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id),
  day: integer("day").notNull(),
  activity: text(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  check("itineraries_day_bounds", sql`${table.day} BETWEEN 1 AND 365`),
  index("itineraries_trip_id_idx").on(table.tripId),
]);

export const itinerariesRelations = relations(itineraries, ({ one }) => ({
  trip: one(trips, {
    fields: [itineraries.tripId],
    references: [trips.id],
  }),
}));
