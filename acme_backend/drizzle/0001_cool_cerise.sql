ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_unique" UNIQUE("user_id");