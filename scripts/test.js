const path = require('path');

const { Pool } = require('pg');
const dotenv = require('dotenv');

const { fetchFromCache, log } = require('./utils');

// follow the next.js convention for loading `.env` files.
// @see {@link https://nextjs.org/docs/basic-features/environment-variables}
const env = process.env.NODE_ENV || 'development';
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
    `max_results=5`;
  const headers = { authorization: `Bearer ${process.env.TWITTER_TOKEN}` };
  const res = await fetchFromCache(url, { headers });
  const data = await res.json();
  if (data.errors && data.title && data.detail && data.type)
    log.error(`${data.title}: ${data.detail} (${data.type})`);
  log.debug(`Fetched ${data.meta?.result_count} tweets by influencer (${id}).`);
  log.trace(`Data: ${JSON.stringify(data, null, 2)}`);
  return [data];
}

async function insertTweet(t, db) {
  log.debug(`Inserting tweet (${t.id})...`);
  const values = [
    t.id,
    t.author_id,
    t.text,
    t.public_metrics.retweet_count,
    t.public_metrics.reply_count,
    t.public_metrics.like_count,
    t.public_metrics.quote_count,
    new Date(t.created_at),
  ];
  try {
    await db.query(
      `
      INSERT INTO tweets (
        id,
        author_id,
        text,
        retweet_count,
        reply_count,
        like_count,
        quote_count,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) ON CONFLICT (id) DO NOTHING;
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting tweet (${t.id}): ${e.stack}`);
    log.debug(`Tweet (${t.id}): ${JSON.stringify(values, null, 2)}`);
  }
}

async function insertRef(r, t, db) {
  log.debug(`Inserting ${r.type} tweet (${r.id})...`);
  const values = [r.id, t.id, r.type];
  try {
    await db.query(
      `
      INSERT INTO refs (
        referenced_tweet_id,
        referencer_tweet_id,
        type
      ) VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT refs_pkey DO NOTHING;
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting ref (${r.id}): ${e.stack}`);
    log.debug(`Ref (${r.id}): ${JSON.stringify(values, null, 2)}`);
    throw e;
  }
}

async function insertInfluencer(i, db) {
  log.debug(`Inserting influencer ${i.name} (${i.id})...`);
  const values = [i.id, i.name, i.username];
  try {
    await db.query(
      `
      INSERT INTO influencers (
        id,
        name,
        username
      ) VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING;
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting influencer ${i.name} (${i.id}): ${e.stack}`);
    log.debug(`${i.name} (${i.id}): ${JSON.stringify(values, null, 2)}`);
  }
}

async function data(db) {
  log.debug('Inserting influencer into database...');
  await db.query(
    `
    INSERT INTO influencers (
      id,
      hive_id,
      attention_score,
      attention_score_change_week,
      insider_score,
      organization_rank,
      personal_rank,
      rank,
      created_at,
      followers_count,
      following_count,
      tweets_count,
      name,
      username,
      profile_image_url,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    ) ON CONFLICT (id) DO UPDATE SET (
      id,
      hive_id,
      attention_score,
      attention_score_change_week,
      insider_score,
      organization_rank,
      personal_rank,
      rank,
      created_at,
      followers_count,
      following_count,
      tweets_count,
      name,
      username,
      profile_image_url,
      updated_at
    ) = ROW (excluded.*) WHERE influencers IS DISTINCT FROM excluded;
    `,
    [
      '44196397',
      '8403680236',
      961.3900146484375,
      -0.03799999877810478,
      0.8322759866714478,
      null,
      Number('1'),
      Number('1'),
      new Date('2009-06-02T20:12:29Z'),
      Number('76287234'),
      Number('112'),
      Number('17041'),
      'Elon Musk',
      'elonmusk',
      'https://pbs.twimg.com/profile_images/1489375145684873217/3VYnFrzx_normal.jpg',
      new Date('2022-03-04T00:55:43Z'),
    ]
  );
  const tweets = await getTweets('44196397');
  const users = tweets.reduce(
    (a, b) => [...a, ...(b.includes?.users ?? [])],
    []
  );
  await Promise.all(users.map((u) => insertInfluencer(u, db)));
  const referencedTweets = tweets.reduce(
    (a, b) => [...a, ...(b.includes?.tweets ?? [])],
    []
  );
  await Promise.all(referencedTweets.map((t) => insertTweet(t, db)));
  const elonTweets = tweets.reduce((a, b) => [...a, ...(b.data ?? [])], []);
  await Promise.all(
    elonTweets.map(async (t) => {
      await insertTweet(t, db);
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
