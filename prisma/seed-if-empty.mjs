// Runs on deploy: seeds the database only if it has no tours yet, so redeploys never wipe live data.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const tours = await db.tour.count();
await db.$disconnect();
if (tours === 0) await import("./seed.mjs");
else console.log(`Database already has ${tours} tours, skipping seed.`);
