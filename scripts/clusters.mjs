import fetch from 'node-fetch';
import format from 'pg-format';

import { log } from './utils';
import { pool } from './shared';

(async () => {
  const db = await pool.connect();
  log.info('Fetching clusters...');
  const url = 'https://api.borg.id/influence/clusters';
  const headers = { authorization: `Token ${process.env.HIVE_TOKEN}` };
  const data = await (await fetch(url, { headers })).json();
  log.debug(`Data: ${JSON.stringify(data, null, 2)}`);
  log.info(`Inserting ${data.clusters.length} clusters...`);
  const query = format(
    `INSERT INTO clusters VALUES %L`,
    data.clusters.map((c) => [
      c.id,
      c.name,
      c.name.toLowerCase(),
      c.active,
      new Date(c.created_at),
      new Date(c.updated_at),
    ])
  );
  log.debug(`Query: ${query}`);
  await db.query(query);
  await db.release();
  log.info(`Inserted ${data.clusters.length} clusters.`);
})().catch((e) => log.error(`Caught error: ${e.stack}`));
