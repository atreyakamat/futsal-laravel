import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: mysql.Pool | undefined;
}

function getDatabaseUrl(): mysql.PoolOptions {
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'futsal_laravel',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  };
}

export function getPool() {
  if (!globalThis.mysqlPool) {
    globalThis.mysqlPool = mysql.createPool(getDatabaseUrl());
  }

  return globalThis.mysqlPool;
}

export async function query<T>(sql: string, params: any[] = []) {
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function queryOne<T>(sql: string, params: any[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}