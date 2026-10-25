// Applies the SQL files in migrations/ that haven't run yet, in name order, each in its own transaction.
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
const { rows } = await client.query<{ name: string }>("select name from schema_migrations");
const applied = new Set(rows.map((row) => row.name));

const dir = new URL("../migrations/", import.meta.url);
for (const name of (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort()) {
  if (applied.has(name)) continue;
  await client.query("begin");
  try {
    await client.query(await readFile(new URL(name, dir), "utf8"));
    await client.query("insert into schema_migrations (name) values ($1)", [name]);
    await client.query("commit");
    console.log(`applied ${name}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
await client.end();
