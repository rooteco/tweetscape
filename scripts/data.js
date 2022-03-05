// node.js module script to seed a postgresql database of all the available
// (3200) tweets from each of the (1300) influencers from a given hive cluster.
// i do this instead of simply using twitter's api directly as a postgresql
// database doesn't have any rate limits and can be deployed on fly to be close
// to our serverless deployments (and thus very fast to query).

const path = require('path');

const Bottleneck = require('bottleneck');
const { Pool } = require('pg');
const dotenv = require('dotenv');

const { caps, fetchFromCache, log } = require('./utils');

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

// twitter api rate limit: max 1500 timeline API requests per 15 mins per app.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const twitter = new Bottleneck({
  reservoir: 1500,
  reservoirRefreshInterval: 15 * 60 * 1000,
  reservoirRefreshAmount: 1500,
});
const fetchFromTwitter = twitter.wrap(fetchFromCache);

async function getInfluencers(t, pg = 0) {
  log.debug(`Fetching influencers (${pg}) for topic (${t})...`);
  const url =
    `https://api.borg.id/influence/clusters/${caps(t)}/influencers?` +
    `page=${pg}&sort_by=score&sort_direction=desc&influence_type=all`;
  const headers = { authorization: `Token ${process.env.HIVE_TOKEN}` };
  return (await fetchFromCache(url, { headers })).json();
}

async function getTweets(id, start, end, token = '', tweets = []) {
  const msg =
    `Fetching tweets (${start.toDateString()}–${end.toDateString()}) ` +
    `(${token}) by influencer (${id})...`;
  log.debug(msg);
  const url =
    `https://api.twitter.com/2/users/${id}/tweets?tweet.fields=created_at,` +
    `entities,author_id,public_metrics,referenced_tweets&` +
    `expansions=referenced_tweets.id,referenced_tweets.id.author_id&` +
    `start_time=${start.toISOString()}&end_time=${end.toISOString()}&` +
    `max_results=100${token ? `&pagination_token=${token}` : ''}`;
  const headers = { authorization: `Bearer ${process.env.TWITTER_TOKEN}` };
  const res = await fetchFromTwitter(url, { headers });
  const data = await res.json();
  if (data.errors && data.title && data.detail && data.type)
    log.error(`${data.title}: ${data.detail} (${data.type})`);
  log.debug(`Fetched ${data.meta?.result_count} tweets by influencer (${id}).`);
  tweets.push(data);
  if (!data.meta?.next_token) return tweets;
  return getTweets(id, data.meta.next_token, tweets);
}

async function data(topic, start, end, db) {
  const { total, ...data } = await getInfluencers(topic, 0);
  // 1. Fetch all 10-15K influencers from Hive in parallel (pages of 100).
  log.info(`Fetching ${total} influencers from Hive (in pages of 100)...`);
  const arr = Array(Math.ceil(Number(total) / 50)).fill(null);
  await Promise.all(
    arr.map(async (_, pg) => {
      const { influencers } = pg === 0 ? data : await getInfluencers(topic, pg);
      // 2. Fetch the last day of tweets from each influencer's timeline.
      log.info(`Fetching tweets from ${influencers.length} timelines...`);
      await Promise.all(
        influencers.map(async (i) => {
          // 3. Store each influencer in PostgreSQL database.
          const s = i.social_account.social_account;
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
              i.social_account.social_account.id,
              i.id,
              i.attention_score,
              i.attention_score_change_week,
              i.insider_score,
              Number(i.personal_rank),
              Number(i.rank),
              new Date(s.created_at),
              Number(s.followers_count),
              Number(s.following_count),
              s.id,
              s.name,
              s.personal,
              s.profile_image_url,
              s.screen_name,
              Number(s.tweets_count),
              new Date(s.updated_at),
            ]
          );
          // 4. Store each tweet in PostgreSQL database.
          await Promise.all(
            (
              await getTweets(i.social_account.social_account.id, start, end)
            )
              .reduce((a, b) => [...a, ...(b.data ?? [])], [])
              .map(async (t) => {
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
                    t.entities?.urls?.map(obj) ?? [],
                    t.entities?.mentions?.map(obj) ?? [],
                    t.entities?.annotations?.map(obj) ?? [],
                    t.entities?.hashtags?.map(obj) ?? [],
                    t.entities?.cashtags?.map(obj) ?? [],
                    new Date(t.created_at),
                  ]
                );
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
              })
          );
        })
      );
    })
  );
}

if (require.main === module) {
  (async () => {
    // monthly cap - 500k per month (or 2M per month).
    // rate limit - 1500 tweets per 15 mins (max to last 7 days of tweets).
    // hive - 11 clusters, each with ~10-15K influencers.
    // thus, i only fetch the last day's worth of tweets from each influencer.
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const end = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)
    const db = await pool.connect();
    const intervalId = setInterval(() => {
      const c = twitter.counts();
      const msg =
        `RECEIVED: ${c.RECEIVED} - QUEUED: ${c.QUEUED} - ` +
        `RUNNING: ${c.RUNNING} - EXECUTING: ${c.EXECUTING} - DONE: ${c.DONE}`;
      log.debug(msg);
    }, 2500);
    try {
      await db.query('BEGIN');
      await data('tesla', start, end, db);
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    } finally {
      db.release();
      clearInterval(intervalId);
    }
  })().catch((e) => log.error(e.stack));
}
