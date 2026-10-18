// Production build step: switch the Prisma datasource to PostgreSQL when DATABASE_URL points to Postgres.
// Local development keeps SQLite (prisma/schema.prisma is committed with provider = "sqlite").
import fs from "node:fs";

const url = process.env.DATABASE_URL ?? "";
if (/^postgres(ql)?:\/\//.test(url)) {
  const file = new URL("../prisma/schema.prisma", import.meta.url);
  let schema = fs.readFileSync(file, "utf8").replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  // Neon: the app queries through the pooled DATABASE_URL; schema pushes need the direct (unpooled) connection
  if (process.env.DATABASE_URL_UNPOOLED && !schema.includes("directUrl")) {
    schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url       = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL_UNPOOLED")');
  }
  fs.writeFileSync(file, schema);
  console.log(`Prisma datasource: postgresql${schema.includes("directUrl") ? " (direct URL for schema changes)" : ""}`);
} else {
  console.log("Prisma datasource: sqlite (DATABASE_URL is not a postgres URL)");
}
