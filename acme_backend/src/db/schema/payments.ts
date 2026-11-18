import { sql } from "drizzle-orm";
import { check, index, numeric, pgEnum, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { bookings } from "@/db/schema/bookings";

export const paymentStatus = pgEnum("paymentStatus", [
  "successful",
  "failed",
  "pending",
]);

export const method = pgEnum("method", [
  "credit card",
  "debit card",
  "net banking",
]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  date: timestamp({ mode: "string" }).notNull(),
  amount: numeric({ precision: 12, scale: 2 }).notNull(),
  status: paymentStatus("status").notNull().default("pending"),
  method: method().notNull().default("debit card"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  check("payments_positive_amount", sql`${table.amount} > 0`),
  index("payments_booking_id_idx").on(table.bookingId),
]);

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));
