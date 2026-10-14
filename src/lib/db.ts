import { neon } from "@neondatabase/serverless";

type SqlRow = Record<string, any>;

type SqlTag = (
  strings: TemplateStringsArray,
  ...values: any[]
) => Promise<SqlRow[]>;

let client: ReturnType<typeof neon> | null = null;

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!client) {
    client = neon(databaseUrl);
  }

  return client;
}

export const sql: SqlTag = (strings, ...values) =>
  getSqlClient()(strings, ...values) as unknown as Promise<SqlRow[]>;
