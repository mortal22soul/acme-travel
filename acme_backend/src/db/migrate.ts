import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import env from "@/env";

const connection = postgres(env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  const [database] = await connection<{ users: string | null }[]>`select to_regclass('public.users')::text as users`;
  if (database.users) {
    const issues = await connection<{ issue: string; records: number }[]>`
      select issue, records::int from (
        select 'accounts with duplicate case-insensitive emails' as issue, count(*) as records
          from (select lower(email) from users group by lower(email) having count(*) > 1) duplicates
        union all select 'users with multiple agent profiles', count(*)
          from (select user_id from agents group by user_id having count(*) > 1) duplicates
        union all select 'users with multiple customer profiles', count(*)
          from (select user_id from customers group by user_id having count(*) > 1) duplicates
        union all select 'duplicate customer reviews for a trip', count(*)
          from (select customer_id, trip_id from reviews group by customer_id, trip_id having count(*) > 1) duplicates
        union all select 'unrepresentable trip prices', count(*) from trips
          where case when price::text ~ '^[0-9]{1,10}([.][0-9]{1,2})?$' then price::numeric <= 0 else true end
        union all select 'unrepresentable booking totals', count(*) from bookings
          where case when total_price::text ~ '^[0-9]{1,10}([.][0-9]{1,2})?$' then total_price::numeric <= 0 else true end
        union all select 'unrepresentable payment amounts', count(*) from payments
          where case when amount::text ~ '^[0-9]{1,10}([.][0-9]{1,2})?$' then amount::numeric <= 0 else true end
        union all select 'invalid trip inventory, photo counts or dates', count(*) from trips
          where available_seats < 0 or available_seats > 100000 or images is null or cardinality(images) not between 1 and 8
            or (type = 'round-trip' and (return_date is null or return_date::date < departure_date::date))
        union all select 'invalid traveler counts', count(*) from bookings where travelers not between 1 and 10
        union all select 'invalid review ratings', count(*) from reviews where rating not between 1 and 5
        union all select 'invalid itinerary days', count(*) from itineraries where day not between 1 and 365
        union all select 'invalid dates of birth', count(*) from customers where dob < '1900-01-01'
      ) checks where records > 0 order by issue`;
    if (issues.length) {
      for (const { issue, records } of issues) console.error(`${issue}: ${records}`);
      throw new Error("Resolve the listed data issues before migrating");
    }
  }
  await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied");
} finally {
  await connection.end();
}
