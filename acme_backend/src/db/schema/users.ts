import { sql } from "drizzle-orm";
import { uniqueIndex, integer, pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["admin", "customer", "agent"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  sessionVersion: integer("session_version").notNull().default(0),
  image: text("image").default("https://api.dicebear.com/9.x/bottts/svg"),
  role: role("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_normalized_unique").on(sql`lower(${table.email})`),
]);
