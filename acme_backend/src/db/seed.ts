import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import env from "@/env";
import bcrypt from "bcrypt";
import * as schema from "@/db/schema/index";
import {
  agents,
  bookings,
  customers,
  itineraries,
  payments,
  reviews,
  trips,
  users,
} from "@/db/schema/index";
import { sql } from "drizzle-orm";
import { invalidateApplicationCache } from "@/db/cache";
import redis from "@/db/redis";

const connection = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(connection, { schema });

const dateFromToday = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

async function seed() {
  if (env.NODE_ENV === "production" || process.env.ACME_DEMO_SEED !== "1") {
    throw new Error("Set ACME_DEMO_SEED=1 for an isolated development or test database");
  }
  console.log("🌱 Starting comprehensive database seeding...");

  try {
    console.log("🧹 Clearing existing data...");
    await db.execute(
      sql`TRUNCATE TABLE checkout_orders, reviews, payments, bookings, itineraries, trips, customers, agents, users CASCADE`,
    );
    await invalidateApplicationCache();
    console.log("✅ Existing data cleared.");

    const passwordHash = await bcrypt.hash("password123", 10);

    console.log("⏳ Seeding users, agents, and customers...");
    await db.insert(users).values({
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      email: "admin@acme.com",
      password: passwordHash,
      role: "admin",
    });

    const agentUsers = await db
      .insert(users)
      .values([
        {
          firstName: "Alice",
          lastName: "Martin",
          username: "alice_agent",
          email: "alice@acme.com",
          password: passwordHash,
          role: "agent",
        },
        {
          firstName: "Bob",
          lastName: "Chen",
          username: "bob_agent",
          email: "bob@acme.com",
          password: passwordHash,
          role: "agent",
        },
        {
          firstName: "Carla",
          lastName: "Rossi",
          username: "carla_agent",
          email: "carla@acme.com",
          password: passwordHash,
          role: "agent",
        },
        {
          firstName: "Daniel",
          lastName: "Okafor",
          username: "daniel_agent",
          email: "daniel@acme.com",
          password: passwordHash,
          role: "agent",
        },
      ])
      .returning();

    const customerUsers = await db
      .insert(users)
      .values([
        ["Charlie", "Nguyen", "charlie_c", "charlie@example.com"],
        ["Dave", "Williams", "dave_c", "dave@example.com"],
        ["Elena", "Garcia", "elena_c", "elena@example.com"],
        ["Farah", "Khan", "farah_c", "farah@example.com"],
        ["George", "Wilson", "george_c", "george@example.com"],
        ["Hannah", "Brown", "hannah_c", "hannah@example.com"],
        ["Isaac", "Taylor", "isaac_c", "isaac@example.com"],
        ["Julia", "Miller", "julia_c", "julia@example.com"],
        ["Kevin", "Moore", "kevin_c", "kevin@example.com"],
        ["Leila", "Ahmed", "leila_c", "leila@example.com"],
      ].map(([firstName, lastName, username, email]) => ({
        firstName,
        lastName,
        username,
        email,
        password: passwordHash,
        role: "customer" as const,
      })))
      .returning();

    const seededAgents = await db
      .insert(agents)
      .values([
        { userId: agentUsers[0].id, phone: "+12125550101", region: "North America" },
        { userId: agentUsers[1].id, phone: "+442071838750", region: "Europe" },
        { userId: agentUsers[2].id, phone: "+390212345678", region: "Mediterranean" },
        { userId: agentUsers[3].id, phone: "+61293744000", region: "Asia-Pacific" },
      ])
      .returning();

    const customerProfiles = [
      ["+12125550111", "123 Main St", "New York", "10001", "1985-06-15"],
      ["+14155550112", "456 Market St", "San Francisco", "94103", "1992-11-20"],
      ["+13125550113", "88 Lake Shore Dr", "Chicago", "60601", "1988-03-08"],
      ["+12025550114", "15 Capitol Ave", "Washington", "20001", "1990-07-17"],
      ["+16175550115", "42 Beacon St", "Boston", "02108", "1981-01-29"],
      ["+13055550116", "240 Ocean Dr", "Miami", "33139", "1995-09-12"],
      ["+17205550117", "75 Pearl St", "Denver", "80202", "1987-05-24"],
      ["+15035550118", "190 Rose St", "Portland", "97205", "1993-12-02"],
      ["+12145550119", "66 Chestnut St", "Philadelphia", "19106", "1984-04-19"],
      ["+12065550120", "310 Pine St", "Seattle", "98101", "1991-08-31"],
    ];

    const seededCustomers = await db
      .insert(customers)
      .values(
        customerProfiles.map(([phone, streetAddress1, city, zip, dob], index) => ({
          userId: customerUsers[index].id,
          phone,
          streetAddress1,
          city,
          zip,
          dob,
        })),
      )
      .returning();
    console.log("✅ Users, agents, and customers seeded.");

    console.log("⏳ Seeding trips and itineraries...");
    const galleryImages = [
      "https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg",
      "https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg",
      "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg",
      "https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg",
      "https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg",
      "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg",
      "https://images.pexels.com/photos/3152124/pexels-photo-3152124.jpeg",
      "https://images.pexels.com/photos/3408353/pexels-photo-3408353.jpeg",
      "https://images.pexels.com/photos/3889855/pexels-photo-3889855.jpeg",
    ];
    const galleryFor = (cover: string, index: number) => [
      cover,
      galleryImages[index % galleryImages.length],
      galleryImages[(index + 3) % galleryImages.length],
    ];
    const tripDetails = [
      [0, "Paris, France", "New York, USA", "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80", "1200.00", 14, 21, 20, "round-trip"],
      [0, "Vancouver, Canada", "Boston, USA", "https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg", "850.00", 28, 34, 16, "round-trip"],
      [0, "Mexico City, Mexico", "Chicago, USA", "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1200&q=80", "620.00", 42, 47, 18, "round-trip"],
      [1, "Tokyo, Japan", "London, UK", "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg", "1800.00", 18, 28, 15, "one-way"],
      [1, "Rome, Italy", "London, UK", "https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg", "980.00", 35, 41, 22, "round-trip"],
      [1, "Reykjavik, Iceland", "Manchester, UK", "https://images.pexels.com/photos/3408353/pexels-photo-3408353.jpeg", "1120.00", 56, 62, 12, "round-trip"],
      [2, "Santorini, Greece", "Milan, Italy", "https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg", "1450.00", 24, 31, 14, "round-trip"],
      [2, "Barcelona, Spain", "Rome, Italy", "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg", "760.00", 49, 54, 24, "round-trip"],
      [2, "Marrakesh, Morocco", "Paris, France", "https://images.pexels.com/photos/3889855/pexels-photo-3889855.jpeg", "890.00", 70, 76, 18, "round-trip"],
      [3, "Bali, Indonesia", "Sydney, Australia", "https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg", "1320.00", 31, 40, 20, "round-trip"],
      [3, "Queenstown, New Zealand", "Melbourne, Australia", "https://images.unsplash.com/photo-1469521669194-babb45599def?auto=format&fit=crop&w=1200&q=80", "1050.00", 63, 69, 16, "round-trip"],
      [3, "Singapore", "Sydney, Australia", "https://images.pexels.com/photos/3152124/pexels-photo-3152124.jpeg", "940.00", 84, 89, 26, "one-way"],
    ] as const;

    const seededTrips = await db
      .insert(trips)
      .values(
        tripDetails.map(([agentIndex, destination, origin, image, price, departure, returnDay, availableSeats, tripType], index) => ({
          agentId: seededAgents[agentIndex].id,
          destination,
          origin,
          images: galleryFor(image, index),
          price,
          departureDate: dateFromToday(departure).slice(0, 10),
          returnDate: tripType === "round-trip" ? dateFromToday(returnDay).slice(0, 10) : null,
          availableSeats,
          type: tripType,
        })),
      )
      .returning();

    await db.insert(itineraries).values(
      seededTrips.flatMap((trip, index) => [
        { tripId: trip.id, day: 1, activity: `Arrive in ${tripDetails[index][1]} and check in` },
        { tripId: trip.id, day: 2, activity: "Guided local highlights tour" },
        { tripId: trip.id, day: 3, activity: "Free day for independent exploration" },
      ]),
    );
    console.log("✅ Trips and itineraries seeded.");

    console.log("⏳ Seeding bookings, payments, and reviews...");
    const bookingDetails = [
      [0, 0, 2, "confirmed", "2400.00"],
      [1, 3, 1, "pending", "1800.00"],
      [2, 1, 2, "confirmed", "1700.00"],
      [3, 6, 2, "confirmed", "2900.00"],
      [4, 4, 1, "canceled", "980.00"],
      [5, 9, 3, "confirmed", "3960.00"],
      [6, 2, 2, "pending", "1240.00"],
      [7, 7, 1, "confirmed", "760.00"],
      [8, 10, 2, "confirmed", "2100.00"],
      [9, 5, 1, "pending", "1120.00"],
      [0, 8, 2, "confirmed", "1780.00"],
      [2, 11, 1, "confirmed", "940.00"],
    ] as const;

    const seededBookings = await db
      .insert(bookings)
      .values(
        bookingDetails.map(([customerIndex, tripIndex, travelers, status, totalPrice], index) => ({
          customerId: seededCustomers[customerIndex].id,
          tripId: seededTrips[tripIndex].id,
          bookingDate: dateFromToday(-14 + index),
          status,
          travelers,
          totalPrice,
        })),
      )
      .returning();

    await db.insert(payments).values(
      seededBookings
        .filter((_, index) => index !== 4)
        .map((booking, index) => ({
          bookingId: booking.id,
          date: dateFromToday(-13 + index),
          amount: bookingDetails[index < 4 ? index : index + 1][4],
          status: (booking.status === "pending" ? "pending" : "successful") as
            | "pending"
            | "successful",
          method: (index % 3 === 0
            ? "credit card"
            : index % 3 === 1
              ? "debit card"
              : "net banking") as "credit card" | "debit card" | "net banking",
        })),
    );

    await db.insert(reviews).values([
      { customerId: seededCustomers[0].id, tripId: seededTrips[0].id, rating: 5, title: "Wonderful Paris itinerary", comment: "Every transfer and hotel was well organized." },
      { customerId: seededCustomers[2].id, tripId: seededTrips[1].id, rating: 4, title: "Great coastal escape", comment: "A relaxed trip with beautiful scenery." },
      { customerId: seededCustomers[3].id, tripId: seededTrips[6].id, rating: 5, title: "Santorini was unforgettable", comment: "The sunset cruise was the highlight." },
      { customerId: seededCustomers[5].id, tripId: seededTrips[9].id, rating: 5, title: "Excellent Bali holiday", comment: "Perfect balance between activities and free time." },
      { customerId: seededCustomers[7].id, tripId: seededTrips[7].id, rating: 4, title: "Barcelona city break", comment: "Knowledgeable guide and convenient accommodation." },
      { customerId: seededCustomers[8].id, tripId: seededTrips[10].id, rating: 5, title: "Amazing New Zealand views", comment: "The itinerary made the most of a short visit." },
      { customerId: seededCustomers[0].id, tripId: seededTrips[8].id, rating: 4, title: "Memorable Morocco trip", comment: "Great food and a carefully planned route." },
      { customerId: seededCustomers[2].id, tripId: seededTrips[11].id, rating: 5, title: "Singapore made easy", comment: "Smooth travel arrangements from start to finish." },
    ]);
    console.log("✅ Bookings, payments, and reviews seeded.");

    console.log("🎉 Comprehensive database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
    await redis.quit();
  }
}

seed();
