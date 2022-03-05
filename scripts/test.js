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

async function getTweet(id) {
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
  log.debug(`Data: ${JSON.stringify(data, null, 2)}`);
  return data.data[0];
}

async function data(db) {
  log.debug('Inserting influencer into database...');
  await db.query(
    `
      INSERT INTO influencers(
        twitter_id,
        hive_id,
        attention_score,
        attention_score_change_week,
        insider_score,
        personal_rank,
        rank,
        created_at,
        followers_count,
        following_count,
        name,
        personal,
        profile_image_url,
        screen_name,
        tweets_count,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      );
    `,
    [
      '44196397',
      '8403680236',
      961.3900146484375,
      -0.03799999877810478,
      0.8322759866714478,
      Number('1'),
      Number('1'),
      new Date('2009-06-02T20:12:29Z'),
      Number('76287234'),
      Number('112'),
      'Elon Musk',
      true,
      'https://pbs.twimg.com/profile_images/1489375145684873217/3VYnFrzx_normal.jpg',
      'elonmusk',
      Number('17041'),
      new Date('2022-03-04T00:55:43Z'),
    ]
  );
  const t = await getTweet('44196397');
  const obj = (o) => `(${Object.values(o).join()})`;
  await db.query(
    `
      INSERT INTO tweets(
        twitter_id,
        author_id,
        text,
        retweet_count,
        reply_count,
        like_count,
        quote_count,
        urls,
        mentions,
        annotations,
        hashtags,
        cashtags,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      );
    `,
    [
      t.id,
      t.author_id,
      t.text,
      t.public_metrics.retweet_count,
      t.public_metrics.reply_count,
      t.public_metrics.like_count,
      t.public_metrics.quote_count,
      t.entities?.urls?.map(obj) ?? [],
      t.entities?.mentions?.map(obj) ?? [],
      t.entities?.annotations?.map(obj) ?? [],
      t.entities?.hashtags?.map(obj) ?? [],
      t.entities?.cashtags?.map(obj) ?? [],
      new Date(t.created_at),
    ]
  );
  log.debug(`Inserting ${t.referenced_tweets.length} referenced tweets...`);
  await Promise.all(
    t.referenced_tweets.map(async (r) => {
      await db.query(
        `
        INSERT INTO tweet_refs(
          twitter_id,
          type,
          referencer_tweet_id
        ) VALUES($1, $2, $3);
      `,
        [r.id, r.type, t.id]
      );
    })
  );
}

if (require.main === module) {
  (async () => {
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await data(db);
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    } finally {
      db.release();
    }
  })().catch((e) => log.error(e.stack));
}
