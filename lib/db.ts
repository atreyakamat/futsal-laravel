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

function resolveDatabaseUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;

  const isInsideDocker = fs.existsSync('/.dockerenv') || process.env.IS_DOCKER === 'true';
  if (!isInsideDocker && (rawUrl.includes('@postgres:') || rawUrl.includes('@postgres/'))) {
    return rawUrl
      .replace(/@postgres:5432/g, '@127.0.0.1:5434')
      .replace(/@postgres:5434/g, '@127.0.0.1:5434')
      .replace(/@postgres\//g, '@127.0.0.1:5434/');
  }
  return rawUrl;
}

function getPoolConfig() {
  const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: 10,
    };
  }

  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? '5434'),
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
  try {
    const pool = getPool();
    const result = await pool.query(toPgPlaceholders(sql), params);
    return (result?.rows || []) as T[];
  } catch (err: any) {
    // If running outside Docker and cached pool was using "postgres", self-heal by clearing pool and connecting to 127.0.0.1:5434
    if (err?.code === 'ENOTFOUND' && (err?.hostname === 'postgres' || String(err?.message).includes('postgres'))) {
      console.warn('[DB Self-Heal] "postgres" host not found on local network — reconnecting to 127.0.0.1:5434...');
      if (process.env.DATABASE_URL) {
        process.env.DATABASE_URL = process.env.DATABASE_URL
          .replace(/@postgres:5432/g, '@127.0.0.1:5434')
          .replace(/@postgres:/g, '@127.0.0.1:5434');
      }
      resetPool();
      const retryPool = getPool();
      const retryResult = await retryPool.query(toPgPlaceholders(sql), params);
      return (retryResult?.rows || []) as T[];
    }
    throw err;
  }
}

export async function queryOne<T>(sql: string, params: any[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function transaction<T>(callback: (connection: TransactionExecutor) => Promise<T>) {
  let connection;
  try {
    connection = await getPool().connect();
  } catch (err: any) {
    if (err?.code === 'ENOTFOUND' && (err?.hostname === 'postgres' || String(err?.message).includes('postgres'))) {
      if (process.env.DATABASE_URL) {
        process.env.DATABASE_URL = process.env.DATABASE_URL
          .replace(/@postgres:5432/g, '@127.0.0.1:5434')
          .replace(/@postgres:/g, '@127.0.0.1:5434');
      }
      resetPool();
      connection = await getPool().connect();
    } else {
      throw err;
    }
  }

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