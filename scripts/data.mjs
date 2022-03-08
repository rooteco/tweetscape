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
import { pool, twitter, getTweets, getInfluencers } from './shared.mjs';
import { log } from './utils.mjs';

async function data(c, start, end, db) {
  const { total, ...data } = await getInfluencers(c, 0);
  log.info(`Fetching ${total} influencers from Hive (in pages of 100)...`);
  const arr = Array(Math.ceil(Number(total) / 50)).fill(null);
  await Promise.all(
    arr.map(async (_, pg) => {
      if (pg !== 6) return;
      const { influencers } = pg === 0 ? data : await getInfluencers(c, pg);
      await insertInfluencers(influencers, c, db);
      log.info(`Fetching tweets from ${influencers.length} timelines...`);
      await Promise.all(
        influencers.map(async (i) => {
          const { id } = i.social_account.social_account;
          const data = await getTweets(id, start, end);
          const users = data.reduce(
            (a, b) => [...a, ...(b.includes?.users ?? [])],
            []
          );
          await insertUsers(users, db);
          const referencedTweets = data.reduce(
            (a, b) => [...a, ...(b.includes?.tweets ?? [])],
            []
          );
          await insertTweets(referencedTweets, db);
          const tweets = data.reduce((a, b) => [...a, ...(b.data ?? [])], []);
          await insertTweets(tweets, db);
          await Promise.all(
            tweets
              .map((t) => [
                insertURLs(t.entities?.urls ?? [], t, db),
                insertMentions(t.entities?.mentions ?? [], t, db),
                insertAnnotations(t.entities?.annotations ?? [], t, db),
                insertTags(t.entities?.hashtags ?? [], t, db, 'hashtag'),
                insertTags(t.entities?.cashtags ?? [], t, db, 'cashtag'),
                insertRefs(t.referenced_tweets ?? [], t, db),
              ])
              .flat()
          );
        })
      );
    })
  );
}

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
    await db.query('SET CONSTRAINTS ALL IMMEDIATE');
    await data({ id: '2300535630', name: 'Tesla' }, start, end, db);
    log.info('Committing database transaction...');
    await db.query('COMMIT');
  } catch (e) {
    log.warn(`Rolling back database transaction (${e.message})...`);
    await db.query('ROLLBACK');
    throw e;
  } finally {
    log.info('Releasing database connection...');
    clearInterval(intervalId);
    db.release();
  }
})().catch((e) => log.error(`Caught error: ${e.stack}`));
