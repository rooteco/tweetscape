const format = require('pg-format');

const { log } = require('./utils');

async function insertRef(r, t, db) {
  log.trace(`Inserting ${r.type} tweet (${r.id})...`);
  const values = [r.id, t.id, r.type];
  try {
    await db.query(
      `
      INSERT INTO refs (
        "referenced_tweet_id",
        "referencer_tweet_id",
        "type"
      ) VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT refs_pkey DO NOTHING;
    `,
      values
    );
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ref (${r.id}): ${e.stack}`);
    log.debug(`Ref (${r.id}): ${JSON.stringify(values, null, 2)}`);
    throw e;
  }
}

async function insertRefs(refs, t, db) {
  if (!refs?.length) return;
  log.trace(`Inserting ${refs.length} refs from tweet (${t.id})...`);
  const values = refs.map((r) => [r.id, t.id, r.type]);
  const query = format(
    `
    INSERT INTO refs (
      "referenced_tweet_id",
      "referencer_tweet_id",
      "type"
    ) VALUES %L ON CONFLICT ON CONSTRAINT refs_pkey DO NOTHING;
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

async function insertTag(h, t, db, type = 'hashtag') {
  log.trace(`Inserting hashtag (${h.tag})...`);
  const values = [t.id, h.tag, type, h.start, h.end];
  try {
    await db.query(
      `
      INSERT INTO tags (
        "tweet_id",
        "tag",
        "type",
        "start",
        "end"
      ) VALUES (
        $1, $2, $3, $4, $5
      ) ON CONFLICT ON CONSTRAINT tags_pkey DO NOTHING;
      `,
      values
    );
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting hashtag (${h.tag}): ${e.stack}`);
    log.debug(`Hashtag: ${JSON.stringify(values, null, 2)}`);
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
        "tweet_id",
        "normalized_text",
        "probability",
        "type",
        "start",
        "end"
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) ON CONFLICT ON CONSTRAINT annotations_pkey DO NOTHING;
      `,
      values
    );
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting annotation (${a.type}): ${e.stack}`);
    log.debug(`Annotation: ${JSON.stringify(values, null, 2)}`);
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

async function insertMention(m, t, db) {
  log.trace(`Inserting mention @${m.username} (${m.id})...`);
  const values = [t.id, m.id, m.start, m.end];
  try {
    // Instead of specifying `ON CONFLICT ON CONSTRAINT mentions_pkey`, I have
    // to use a more catch-all `ON CONFLICT` cause to handle edge cases where
    // the mentioned user isn't returned by Twitter's API in the `includes`
    // field (e.g. because the user's profile is private).
    // TODO: Handle similar edge-cases with private accounts in every `INSERT`.
    await db.query(
      `
      WITH data (
        "tweet_id",
        "influencer_id",
        "start",
        "end"
      ) AS (VALUES ($1, $2, $3::INTEGER, $4::INTEGER))
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
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting mention @${m.username}: ${e.stack}`);
    log.debug(`Mention: ${JSON.stringify(values, null, 2)}`);
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

async function insertURL(u, t, db) {
  log.trace(`Inserting url (${u.expanded_url}) from tweet (${t.id})...`);
  let link, values;
  try {
    link = await db.query(
      `
      INSERT INTO links (
        "url",
        "expanded_url",
        "display_url",
        "images",
        "status",
        "title",
        "description",
        "unwound_url"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) ON CONFLICT (
        expanded_url
      ) DO UPDATE SET expanded_url = links.expanded_url RETURNING id;
      `,
      [
        u.url,
        u.expanded_url,
        u.display_url,
        u.images?.map((o) => `(${Object.values(o).join()})`) ?? null,
        u.status ?? null,
        u.title ?? null,
        u.description ?? null,
        u.unwound_url ?? null,
      ]
    );
    values = [t.id, Number(link.rows[0].id), u.start, u.end];
    await db.query(
      `
      INSERT INTO urls (
        "tweet_id",
        "link_id",
        "start",
        "end"
      ) VALUES (
        $1, $2, $3, $4
      ) ON CONFLICT ON CONSTRAINT urls_pkey DO NOTHING;
      `,
      values
    );
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting url (${u.expanded_url}): ${e.stack}`);
    log.debug(`Link (${u.expanded_url}): ${JSON.stringify(link, null, 2)}`);
    log.debug(`URL (${u.expanded_url}): ${JSON.stringify(values, null, 2)}`);
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
  log.trace(`Link query for tweet (${t.id}): ${linkQuery}`);
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
        "id",
        "author_id",
        "text",
        "retweet_count",
        "reply_count",
        "like_count",
        "quote_count",
        "created_at"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) ON CONFLICT (id) DO NOTHING;
      `,
      values
    );
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting tweet (${t.id}): ${e.stack}`);
    log.debug(`Tweet (${t.id}): ${JSON.stringify(values, null, 2)}`);
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

