const path = require('path');

const { Pool } = require('pg');
const dotenv = require('dotenv');

const {
  insertRef,
  insertTweet,
  insertInfluencer,
  insertUser,
} = require('./sql');
const { fetchFromCache, log } = require('./utils');

// follow the next.js convention for loading `.env` files.
// @see {@link https://nextjs.org/docs/basic-features/environment-variables}
const env = process.env.NODE_ENV ?? 'development';
[
  path.resolve(__dirname, `../.env.${env}.local`),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, `../.env.${env}`),
  path.resolve(__dirname, '../.env'),
].forEach((dotfile) => {
  log.info(`Loaded env from ${dotfile}`);
  dotenv.config({ path: dotfile });
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getTweets(id) {
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 6);
  const end = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  const msg =
    `Fetching tweets (${start.toDateString()}–${end.toDateString()}) ` +
    `by influencer (${id})...`;
  log.debug(msg);
  const url =
    `https://api.twitter.com/2/users/${id}/tweets?tweet.fields=created_at,` +
    `entities,author_id,public_metrics,referenced_tweets&` +
    `expansions=referenced_tweets.id,referenced_tweets.id.author_id&` +
    `start_time=${start.toISOString()}&end_time=${end.toISOString()}&` +
    `max_results=100`;
  const headers = { authorization: `Bearer ${process.env.TWITTER_TOKEN}` };
  const res = await fetchFromCache(url, { headers });
  const data = await res.json();
  if (data.errors && data.title && data.detail && data.type)
    log.error(`${data.title}: ${data.detail} (${data.type})`);
  log.debug(`Fetched ${data.meta?.result_count} tweets by influencer (${id}).`);
  log.debug(`Data: ${JSON.stringify(data, null, 2)}`);
  return [data];
}

async function data(db) {
  log.debug('Inserting influencer into database...');
  const s = {
    id: '44196397',
    created_at: '2009-06-02T20:12:29Z',
    followers_count: '76287234',
    following_count: '112',
    tweets_count: '17041',
    name: 'Elon Musk',
    screen_name: 'elonmusk',
    profile_image_url:
      'https://pbs.twimg.com/profile_images/1489375145684873217/3VYnFrzx_normal.jpg',
    updated_at: '2022-03-04T00:55:43Z',
  };
  const i = {
    id: '8403680236',
    attention_score: 961.3900146484375,
    attention_score_change_week: -0.03799999877810478,
    insider_score: 0.8322759866714478,
    // some dev on the hive.one team is british and spells with an "s"
    organisation_rank: null,
    personal_rank: '1',
    rank: '1',
  };
  await insertInfluencer(i, s, db);
  const tweets = await getTweets('44196397');
  const users = tweets.reduce(
    (a, b) => [...a, ...(b.includes?.users ?? [])],
    []
  );
  await Promise.all(users.map((u) => insertUser(u, db)));
  const referencedTweets = tweets.reduce(
    (a, b) => [...a, ...(b.includes?.tweets ?? [])],
    []
  );
  await Promise.all(referencedTweets.map((t) => insertTweet(t, db)));
  const elonTweets = tweets.reduce((a, b) => [...a, ...(b.data ?? [])], []);
  await Promise.all(
    elonTweets.map(async (t) => {
      await insertTweet(t, db);
      if (!(t.referenced_tweets instanceof Array)) return;
      log.debug(`Inserting ${t.referenced_tweets.length} referenced tweets...`);
      await Promise.all(t.referenced_tweets.map((r) => insertRef(r, t, db)));
    })
  );
}

if (require.main === module) {
  (async () => {
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)
    const db = await pool.connect();
    try {
      log.info('Beginning database transaction...');
      await db.query('BEGIN');
      await data(db);
      log.info('Committing database transaction...');
      await db.query('COMMIT');
    } catch (e) {
      log.warn('Rolling back database transaction...');
      await db.query('ROLLBACK');
      throw e;
    } finally {
      log.info('Releasing database connection...');
      await db.release();
    }
  })().catch((e) => log.error(e.stack));
}
