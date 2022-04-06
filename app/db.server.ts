import type { IDatabase } from 'pg-promise';
import { PrismaClient } from '@prisma/client';
import array from 'postgres-array';
import bigjson from 'json-bigint';
import invariant from 'tiny-invariant';
import pgPromise from 'pg-promise';

import { log } from '~/utils.server';

type Pool = IDatabase<Record<string, never>>;

function getDatabaseURL(): string {
  const { DATABASE_URL } = process.env;
  invariant(typeof DATABASE_URL === 'string', 'DATABASE_URL env var not set');
  const databaseUrl = new URL(DATABASE_URL);
  const isLocalHost = databaseUrl.hostname === 'localhost';
  const PRIMARY_REGION = isLocalHost ? null : process.env.PRIMARY_REGION;
  const FLY_REGION = isLocalHost ? null : process.env.FLY_REGION;
  const isReadReplicaRegion = !PRIMARY_REGION || PRIMARY_REGION === FLY_REGION;
  if (!isLocalHost) {
    databaseUrl.host = `${FLY_REGION}.${databaseUrl.host}`;
    if (!isReadReplicaRegion) {
      // 5433 is the read-replica port
      databaseUrl.port = '5433';
    }
  }
  log.info(`Setting up prisma client to: ${databaseUrl.host}`);
  return databaseUrl.toString();
}

function getClient(): PrismaClient {
  // NOTE: during development if you change anything in this function, remember
  // that this only runs once per server restart and won't automatically be
  // re-run per request like everything else is. So if you need to change
  // something in this file, you'll need to manually restart the server.
  const client = new PrismaClient({
    datasources: { db: { url: getDatabaseURL() } },
  });
  // connect eagerly
  void client.$connect();
  return client;
}

function parseBigInteger(value: string) {
  return BigInt(value);
}

function parseBigIntegerArray(value: string) {
  return array.parse(value, (entry) => parseBigInteger(entry));
}

function parseJson(value: string) {
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
  return bigjson.parse(value);
}

function parseJsonArray(value: string) {
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
  return array.parse(value, parseJson);
}

/**
 * Not only do I have to update the type parsers for `int8` but I also have to
 * ensure that JSON `int8` values don't lose precision.
 * @see {@link https://github.com/brianc/node-pg-types/blob/master/lib/textParsers.js#L177-L180}
 * @see {@link https://github.com/vitaly-t/pg-promise/issues/754#issuecomment-1087125815}
 * @see {@link https://stackoverflow.com/a/18755261}
 * @see {@link https://github.com/tc39/proposal-json-parse-with-source}
 */
function getPool(): Pool {
  const pgp = pgPromise();
  pgp.pg.types.setTypeParser(20, parseBigInteger);
  pgp.pg.types.setTypeParser(1016, parseBigIntegerArray);
  pgp.pg.types.setTypeParser(114, parseJson);
  pgp.pg.types.setTypeParser(3802, parseJson);
  pgp.pg.types.setTypeParser(199, parseJsonArray);
  pgp.pg.types.setTypeParser(3807, parseJsonArray);
  const pool = pgp(getDatabaseURL());
  return pool;
}

let pool: Pool;
let db: PrismaClient;

declare global {
  var __db__: PrismaClient;
  var __pool__: Pool;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// in production we'll have a single connection to the DB.
if (process.env.NODE_ENV === 'production') {
  db = getClient();
  pool = getPool();
} else {
  if (!global.__db__) global.__db__ = getClient();
  db = global.__db__;
  if (!global.__pool__) global.__pool__ = getPool();
  pool = global.__pool__;
}

export { db, pool };
