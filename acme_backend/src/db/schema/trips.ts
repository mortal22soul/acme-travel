import { sql } from "drizzle-orm";
import { check, date, index, numeric,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { bookings } from "@/db/schema/bookings";
import { itineraries } from "@/db/schema/itineraries";
import { reviews } from "@/db/schema/reviews";
import { agents } from "@/db/schema/agents";

export const type = pgEnum("type", ["one-way", "round-trip"]);

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id")
    .notNull()
    .references(() => agents.id),
  destination: text().notNull(),
  origin: text().notNull(),
  images: text("images").array().notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  departureDate: date("departure_date", { mode: "string" }).notNull(),
  returnDate: date("return_date", { mode: "string" }),
  availableSeats: integer("available_seats").notNull(),
  type: type().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  check("trips_seat_bounds", sql`${table.availableSeats} BETWEEN 0 AND 100000`),
  check("trips_positive_price", sql`${table.price} > 0`),
  check("trips_consistent_dates", sql`(${table.type} = 'one-way' AND ${table.returnDate} IS NULL) OR (${table.type} = 'round-trip' AND ${table.returnDate} IS NOT NULL AND ${table.returnDate} >= ${table.departureDate})`),
  check("trips_image_count", sql`cardinality(${table.images}) BETWEEN 1 AND 8`),
  index("trips_agent_id_idx").on(table.agentId),
  index("trips_departure_idx").on(table.departureDate, table.id),
]);

export const tripsRelations = relations(trips, ({ one, many }) => ({
  agent: one(agents, {
    fields: [trips.agentId],
    references: [agents.id],
  }),
  bookings: many(bookings),
  itineraries: many(itineraries),
  reviews: many(reviews),
}));
