// Production build step: switch the Prisma datasource to PostgreSQL when DATABASE_URL points to Postgres.
// Local development keeps SQLite (prisma/schema.prisma is committed with provider = "sqlite").
import fs from "node:fs";

const url = process.env.DATABASE_URL ?? "";
if (/^postgres(ql)?:\/\//.test(url)) {
  const file = new URL("../prisma/schema.prisma", import.meta.url);
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"'));
  console.log("Prisma datasource: postgresql");
} else {
  console.log("Prisma datasource: sqlite (DATABASE_URL is not a postgres URL)");
}
