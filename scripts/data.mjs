// node.js module script to seed a postgresql database of all the available
// (3200) tweets from each of the (1300) influencers from a given hive cluster.
// i do this instead of simply using twitter's api directly as a postgresql
// database doesn't have any rate limits and can be deployed on fly to be close
// to our serverless deployments (and thus very fast to query).

import {
  insertRefs,
  insertTags,
  insertAnnotations,
  insertMentions,
  insertURLs,
  insertTweets,
  insertInfluencers,
  insertUsers,
} from './sql.mjs';
import { pool, limiter, getTweets, getInfluencers } from './shared.mjs';
import { log } from './utils.mjs';

async function data(c, start, end, db) {
  const { total, ...data } = await getInfluencers(c, 0);
  log.info(`Fetching ${total} influencers from Hive (in pages of 50)...`);
  const arr = Array(Math.ceil(Number(total) / 50)).fill(null);

  const ins = {
    tweets: [],
    users: [],
    influencers: [],
    urls: [],
    mentions: [],
    annotations: [],
    hashtags: [],
    cashtags: [],
    refs: [],
  };

  await Promise.all(
    arr.map(async (_, pg) => {
      if (pg >= 1000 / 50) return; // Only import tweets from first 1000 influencers.
      const { influencers } = pg === 0 ? data : await getInfluencers(c, pg);
      influencers.forEach((i) => ins.influencers.push(i));
      log.info(`Fetching tweets from ${influencers.length} timelines...`);
      await Promise.all(
        influencers.map(async (i) => {
          const { id } = i.social_account.social_account;
          const data = await getTweets(id, start, end);
          const users = data.reduce(
            (a, b) => [...a, ...(b.includes?.users ?? [])],
            []
          );
          users.forEach((u) => ins.users.push(u));
          const referencedTweets = data.reduce(
            (a, b) => [...a, ...(b.includes?.tweets ?? [])],
            []
          );
          referencedTweets.forEach((t) => ins.tweets.push(t));
          const tweets = data.reduce((a, b) => [...a, ...(b.data ?? [])], []);
          tweets.forEach((t) => ins.tweets.push(t));
          tweets.forEach((t) => {
            ins.urls.push({ t, u: t.entities?.urls });
            ins.mentions.push({ t, m: t.entities?.mentions });
            ins.annotations.push({ t, a: ins.entities?.annotations });
            ins.hashtags.push({ t, h: t.entities?.hashtags });
            ins.cashtags.push({ t, c: t.entities?.cashtags });
            ins.refs.push({ t, r: t.referenced_tweets });
          });
        })
      );
    })
  );

  try {
    log.info(`Beginning database transaction for ${c.name} (${c.id})...`);
    await db.query('BEGIN');
    await db.query('SET CONSTRAINTS ALL DEFERRED');
    await Promise.all([
      insertInfluencers(ins.influencers, c, db),
      insertUsers(ins.users, db),
      insertTweets(ins.tweets, db),
      ...ins.urls.map(({ u, t }) => insertURLs(u ?? [], t, db)),
      ...ins.mentions.map(({ m, t }) => insertMentions(m ?? [], t, db)),
      ...ins.annotations.map(({ a, t }) => insertAnnotations(a ?? [], t, db)),
      ...ins.hashtags.map(({ h, t }) => insertTags(h ?? [], t, db, 'hashtag')),
      ...ins.cashtags.map(({ c, t }) => insertTags(c ?? [], t, db, 'cashtag')),
      ...ins.refs.map(({ r, t }) => insertRefs(r ?? [], t, db)),
    ]);
    log.info(`Committing database transaction ${c.name} (${c.id})...`);
    await db.query('COMMIT');
  } catch (e) {
    log.error(
      `Error with database transaction ${c.name} (${c.id}): ${e.stack}`
    );
    log.warn(`Rolling back database transaction ${c.name} (${c.id})...`);
    await db.query('ROLLBACK');
  }
}

(async () => {
  // monthly cap - 500k per month (or 2M per month).
  // rate limit - 1500 tweets per 15 mins (max to last 7 days of tweets).
  // hive - 11 clusters, each with ~10-15K influencers.
  // thus, i only fetch the last day's worth of tweets from each influencer.
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 7);
  const end = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 2);
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)
  const db = await pool.connect();
  const intervalId = setInterval(() => {
    const c = limiter.counts();
    const msg =
      `Twitter API calls: ${c.RECEIVED} received, ${c.QUEUED} queued, ` +
      `${c.RUNNING} running, ${c.EXECUTING} executing, ${c.DONE} done.`;
    log.debug(msg);
  }, 2500);
  try {
    const { rows: clusters } = await db.query('SELECT * FROM clusters');
    log.info(`Fetching data for ${clusters.length} clusters...`);
    for await (const cluster of clusters) {
      if (cluster.name === 'Climate') {
        log.info(`Fetching data for "${cluster.name}" (${cluster.id})...`);
        await data(cluster, start, end, db);
      }
    }
  } catch (e) {
    log.error(`Caught error: ${e.stack}`);
    throw e;
  } finally {
    log.info('Releasing database connection...');
    clearInterval(intervalId);
    db.release();
  }
})();
