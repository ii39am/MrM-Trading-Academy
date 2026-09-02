import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const schemaName = "phase5_migration_validation_20260901";
if (!/^phase5_migration_validation_[0-9]+$/.test(schemaName))
  throw new Error("Unsafe disposable schema name");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const parsed = new URL(process.env.DATABASE_URL);
parsed.searchParams.set("schema", schemaName);
const validationUrl = parsed.toString();
const client = new PrismaClient({ datasourceUrl: validationUrl });

try {
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: validationUrl,
      // This isolated schema has one migration process. Neon poolers do not
      // reliably support PostgreSQL session advisory locks.
      PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
    },
    shell: process.platform === "win32",
  });
  const rows = await client.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "${schemaName}"."CourseAccessGrant"`,
  );
  if (rows[0]?.count !== 0) throw new Error("Unexpected disposable migration data");
  console.log(`Disposable migration schema validated: ${schemaName}`);
} finally {
  await client.$executeRawUnsafe(`DROP SCHEMA "${schemaName}" CASCADE`);
  await client.$disconnect();
  console.log(`Disposable migration schema removed: ${schemaName}`);
}
