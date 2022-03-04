const path = require('path');

const { Pool } = require('pg');
const dotenv = require('dotenv');

const { log } = require('./utils');

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
  log.debug(`Fetching tweets by influencer (${id})...`);
  const url =
    `https://api.twitter.com/2/users/${id}/tweets?tweet.fields=created_at,` +
    `entities,author_id,public_metrics,referenced_tweets&` +
    `expansions=referenced_tweets.id,referenced_tweets.id.author_id&` +
    `start_date=${start.toISOString()}&end_date=${end.toISOString()}&` +
    `max_results=5`;
  const headers = { authorization: `Bearer ${process.env.TWITTER_TOKEN}` };
  const res = await fetch(url, { headers });
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
        created_at,
        insider_score,
        personal_rank,
        rank,
        social_account
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `,
    [
      '44196397',
      '8403680236',
      961.3900146484375,
      -0.03799999877810478,
      new Date('2022-03-04T00:00:00Z'),
      0.8322759866714478,
      Number('1'),
      Number('1'),
      {
        created_at: new Date('2009-06-02T20:12:29Z'),
        followers_count: Number('76287234'),
        following_count: Number('112'),
        id: '44196397',
        name: 'Elon Musk',
        personal: true,
        profile_image_url:
          'https://pbs.twimg.com/profile_images/1489375145684873217/3VYnFrzx_normal.jpg',
        screen_name: 'elonmusk',
        tweets_count: Number('17041'),
        updated_at: new Date('2022-03-04T00:55:43Z'),
      },
    ]
  );
  const t = await getTweet('44196397');
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
      ) VALUES(
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
      t.entities?.urls ?? [],
      t.entities?.mentions ?? [],
      t.entities?.annotations ?? [],
      t.entities?.hashtags ?? [],
      t.entities?.cashtags ?? [],
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
