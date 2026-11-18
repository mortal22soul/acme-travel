import { sql } from "drizzle-orm";
import { check, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "@/db/schema/users";
import { bookings } from "@/db/schema/bookings";
import { reviews } from "@/db/schema/reviews";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  phone: text().notNull().unique(),
  streetAddress1: text("street_address1").notNull(),
  streetAddress2: text("street_address2"),
  city: text().notNull(),
  zip: text().notNull(),
  dob: date({ mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  check("customers_dob_floor", sql`${table.dob} >= DATE '1900-01-01'`),
]);

export const customersRelations = relations(customers, ({ many, one }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
}));
