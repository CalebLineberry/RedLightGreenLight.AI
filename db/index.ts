import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 1,

  // PgBouncer pooler (6543) best-practice:
  prepare: false,       // ✅ critical for transaction pooling
  idle_timeout: 20,     // ✅ proactively drop idle connections
  connect_timeout: 10,  // ✅ fail fast instead of hanging
});

export const db = drizzle(client);
