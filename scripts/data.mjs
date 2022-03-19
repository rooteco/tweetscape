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
  log.info(`Fetching ${total} influencers from Hive (in pages of 50)...`);
  const arr = Array(Math.ceil(Number(total) / 50)).fill(null);

  const insert = {
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
      influencers.forEach((i) => insert.influencers.push(i));
      log.info(`Fetching tweets from ${influencers.length} timelines...`);
      await Promise.all(
        influencers.map(async (i) => {
          const { id } = i.social_account.social_account;
          const data = await getTweets(id, start, end);
          const users = data.reduce(
            (a, b) => [...a, ...(b.includes?.users ?? [])],
            []
          );
          users.forEach((u) => insert.users.push(u));
          const referencedTweets = data.reduce(
            (a, b) => [...a, ...(b.includes?.tweets ?? [])],
            []
          );
          referencedTweets.forEach((t) => insert.tweets.push(t));
          const tweets = data.reduce((a, b) => [...a, ...(b.data ?? [])], []);
          tweets.forEach((t) => insert.tweets.push(t));
          tweets.forEach((t) => {
            t.entities?.urls?.forEach((u) => insert.urls.push(u));
            t.entities?.mentions?.forEach((m) => insert.mentions.push(m));
            t.entities?.annotations?.forEach((a) => insert.annotations.push(a));
            t.entities?.hashtags?.forEach((h) => insert.hashtags.push(h));
            t.entities?.cashtags?.forEach((c) => insert.cashtags.push(c));
            t.referenced_tweets?.forEach((r) => insert.refs.push(r));
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
      insertInfluencers(insert.influencers, c, db),
      insertUsers(insert.users, db),
      insertTweets(insert.tweets, db),
      insertURLs(insert.urls, t, db),
      insertMentions(insert.mentions, t, db),
      insertAnnotations(insert.annotations, t, db),
      insertTags(insert.hashtags, t, db, 'hashtag'),
      insertTags(insert.cashtags, t, db, 'cashtag'),
      insertRefs(insert.refs, t, db),
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
  const start = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
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
    await data({ id: '2300535630', name: 'Tesla' }, start, end, db);
    //await data({ id: '2209261', name: 'Ethereum' }, start, end, db);
    //await data({ id: '2300535799', name: 'Python' }, start, end, db);
    //await data({ id: '7799179292', name: 'NFT' }, start, end, db);
  } catch (e) {
    throw e;
  } finally {
    log.info('Releasing database connection...');
    clearInterval(intervalId);
    db.release();
  }
})().catch((e) => log.error(`Caught error: ${e.stack}`));
