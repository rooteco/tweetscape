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
      ) VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT refs_pkey DO NOTHING;
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
      ) VALUES (
        $1, $2, $3, $4, $5
      ) ON CONFLICT ON CONSTRAINT tags_pkey DO NOTHING;
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
      ) VALUES (
        $1, $2, $3, $5, $5, $6
      ) ON CONFLICT ON CONSTRAINT annotations_pkey DO NOTHING;
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
      ) VALUES (
        $1, $2, $3, $4
      ) ON CONFLICT ON CONSTRAINT mentions_pkey DO NOTHING;
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
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) ON CONFLICT (expanded_url) DO NOTHING RETURNING id;
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
      ) VALUES (
        $1, $2, $3, $4
      ) ON CONFLICT ON CONSTRAINT urls_pkey DO NOTHING;
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
      ) ON CONFLICT (id) DO NOTHING;
      `,
      values
    );
  } catch (e) {
    log.error(`Error inserting tweet (${t.id}): ${e.stack}`);
    log.debug(`Tweet (${t.id}): ${JSON.stringify(values, null, 2)}`);
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
};
