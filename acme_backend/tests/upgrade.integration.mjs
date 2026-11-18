import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.UPGRADE_DATABASE_URL;
assert.ok(url && url !== process.env.DATABASE_URL, "Set UPGRADE_DATABASE_URL to an independent empty fixture database");
const connection = postgres(url, { max: 1, onnotice: () => {} });
const oldMigrations = await mkdtemp(join(tmpdir(), "acme-upgrade-"));

function upgrade() {
  return spawnSync("pnpm", ["db:migrate"], {
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
}

try {
  const [initial] = await connection`select to_regclass('public.users')::text as users`;
  assert.equal(initial.users, null, "The upgrade fixture requires an empty database");
  const journal = JSON.parse(await readFile("./drizzle/meta/_journal.json", "utf8"));
  journal.entries = journal.entries.slice(0, 1);
  await mkdir(join(oldMigrations, "meta"));
  await writeFile(join(oldMigrations, "meta/_journal.json"), JSON.stringify(journal));
  for (const { tag } of journal.entries) await copyFile(`./drizzle/${tag}.sql`, join(oldMigrations, `${tag}.sql`));
  await migrate(drizzle(connection), { migrationsFolder: oldMigrations });

  const [owner] = await connection`
    insert into users (first_name, last_name, username, email, password, role)
    values ('Upgrade', 'Fixture', 'upgrade', 'upgrade@example.org', 'test-only', 'agent') returning id`;
  const [profile] = await connection`insert into agents (user_id, phone_number, region) values (${owner.id}, '+12025550113', 'West') returning id`;
  const [duplicate] = await connection`insert into agents (user_id, phone_number, region) values (${owner.id}, '+12025550114', 'West') returning id`;
  const [trip] = await connection`
    insert into trips (agent_id, destination, origin, images, price, departure_date, return_date, available_seats, type)
    values (${profile.id}, 'Legacy destination', 'Legacy origin', array['https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg'],
      '100.10', '2099-07-09 22:30:00', '2099-07-12 10:00:00', 5, 'one-way') returning id`;

  const preflight = upgrade();
  assert.notEqual(preflight.status, 0);
  assert.match(preflight.stderr, /users with multiple agent profiles: 1/);
  assert.equal((await connection`select count(*)::int as total from agents`)[0].total, 2);

  await connection`delete from agents where id = ${duplicate.id}`;
  execFileSync("pnpm", ["db:migrate"], { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
  const [stored] = await connection`
    select price::text, departure_date::text, return_date, available_seats from trips where id = ${trip.id}`;
  assert.deepEqual({ ...stored }, { price: "100.10", departure_date: "2099-07-09", return_date: null, available_seats: 5 });
  assert.equal((await connection`select session_version from users where id = ${owner.id}`)[0].session_version, 0);
  console.log("Legacy upgrade preserves valid records and blocks ambiguous data before changing it");
} finally {
  await connection.end();
  await rm(oldMigrations, { force: true, recursive: true });
}
