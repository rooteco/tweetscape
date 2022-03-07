const format = require('pg-format');

const { log } = require('./utils');

async function insertRefs(refs, t, db) {
  if (!refs?.length) return;
  log.trace(`Inserting ${refs.length} refs from tweet (${t.id})...`);
  const values = refs.map((r) => [
    `'${r.id}'`,
    `'${t.id}'`,
    `'${r.type}'::ref_type`,
  ]);
  // Handle edge-case where the referenced tweet has been deleted.
  // @see {@link https://twitter.com/tesla_raj/status/1499155524377407490}
  const query = format(
    `
    WITH data (
      "referenced_tweet_id",
      "referencer_tweet_id",
      "type"
    ) AS (VALUES %s)
    INSERT INTO refs (
      "referenced_tweet_id",
      "referencer_tweet_id",
      "type"
    ) SELECT
      data."referenced_tweet_id",
      data."referencer_tweet_id",
      data."type"
    FROM data WHERE EXISTS (
      SELECT 1 FROM tweets WHERE tweets.id = data.referenced_tweet_id
    ) ON CONFLICT ON CONSTRAINT refs_pkey DO NOTHING;
    `,
    values
  );
  try {
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${refs.length} refs: ${e.stack}`);
    log.debug(`Refs: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

async function insertTags(hashtags, t, db, type = 'hashtag') {
  if (!hashtags?.length) return;
  log.trace(`Inserting ${hashtags.length} ${type}s from tweet (${t.id})...`);
  const values = hashtags.map((h) => [t.id, h.tag, type, h.start, h.end]);
  const query = format(
    `
    INSERT INTO tags (
      "tweet_id",
      "tag",
      "type",
      "start",
      "end"
    ) VALUES %L ON CONFLICT ON CONSTRAINT tags_pkey DO NOTHING;
    `,
    values
  );
  try {
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${hashtags.length} hashtags: ${e.stack}`);
    log.debug(`Hashtags: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

async function insertAnnotations(annotations, t, db) {
  if (!annotations?.length) return;
  log.trace(`Inserting ${annotations.length} annotations...`);
  const values = annotations.map((a) => [
    t.id,
    a.normalized_text,
    a.probability,
    a.type,
    a.start,
    a.end,
  ]);
  const query = format(
    `
    INSERT INTO annotations (
      "tweet_id",
      "normalized_text",
      "probability",
      "type",
      "start",
      "end"
    ) VALUES %L ON CONFLICT ON CONSTRAINT annotations_pkey DO NOTHING;
    `,
    values
  );
  try {
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${annotations.length} annotations: ${e.stack}`);
    log.debug(`Annotations: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

async function insertMentions(mentions, t, db) {
  if (!mentions?.length) return;
  log.trace(`Inserting ${mentions.length} mentions from tweet (${t.id})...`);
  const values = mentions.map((m) => [
    `'${t.id}'`,
    `'${m.id}'`,
    m.start,
    m.end,
  ]);
  const query = format(
    `
    WITH data (
      "tweet_id",
      "influencer_id",
      "start",
      "end"
    ) AS (VALUES %s)
    INSERT INTO mentions (
      "tweet_id",
      "influencer_id",
      "start",
      "end"
    ) SELECT
      data."tweet_id",
      data."influencer_id",
      data."start",
      data."end"
    FROM data WHERE EXISTS (
      SELECT 1 FROM influencers WHERE influencers.id = data.influencer_id
    ) ON CONFLICT ON CONSTRAINT mentions_pkey DO NOTHING;
    `,
    values
  );
  try {
    // Instead of specifying `ON CONFLICT ON CONSTRAINT mentions_pkey`, I have
    // to use a more catch-all `ON CONFLICT` cause to handle edge cases where
    // the mentioned user isn't returned by Twitter's API in the `includes`
    // field (e.g. because the user's profile is private).
    // TODO: Handle similar edge-cases with private accounts in every `INSERT`.
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${mentions.length} mentions: ${e.stack}`);
    log.debug(`Mentions: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

async function insertURLs(urls, t, db) {
  if (!urls?.length) return;
  log.trace(`Inserting ${urls.length} urls from tweet (${t.id})...`);
  // Filter out duplicates as the `DO UPDATE` can only act once on a single row.
  const deduped = urls.filter(
    (u, idx, arr) =>
      arr.map((o) => o.expanded_url).indexOf(u.expanded_url) === idx
  );
  const linkValues = deduped.map((u) => [
    format.literal(u.url),
    format.literal(u.expanded_url),
    format.literal(u.display_url),
    u.images
      ? `ARRAY[${u.images
          .map(
            (o) =>
              `(${Object.values(o)
                .map((v) => format.literal(v))
                .join()})`
          )
          .join()}]::image[]`
      : 'NULL',
    format.literal(u.status ?? null),
    format.literal(u.title ?? null),
    format.literal(u.description ?? null),
    format.literal(u.unwound_url ?? null),
  ]);
  // Handle edge-case where the `expanded_url` is different (e.g.
  // `https://twitter.com/teslaownersSV/status/1493299926612144130` v.s.
  // `https://twitter.com/teslaownerssv/status/1493299926612144130`) but they
  // both resolve to the same URL and thus the shortened `url` is the same (e.g.
  // `https://t.co/OmuUhSGSaI`).
  const linkQuery = format(
    `
    WITH data (
      "url",
      "expanded_url",
      "display_url",
      "images",
      "status",
      "title",
      "description",
      "unwound_url"
    ) AS (VALUES %s)
    INSERT INTO links (
      "url",
      "expanded_url",
      "display_url",
      "images",
      "status",
      "title",
      "description",
      "unwound_url"
    ) SELECT
      data."url",
      COALESCE (existing.expanded_url, data.expanded_url),
      data."display_url",
      data."images"::image[],
      data."status"::INTEGER,
      data."title",
      data."description",
      data."unwound_url"
    FROM data LEFT OUTER JOIN (
      SELECT "url", "expanded_url" FROM links
    ) AS existing ON existing.url = data.url AND existing.expanded_url != data.expanded_url
    ON CONFLICT (
      expanded_url
    ) DO UPDATE SET expanded_url = links.expanded_url RETURNING id;
    `,
    linkValues
  );
  let links, values, query;
  try {
    links = await db.query(linkQuery);
    values = deduped.map((u, idx) => [
      t.id,
      Number(links.rows[idx].id),
      u.start,
      u.end,
    ]);
    query = format(
      `
      INSERT INTO urls (
        "tweet_id",
        "link_id",
        "start",
        "end"
      ) VALUES %L ON CONFLICT ON CONSTRAINT urls_pkey DO NOTHING;
      `,
      values
    );
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${urls.length} urls: ${e.stack}`);
    log.debug(`Link values: ${JSON.stringify(linkValues, null, 2)}`);
    log.debug(`Link query: ${linkQuery}`);
    log.debug(`Links: ${JSON.stringify(links, null, 2)}`);
    log.debug(`URLs: ${JSON.stringify(values, null, 2)}`);
    log.debug(`URLs query: ${query}`);
    throw e;
  }
}

async function insertTweets(tweets, db) {
  if (!tweets?.length) return;
  log.debug(`Inserting ${tweets.length} tweets...`);
  const values = tweets.map((t) => {
    log.trace(`Inserting tweet (${t.id})...`);
    return [
      t.id,
      t.author_id,
      t.text,
      t.public_metrics.retweet_count,
      t.public_metrics.reply_count,
      t.public_metrics.like_count,
      t.public_metrics.quote_count,
      new Date(t.created_at),
    ];
  });
  const query = format(
    `
    INSERT INTO tweets (
      "id",
      "author_id",
      "text",
      "retweet_count",
      "reply_count",
      "like_count",
      "quote_count",
      "created_at"
    ) VALUES %L ON CONFLICT (id) DO NOTHING;
    `,
    values
  );
  try {
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${tweets.length} tweets: ${e.stack}`);
    log.debug(`Tweets: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

async function insertInfluencers(influencers, c, db) {
  if (!influencers?.length) return;
  log.debug(`Inserting ${influencers.length} influencers...`);
  const values = influencers.map((i) => {
    const s = i.social_account.social_account;
    log.trace(`Inserting influencer ${s.name} (${s.id})...`);
    return [
      s.id,
      s.name,
      s.screen_name,
      s.profile_image_url,
      Number(s.followers_count ?? 0),
      Number(s.following_count ?? 0),
      Number(s.tweets_count),
      new Date(s.created_at),
      new Date(s.updated_at),
    ];
  });
  const scores = influencers.map((i) => {
    const s = i.social_account.social_account;
    log.trace(`Inserting influencer (${s.id}) ${c.name} score (${i.id})...`);
    return [
      i.id,
      s.id,
      c.id,
      i.attention_score,
      i.attention_score_change_week,
      i.insider_score,
      // some dev on the hive.one team is british and spells with an "s"
      i.organisation_rank ? Number(i.organisation_rank) : null,
      i.personal_rank ? Number(i.personal_rank) : null,
      Number(i.rank),
      new Date(i.created_at),
    ];
  });
  const query = format(
    `
    INSERT INTO influencers (
      "id",
      "name",
      "username",
      "profile_image_url",
      "followers_count",
      "following_count",
      "tweets_count",
      "created_at",
      "updated_at"
    ) VALUES %L ON CONFLICT (id) DO UPDATE SET (
      "id",
      "name",
      "username",
      "profile_image_url",
      "followers_count",
      "following_count",
      "tweets_count",
      "created_at",
      "updated_at"
    ) = ROW (excluded.*) WHERE influencers IS DISTINCT FROM excluded;

    INSERT INTO scores (
      "id",
      "influencer_id",
      "cluster_id",
      "attention_score",
      "attention_score_change_week",
      "insider_score",
      "organization_rank",
      "personal_rank",
      "rank",
      "created_at"
    ) VALUES %L ON CONFLICT (id) DO UPDATE SET (
      "id",
      "influencer_id",
      "cluster_id",
      "attention_score",
      "attention_score_change_week",
      "insider_score",
      "organization_rank",
      "personal_rank",
      "rank",
      "created_at"
    ) = ROW (excluded.*) WHERE scores IS DISTINCT FROM excluded;
    `,
    values,
    scores
  );
  try {
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${influencers.length} influencers: ${e.stack}`);
    log.debug(`Influencers: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Scores: ${JSON.stringify(scores, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

async function insertUsers(users, db) {
  if (!users?.length) return;
  log.debug(`Inserting ${users.length} users...`);
  const values = users.map((u) => {
    log.trace(`Inserting user ${u.name} (${u.id})...`);
    return [u.id, u.name, u.username];
  });
  const query = format(
    `
    INSERT INTO influencers (
      "id",
      "name",
      "username"
    ) VALUES %L ON CONFLICT (id) DO NOTHING;
    `,
    values
  );
  try {
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${users.length} users: ${e.stack}`);
    log.debug(`Users: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

module.exports = {
  insertRefs,
  insertTags,
  insertAnnotations,
  insertMentions,
  insertURLs,
  insertTweets,
  insertInfluencers,
  insertUsers,
};
