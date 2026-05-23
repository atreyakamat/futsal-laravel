import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

type TransactionExecutor = {
  execute<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<[T[]]>;
};

function toPgPlaceholders(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function getPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: 10,
    };
  }

  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? '5432'),
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'futsal_laravel',
    max: 10,
  };
}

export function getPool() {
  if (!globalThis.pgPool) {
    globalThis.pgPool = new Pool(getPoolConfig());
  }

  return globalThis.pgPool;
}

export async function query<T>(sql: string, params: any[] = []) {
  const result = await getPool().query(toPgPlaceholders(sql), params);
  return result.rows as T[];
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
      return [result.rows as R[]];
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