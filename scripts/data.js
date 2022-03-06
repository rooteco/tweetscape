// node.js module script to seed a postgresql database of all the available
// (3200) tweets from each of the (1300) influencers from a given hive cluster.
// i do this instead of simply using twitter's api directly as a postgresql
// database doesn't have any rate limits and can be deployed on fly to be close
// to our serverless deployments (and thus very fast to query).

const path = require('path');

const Bottleneck = require('bottleneck');
const { Pool } = require('pg');
const dotenv = require('dotenv');

const {
  insertRef,
  insertTag,
  insertAnnotation,
  insertMention,
  insertURL,
  insertTweet,
  insertInfluencer,
  insertUser,
} = require('./sql');
const { caps, fetchFromCache, log } = require('./utils');

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

// twitter api rate limit: max 1500 timeline API requests per 15 mins per app.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const twitter = new Bottleneck({
  reservoir: 1500,
  reservoirRefreshInterval: 15 * 60 * 1000,
  reservoirRefreshAmount: 1500,
  trackDoneStatus: true,
});
const fetchFromTwitter = twitter.wrap(fetchFromCache);

const TWEET_FIELDS = [
  'created_at',
  'entities',
  'author_id',
  'public_metrics',
  'referenced_tweets',
];
const EXPANSIONS = [
  'referenced_tweets.id',
  'referenced_tweets.id.author_id',
  'entities.mentions.username',
];

async function getTweets(
  id,
  start,
  end,
  lastTweetId = '',
  token = '',
  tweets = []
) {
  const msg =
    `Fetching tweets (${start.toDateString()}–${end.toDateString()}) ` +
    `${token ? `(${token}) ` : ''}by influencer (${id})...`;
  log.debug(msg);
  const url =
    `https://api.twitter.com/2/users/${id}/tweets?` +
    `tweet.fields=${TWEET_FIELDS.join()}&expansions=${EXPANSIONS.join()}&` +
    `start_time=${start.toISOString()}&end_time=${end.toISOString()}&` +
    `max_results=100${token ? `&pagination_token=${token}` : ''}` +
    `${lastTweetId ? `&since_id=${lastTweetId}` : ''}`;
  const headers = { authorization: `Bearer ${process.env.TWITTER_TOKEN}` };
  const res = await fetchFromTwitter(url, { headers });
  const data = await res.json();
  if (data.errors && data.title && data.detail && data.type)
    log.error(`${data.title}: ${data.detail} (${data.type})`);
  log.debug(`Fetched ${data.meta?.result_count} tweets by influencer (${id}).`);
  tweets.push(data);
  if (!data.meta?.next_token) return tweets;
  return getTweets(id, start, end, lastTweetId, data.meta.next_token, tweets);
}

async function getInfluencers(t, pg = 0) {
  log.debug(`Fetching influencers (${pg}) for topic (${t})...`);
  const url =
    `https://api.borg.id/influence/clusters/${caps(t)}/influencers?` +
    `page=${pg}&sort_by=score&sort_direction=desc&influence_type=all`;
  const headers = { authorization: `Token ${process.env.HIVE_TOKEN}` };
  return (await fetchFromCache(url, { headers })).json();
}

async function data(topic, start, end, db) {
  const { total, ...data } = await getInfluencers(topic, 0);
  // 1. Fetch all 10-15K influencers from Hive in parallel (pages of 100).
  log.info(`Fetching ${total} influencers from Hive (in pages of 100)...`);
  const arr = Array(Math.ceil(Number(total) / 50)).fill(null);
  await Promise.all(
    arr.map(async (_, pg) => {
      if (pg > 0) return log.trace(`Skipping page (${pg}) for now...`);
      const { influencers } = pg === 0 ? data : await getInfluencers(topic, pg);
      // 2. Fetch the last day of tweets from each influencer's timeline.
      log.info(`Fetching tweets from ${influencers.length} timelines...`);
      await Promise.all(
        influencers.map(async (i, idx) => {
          // 3. Store each influencer in PostgreSQL database.
          const s = i.social_account.social_account;
          log.debug(`Selecting last tweet for ${s.name} (${s.id})...`);
          // TODO: This is messed up by referenced tweets.
          //const res = await db.query(
          //`
          //SELECT id FROM tweets WHERE author_id = $1
          //ORDER BY created_at DESC LIMIT 1
          //`,
          //[s.id]
          //);
          //let lastTweetId = '';
          //if (res.rows[0]) {
          //lastTweetId = res.rows[0].id;
          //log.debug(`Found ${s.name}'s last tweet: ${lastTweetId}`);
          //}
          await insertInfluencer(i, s, db);
          // 4. Store each tweet in PostgreSQL database.
          const data = await getTweets(s.id, start, end);
          const users = data.reduce(
            (a, b) => [...a, ...(b.includes?.users ?? [])],
            []
          );
          await Promise.all(users.map((u) => insertUser(u, db)));
          const referencedTweets = data.reduce(
            (a, b) => [...a, ...(b.includes?.tweets ?? [])],
            []
          );
          await Promise.all(referencedTweets.map((t) => insertTweet(t, db)));
          const tweets = data.reduce((a, b) => [...a, ...(b.data ?? [])], []);
          log.trace(`Tweets: ${JSON.stringify(tweets, null, 2)}`);
          await Promise.all(
            tweets.map(async (t) => {
              await insertTweet(t, db);
              const entities = t.entities ?? {};
              const promises = [
                entities.urls?.map((u) => insertURL(u, t, db)),
                entities.mentions?.map((m) => insertMention(m, t, db)),
                entities.annotations?.map((a) => insertAnnotation(a, t, db)),
                entities.hashtags?.map((h) => insertTag(h, t, db, 'hashtag')),
                entities.cashtags?.map((h) => insertTag(h, t, db, 'cashtag')),
                t.referenced_tweets?.map((r) => insertRef(r, t, db)),
              ];
              await Promise.all(promises.flat());
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
    const start = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 6);
    const end = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)
    const db = await pool.connect();
    const intervalId = setInterval(() => {
      const c = twitter.counts();
      const msg =
        `Twitter API calls: ${c.RECEIVED} received, ${c.QUEUED} queued, ` +
        `${c.RUNNING} running, ${c.EXECUTING} executing, ${c.DONE} done.`;
      log.debug(msg);
    }, 2500);
    try {
      log.info('Beginning database transaction...');
      await db.query('BEGIN');
      await data('tesla', start, end, db);
      log.info('Committing database transaction...');
      await db.query('COMMIT');
    } catch (e) {
      log.warn(`Rolling back database transaction (${e.message})...`);
      await db.query('ROLLBACK');
      throw e;
    } finally {
      log.info('Releasing database connection...');
      clearInterval(intervalId);
      await db.release();
    }
  })().catch((e) => log.error(`Caught error: ${e.stack}`));
}
