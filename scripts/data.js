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
      ) VALUES ($1, $2, $3);
    `,
      values
    );
  } catch (e) {
    log.error(`Error inserting ref (${r.id}): ${e.stack}`);
    log.debug(`Ref (${r.id}): ${JSON.stringify(values, null, 2)}`);
    throw e;
  }
}

async function insertTag(h, t, db, type = 'hashtag') {
  log.trace(`Inserting hashtag (${h.tag})...`);
  const values = [t.id, h.tag, type, h.start, h.end];
  try {
    await db.query(
      `
      INSERT INTO tags (
        tweet_id,
        tag,
        type,
        start,
        end
      ) VALUES ($1, $2, $3, $4, $5);
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting hashtag (${h.tag}): ${e.stack}`);
    log.debug(`Hashtag: ${JSON.stringify(values, null, 2)}`);
  }
}

async function insertAnnotation(a, t, db) {
  log.trace(`Inserting annotation "${a.normalized_text}" (${a.type})...`);
  const values = [
    t.id,
    a.normalized_text,
    a.probability,
    a.type,
    a.start,
    a.end,
  ];
  try {
    await db.query(
      `
      INSERT INTO annotations (
        tweet_id,
        normalized_text,
        probability,
        type,
        start,
        end
      ) VALUES ($1, $2, $3, $5, $5, $6);
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting annotation (${a.type}): ${e.stack}`);
    log.debug(`Annotation: ${JSON.stringify(values, null, 2)}`);
  }
}

async function insertMention(m, t, db) {
  log.trace(`Inserting mention @${m.username} (${m.id})...`);
  const values = [t.id, m.id, start, end];
  try {
    await db.query(
      `
      INSERT INTO mentions (
        tweet_id,
        influencer_id,
        start,
        end
      ) VALUES ($1, $2, $3, $4);
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting mention @${m.username}: ${e.stack}`);
    log.debug(`Mention: ${JSON.stringify(values, null, 2)}`);
  }
}

async function insertURL(u, t, db) {
  log.trace(`Inserting url (${u.url}) from tweet (${t.id})...`);
  try {
    const link = await db.query(
      `
      INSERT INTO links (
        url,
        expanded_url,
        display_url,
        images,
        status,
        title,
        description,
        unwound_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT expanded_url
      DO NOTHING
      RETURNING id;
      `,
      [
        u.url,
        u.expanded_url,
        u.display_url,
        u.images ?? null,
        u.status ?? null,
        u.title ?? null,
        u.description ?? null,
        u.unwound_url ?? null,
      ]
    );
    log.debug(`Link: ${JSON.stringify(link, null, 2)}`);
    await db.query(
      `
      INSERT INTO urls (
        tweet_id,
        link_id,
        start,
        end
      ) VALUES ($1, $2, $3, $4);
      `,
      [t.id, link.rows[0].id, u.start, u.end]
    );
  } catch (e) {
    log.error(`Error inserting url (${u.expanded_url}): ${e.stack}`);
    log.debug(`URL (${u.expanded_url}): ${JSON.stringify(url, null, 2)}`);
  }
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
      );
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting tweet (${t.id}): ${e.stack}`);
    log.debug(`Tweet (${t.id}): ${JSON.stringify(values, null, 2)}`);
    throw e;
  }
}

async function getInfluencers(t, pg = 0) {
  log.debug(`Fetching influencers (${pg}) for topic (${t})...`);
  const url =
    `https://api.borg.id/influence/clusters/${caps(t)}/influencers?` +
    `page=${pg}&sort_by=score&sort_direction=desc&influence_type=all`;
  const headers = { authorization: `Token ${process.env.HIVE_TOKEN}` };
  return (await fetchFromCache(url, { headers })).json();
}

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
    `https://api.twitter.com/2/users/${id}/tweets?tweet.fields=created_at,` +
    `entities,author_id,public_metrics,referenced_tweets&` +
    `expansions=referenced_tweets.id,referenced_tweets.id.author_id&` +
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
        influencers.map(async (i) => {
          // 3. Store each influencer in PostgreSQL database.
          const s = i.social_account.social_account;
          log.debug(`Selecting last tweet for ${s.name} (${s.id})...`);
          const res = await db.query(
            `
            SELECT id FROM tweets WHERE author_id = $1
            ORDER BY created_at DESC LIMIT 1
            `,
            [s.id]
          );
          let lastTweetId = '';
          if (res.rows[0]) {
            lastTweetId = res.rows[0].twitter_id;
          } else {
            log.debug(`Inserting influencer ${s.name} (${s.id})...`);
            const values = [
              s.id,
              i.id,
              i.attention_score,
              i.attention_score_change_week,
              i.insider_score,
              // some dev on the hive.one team is british and spells with an "s"
              i.organisation_rank ? Number(i.organisation_rank) : null,
              i.personal_rank ? Number(i.personal_rank) : null,
              Number(i.rank),
              new Date(s.created_at),
              Number(s.followers_count ?? 0),
              Number(s.following_count ?? 0),
              s.name,
              s.profile_image_url,
              s.screen_name,
              Number(s.tweets_count),
              new Date(s.updated_at),
            ];
            try {
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
                values
              );
            } catch (e) {
              log.error(`Error inserting ${s.name} (${s.id}): ${e.stack}`);
              log.debug(`${s.name}: ${JSON.stringify(values, null, 2)}`);
              throw e;
            }
          }
          // 4. Store each tweet in PostgreSQL database.
          const tweets = (await getTweets(s.id, start, end, lastTweetId))
            .reduce((a, b) => [...a, ...(b.data ?? [])], [])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          log.trace(`Tweets: ${JSON.stringify(tweets, null, 2)}`);
          await Promise.all(
            tweets.map(async (t) => {
              await insertTweet(t, db);
              await Promise.all(
                [
                  t.entities?.urls?.map((u) => insertURL(u, t, db)),
                  t.entities?.mentions?.map((m) => insertMention(m, t, db)),
                  t.entities?.annotations?.map((a) =>
                    insertAnnotation(a, t, db)
                  ),
                  t.entities?.hashtags?.map((h) =>
                    insertTag(h, t, db, 'hashtag')
                  ),
                  t.entities?.cashtags?.map((h) =>
                    insertTag(h, t, db, 'cashtag')
                  ),
                  t.referenced_tweets.map((r) => insertRef(r, t, db)),
                ].flat()
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
      log.info(`Caught error (${e.message}), rolling back transaction...`);
      await db.query('ROLLBACK');
      throw e;
    } finally {
      db.release();
      clearInterval(intervalId);
    }
  })().catch((e) => log.error(`Caught error: ${e.stack}`));
}
