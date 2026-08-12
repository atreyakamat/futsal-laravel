import pkg from 'pg';
import type { Pool as PoolType } from 'pg';
import fs from 'fs';
const { Pool } = pkg;

declare global {
  // eslint-disable-next-line no-var
  var pgPool: PoolType | undefined;
}

type TransactionExecutor = {
  execute<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<[T[]]>;
};

function toPgPlaceholders(sql: string) {
  if (!sql) return '';
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function getLocalPort(): string {
  return process.env.LOCAL_DB_PORT || process.env.DB_PORT || '5432';
}

function resolveDatabaseUrl(rawUrl?: string): string | null {
  return rawUrl || null;
}

function getPoolConfig() {
  // Always prefer DATABASE_URL when it's set — whether it points to a Docker
  // hostname or localhost is encoded in the URL itself, so there's no need
  // to gate this behind a separate IS_DOCKER flag (a forgotten/missing flag
  // previously caused a valid DATABASE_URL to be silently ignored in favor
  // of the 127.0.0.1 fallback below).
  const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: 10,
    };
  }

  // Fallback to individual connection parameters suitable for a local Postgres instance.
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(getLocalPort()),
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'futsal_laravel',
    max: 10,
  };
}

export function resetPool() {
  if (globalThis.pgPool) {
    try {
      globalThis.pgPool.end();
    } catch (_) {}
    globalThis.pgPool = undefined;
  }
}

export function getPool() {
  if (!globalThis.pgPool) {
    globalThis.pgPool = new Pool(getPoolConfig());
  }

  return globalThis.pgPool;
}

export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(toPgPlaceholders(sql), params);
  return (result?.rows || []) as T[];
}

export async function queryOne<T>(sql: string, params: any[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function transaction<T>(callback: (connection: TransactionExecutor) => Promise<T>) {
  const connection = await getPool().connect();

  const runner: TransactionExecutor = {
    async execute<R extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await connection.query(toPgPlaceholders(sql), params);
      return [(result?.rows || []) as R[]];
    },
  };

  try {
    await connection.query('BEGIN');
    const result = await callback(runner);
    await connection.query('COMMIT');
    return result;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}