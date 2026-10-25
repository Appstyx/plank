import pg from "pg";

// One pool per server process; Next's dev server reloads modules, so it's kept on globalThis there.
const globalForDb = globalThis as unknown as { pool?: pg.Pool };
const pool = (globalForDb.pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL }));

export async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  return (await pool.query<T>(text, values)).rows;
}

export async function one<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(text, values))[0];
}

export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
