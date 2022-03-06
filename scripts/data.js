// node.js module script to seed a postgresql database of all the available
// (3200) tweets from each of the (1300) influencers from a given hive cluster.
// i do this instead of simply using twitter's api directly as a postgresql
// database doesn't have any rate limits and can be deployed on fly to be close
// to our serverless deployments (and thus very fast to query).

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
const { pool, twitter, getTweets, getInfluencers } = require('./shared');
const { log } = require('./utils');

async function data(topic, start, end, db) {
  const { total, ...data } = await getInfluencers(topic, 0);
  log.info(`Fetching ${total} influencers from Hive (in pages of 100)...`);
  const arr = Array(Math.ceil(Number(total) / 50)).fill(null);
  await Promise.all(
    arr.map(async (_, pg) => {
      if (pg > 0) return log.trace(`Skipping page (${pg}) for now...`);
      const { influencers } = pg === 0 ? data : await getInfluencers(topic, pg);
      log.info(`Fetching tweets from ${influencers.length} timelines...`);
      await Promise.all(
        influencers.map(async (i) => {
          const s = i.social_account.social_account;
          await insertInfluencer(i, s, db);
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
