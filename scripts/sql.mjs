import format from 'pg-format';

import { log } from './utils.mjs';

export async function insertRefs(refs, t, db) {
  if (!refs?.length) return;
  log.trace(`Inserting ${refs.length} refs from tweet (${t.id})...`);
  const values = refs.map((r) => [
    BigInt(r.id),
    BigInt(t.id),
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

export async function insertTags(hashtags, t, db, type = 'hashtag') {
  if (!hashtags?.length) return;
  log.trace(`Inserting ${hashtags.length} ${type}s from tweet (${t.id})...`);
  const values = hashtags.map((h) => [
    BigInt(t.id),
    h.tag,
    type,
    h.start,
    h.end,
  ]);
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

export async function insertAnnotations(annotations, t, db) {
  if (!annotations?.length) return;
  log.trace(`Inserting ${annotations.length} annotations...`);
  const values = annotations.map((a) => [
    BigInt(t.id),
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

export async function insertMentions(mentions, t, db) {
  if (!mentions?.length) return;
  log.trace(`Inserting ${mentions.length} mentions from tweet (${t.id})...`);
  const values = mentions.map((m) => [
    BigInt(t.id),
    BigInt(m.id),
    m.start,
    m.end,
  ]);
  const query = format(
    `
    WITH data (
      "tweet_id",
      "user_id",
      "start",
      "end"
    ) AS (VALUES %s)
    INSERT INTO mentions (
      "tweet_id",
      "user_id",
      "start",
      "end"
    ) SELECT
      data."tweet_id",
      data."user_id",
      data."start",
      data."end"
    FROM data WHERE EXISTS (
      SELECT 1 FROM users WHERE users.id = data.user_id
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

export async function insertURLs(urls, t, db) {
  if (!urls?.length) return;
  log.trace(`Inserting ${urls.length} urls from tweet (${t.id})...`);
  // Filter out duplicates as the `DO UPDATE` can only act once on a single row.
  const deduped = urls.filter(
    (u, idx, arr) =>
      arr.map((o) => o.expanded_url).indexOf(u.expanded_url) === idx
  );
  const linkValues = deduped.map((u) => [
    u.expanded_url,
    u.display_url,
    u.status ?? null,
    u.title ?? null,
    u.description ?? null,
    u.unwound_url ?? null,
  ]);
  // Handle edge-case where the `expanded_url` is different (e.g.
  // `https://twitter.com/teslaownersSV/status/1493299926612144130` v.s.
  // `https://twitter.com/teslaownerssv/status/1493299926612144130`) but they
  // both resolve to the same URL and thus the shortened `url` is the same (e.g.
  // `https://t.co/OmuUhSGSaI`).
  const linkQuery = format(
    `
    INSERT INTO links (
      "url",
      "display_url",
      "status",
      "title",
      "description",
      "unwound_url"
    ) VALUES %L ON CONFLICT ("url") DO NOTHING;
    `,
    linkValues
  );
  let links, values, images, query;
  try {
    links = await db.query(linkQuery);
    images = deduped
      .map((u, idx) =>
        (u.images ?? []).map((i) => [u.expanded_url, i.url, i.width, i.height])
      )
      .flat();
    values = deduped.map((u, idx) => [
      BigInt(t.id),
      u.expanded_url,
      u.start,
      u.end,
    ]);
    query = format(
      `
      INSERT INTO urls (
        "tweet_id",
        "link_url",
        "start",
        "end"
      ) VALUES %L ON CONFLICT ON CONSTRAINT urls_pkey DO NOTHING;
      
      ${
        images.length
          ? `INSERT INTO images (
        "link_url",
        "url",
        "width",
        "height"
      ) VALUES %L ON CONFLICT ON CONSTRAINT images_pkey DO NOTHING;`
          : ''
      }
      `,
      values,
      images
    );
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${urls.length} urls: ${e.stack}`);
    log.debug(`Link values: ${JSON.stringify(linkValues, null, 2)}`);
    log.debug(`Link query: ${linkQuery}`);
    log.debug(`Links: ${JSON.stringify(links, null, 2)}`);
    log.debug(`URL values: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Image values: ${JSON.stringify(images, null, 2)}`);
    log.debug(`URLs and images query: ${query}`);
    throw e;
  }
}

export async function insertTweets(tweets, db) {
  if (!tweets?.length) return;
  log.debug(`Inserting ${tweets.length} tweets...`);
  const values = tweets.map((t) => {
    log.trace(`Inserting tweet (${t.id})...`);
    return [
      BigInt(t.id),
      BigInt(t.author_id),
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

export async function insertInfluencers(influencers, c, db) {
  if (!influencers?.length) return;
  log.debug(`Inserting ${influencers.length} influencers...`);
  const values = influencers.map((i) => {
    const s = i.social_account.social_account;
    log.trace(`Inserting influencer ${s.name} (${s.id})...`);
    // the name and profile_image_url are null when the user has been blocked by
    // twitter for violating their terms (@see https://twitter.com/lc_hodl2)
    return [
      BigInt(s.id),
      s.name ?? '',
      s.screen_name,
      s.verified ?? null,
      s.description ?? null,
      s.profile_image_url ?? null,
      Number(s.followers_count ?? 0),
      Number(s.following_count ?? 0),
      Number(s.tweets_count ?? 0),
      new Date(s.created_at),
      new Date(s.updated_at),
    ];
  });
  const scores = influencers.map((i) => {
    const s = i.social_account.social_account;
    log.trace(`Inserting influencer (${s.id}) ${c.name} score (${i.id})...`);
    return [
      BigInt(i.id),
      BigInt(s.id),
      BigInt(c.id),
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
    INSERT INTO users (
      "id",
      "name",
      "username",
      "verified",
      "description",
      "profile_image_url",
      "followers_count",
      "following_count",
      "tweets_count",
      "created_at",
      "updated_at"
    ) VALUES %L ON CONFLICT (id) DO NOTHING; 

    INSERT INTO scores (
      "id",
      "user_id",
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
      "user_id",
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

export async function insertUsers(users, db) {
  if (!users?.length) return;
  log.debug(`Inserting ${users.length} users...`);
  const values = users.map((u) => {
    log.trace(`Inserting user ${u.name} (${u.id})...`);
    return [
      BigInt(u.id),
      u.name,
      u.username,
      u.description,
      u.profile_image_url ?? null,
      u.public_metrics?.followers_count ?? null,
      u.public_metrics?.following_count ?? null,
      u.public_metrics?.tweet_count ?? null,
      u.created_at ? new Date(u.created_at) : null,
      new Date(),
    ];
  });
  const query = format(
    `
    INSERT INTO users (
      "id",
      "name",
      "username",
      "description",
      "profile_image_url",
      "followers_count",
      "following_count",
      "tweets_count",
      "created_at",
      "updated_at"
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