async function insertInfluencer(i, s, db) {
  log.debug(`Inserting influencer ${s.name} (${s.id})...`);
  const values = [
    s.id,
    i.id,
    s.name,
    s.screen_name,
    s.profile_image_url,
    i.attention_score,
    i.attention_score_change_week,
    i.insider_score,
    // some dev on the hive.one team is british and spells with an "s"
    i.organisation_rank ? Number(i.organisation_rank) : null,
    i.personal_rank ? Number(i.personal_rank) : null,
    Number(i.rank),
    Number(s.followers_count ?? 0),
    Number(s.following_count ?? 0),
    Number(s.tweets_count),
    new Date(s.created_at),
    new Date(s.updated_at),
  ];
  try {
    await db.query(
      `
      INSERT INTO influencers (
        "id",
        "hive_id",
        "name",
        "username",
        "profile_image_url",
        "attention_score",
        "attention_score_change_week",
        "insider_score",
        "organization_rank",
        "personal_rank",
        "rank",
        "followers_count",
        "following_count",
        "tweets_count",
        "created_at",
        "updated_at"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) ON CONFLICT (id) DO UPDATE SET (
        "id",
        "hive_id",
        "name",
        "username",
        "profile_image_url",
        "attention_score",
        "attention_score_change_week",
        "insider_score",
        "organization_rank",
        "personal_rank",
        "rank",
        "followers_count",
        "following_count",
        "tweets_count",
        "created_at",
        "updated_at"
      ) = ROW (excluded.*) WHERE influencers IS DISTINCT FROM excluded;
      `,
      values
    );
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${s.name} (${s.id}): ${e.stack}`);
    log.debug(`${s.name}: ${JSON.stringify(values, null, 2)}`);
    throw e;
  }
}

async function insertInfluencers(influencers, db) {
  if (!influencers?.length) return;
  log.debug(`Inserting ${influencers.length} influencers...`);
  const values = influencers.map((i) => {
    const s = i.social_account.social_account;
    log.trace(`Inserting influencer ${s.name} (${s.id})...`);
    return [
      s.id,
      i.id,
      s.name,
      s.screen_name,
      s.profile_image_url,
      i.attention_score,
      i.attention_score_change_week,
      i.insider_score,
      // some dev on the hive.one team is british and spells with an "s"
      i.organisation_rank ? Number(i.organisation_rank) : null,
      i.personal_rank ? Number(i.personal_rank) : null,
      Number(i.rank),
      Number(s.followers_count ?? 0),
      Number(s.following_count ?? 0),
      Number(s.tweets_count),
      new Date(s.created_at),
      new Date(s.updated_at),
    ];
  });
  const query = format(
    `
    INSERT INTO influencers (
      "id",
      "hive_id",
      "name",
      "username",
      "profile_image_url",
      "attention_score",
      "attention_score_change_week",
      "insider_score",
      "organization_rank",
      "personal_rank",
      "rank",
      "followers_count",
      "following_count",
      "tweets_count",
      "created_at",
      "updated_at"
    ) VALUES %L ON CONFLICT (id) DO UPDATE SET (
      "id",
      "hive_id",
      "name",
      "username",
      "profile_image_url",
      "attention_score",
      "attention_score_change_week",
      "insider_score",
      "organization_rank",
      "personal_rank",
      "rank",
      "followers_count",
      "following_count",
      "tweets_count",
      "created_at",
      "updated_at"
    ) = ROW (excluded.*) WHERE influencers IS DISTINCT FROM excluded;
    `,
    values
  );
  try {
    await db.query(query);
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting ${influencers.length} influencers: ${e.stack}`);
    log.debug(`Influencers: ${JSON.stringify(values, null, 2)}`);
    log.debug(`Query: ${query}`);
    throw e;
  }
}

async function insertUser(u, db) {
  log.debug(`Inserting user ${u.name} (${u.id})...`);
  const values = [u.id, u.name, u.username];
  try {
    await db.query(
      `
      INSERT INTO influencers (
        "id",
        "name",
        "username"
      ) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING;
      `,
      values
    );
  } catch (e) {
    if (e.message.includes('current transaction is aborted')) return;
    log.error(`Error inserting influencer ${u.name} (${u.id}): ${e.stack}`);
    log.debug(`${u.name} (${u.id}): ${JSON.stringify(values, null, 2)}`);
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
  insertRef,
  insertTag,
  insertAnnotation,
  insertMention,
  insertURL,
  insertTweet,
  insertInfluencer,
  insertUser,
  insertRefs,
  insertTags,
  insertAnnotations,
  insertMentions,
  insertURLs,
  insertTweets,
  insertInfluencers,
  insertUsers,
};
