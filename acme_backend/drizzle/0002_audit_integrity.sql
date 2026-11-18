CREATE TABLE "checkout_orders" (
	"customer_id" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_orders_customer_id_idempotency_key_pk" PRIMARY KEY("customer_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "customer_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "trip_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "total_price" SET DATA TYPE numeric(12, 2) USING "total_price"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "dob" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "itineraries" ALTER COLUMN "trip_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "booking_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE numeric(12, 2) USING "amount"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "customer_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "trip_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "agent_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "images" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "price" SET DATA TYPE numeric(12, 2) USING "price"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "departure_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "return_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "return_date" DROP NOT NULL;--> statement-breakpoint
UPDATE "trips" SET "return_date" = NULL WHERE "type" = 'one-way';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_customer_id_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_trip_id_idx" ON "bookings" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_normalized_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "itineraries_trip_id_idx" ON "itineraries" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_trip_id_idx" ON "reviews" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trips_agent_id_idx" ON "trips" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "trips_departure_idx" ON "trips" USING btree ("departure_date","id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_trip_unique" UNIQUE("customer_id","trip_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_traveler_bounds" CHECK ("bookings"."travelers" BETWEEN 1 AND 10);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_positive_total" CHECK ("bookings"."total_price" > 0);--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_dob_floor" CHECK ("customers"."dob" >= DATE '1900-01-01');--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_day_bounds" CHECK ("itineraries"."day" BETWEEN 1 AND 365);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_positive_amount" CHECK ("payments"."amount" > 0);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_bounds" CHECK ("reviews"."rating" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_seat_bounds" CHECK ("trips"."available_seats" BETWEEN 0 AND 100000);--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_positive_price" CHECK ("trips"."price" > 0);--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_consistent_dates" CHECK (("trips"."type" = 'one-way' AND "trips"."return_date" IS NULL) OR ("trips"."type" = 'round-trip' AND "trips"."return_date" IS NOT NULL AND "trips"."return_date" >= "trips"."departure_date"));--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_image_count" CHECK (cardinality("trips"."images") BETWEEN 1 AND 8);