// node.js script to fetch article metadata (title and description) for db.

import { parse, walk, SyntaxKind } from 'html5parser';
import Bottleneck from 'bottleneck';
import fetch from 'node-fetch';
import format from 'pg-format';

import { decode, log } from './utils.mjs';
import { pool } from './shared.mjs';

const limiter = new Bottleneck({
  trackDoneStatus: true,
  maxConcurrent: 100,
  minTime: 250,
});
//limiter.on('error', (e) => {
//log.error(`Limiter error: ${e.stack}`);
//});
//limiter.on('failed', (e, job) => {
//log.warn(`Job (${job.options.id}) failed: ${e.stack}`);
//if (job.retryCount < 5) {
//log.debug(`Retrying job (${job.options.id}) in 500ms...`);
//return 500;
//}
//});
//limiter.on('retry', (e, job) => {
//log.debug(`Now retrying job (${job.options.id})...`);
//});

const SORTS = ['attention_score', 'tweets_count'];
const FILTERS = ['show_retweets', 'hide_retweets'];

async function metadata(query, context, db) {
  try {
    log.info(`Beginning database transaction for ${context}...`);
    await db.query('BEGIN');
    await db.query('SET CONSTRAINTS ALL IMMEDIATE');
    log.info(`Fetching the top articles for ${context}...`);
    const { rows } = await db.query(query);
    log.info(`Fetching ${rows.length} link metadata...`);
    const values = [];
    await Promise.all(
      rows.map(async (row, idx) => {
        const { url } = row;
        try {
          log.debug(`Fetching link (${url}) metadata...`);
          const res = await limiter.schedule({ id: url }, fetch, url);
          const html = await res.text();
          log.debug(`Parsing link (${url}) metadata...`);
          const ast = parse(html);
          let title, description, ogTitle, ogDescription;
          walk(ast, {
            enter(node) {
              if (
                node.type === SyntaxKind.Tag &&
                node.name === 'title' &&
                node.body[0]
              )
                title = node.body[0].value;
              if (node.type === SyntaxKind.Tag && node.name === 'meta') {
                const name = node.attributes.find(
                  (a) => a.name.value === 'name'
                );
                const content = node.attributes.find(
                  (a) => a.name.value === 'content'
                );
                if (name?.value.value === 'description')
                  description = content?.value.value ?? '';
                const property = node.attributes.find(
                  (a) => a.name.value === 'property'
                );
                if (property?.value.value === 'og:description')
                  ogDescription = content?.value.value ?? '';
                if (property?.value.value === 'og:title')
                  ogTitle = content?.value.value ?? '';
              }
            },
          });
          values.push([
            res.status,
            format.literal(decode(ogTitle || title) || null),
            format.literal(decode(ogDescription || description) || null),
            format.literal(res.url),
            format.literal(row.url),
          ]);
        } catch (e) {
          log.error(`Caught fetching error for link (${url}): ${e.stack}`);
        }
      })
    );
    if (!values.length) return log.info(`Skipping updates for ${context}...`);
    log.trace(`Values: ${JSON.stringify(values, null, 2)}`);
    const update = format(
      `
      UPDATE links as l SET 
        status = d.status, 
        title = d.title,
        description = d.description,
        unwound_url = d.unwound_url
      FROM (VALUES %s) AS d (status, title, description, unwound_url, url)
      WHERE d.url = l.url;
      `,
      values
    );
    log.trace(`Query: ${update}`);
    log.info(`Updating ${values.length} links for ${context}...`);
    await db.query(update);
    log.info(`Committing database transaction (${context})...`);
    await db.query('COMMIT');
  } catch (e) {
    log.error(`Error with database transaction (${context}): ${e.stack}`);
    log.warn(`Rolling back database transaction (${context})...`);
    await db.query('ROLLBACK');
  }
}

async function importClusterMetadata(db) {
  log.info('Fetching clusters...');
  const { rows } = await db.query('select * from clusters');
  log.info(`Fetching link metadata for ${rows.length} clusters...`);
  const intervalId = setInterval(() => {
    const c = limiter.counts();
    const msg =
      `Fetch calls: ${c.RECEIVED} received, ${c.QUEUED} queued, ` +
      `${c.RUNNING} running, ${c.EXECUTING} executing, ${c.DONE} done.`;
    log.debug(msg);
  }, 2500);
  for await (const { slug } of rows) {
    for await (const sort of SORTS) {
      for await (const filter of FILTERS) {
        const query = `
          select
            links.*,
            sum(tweets.insider_score) as insider_score,
            sum(tweets.attention_score) as attention_score,
            json_agg(tweets.*) as tweets
          from links
            inner join (
              select distinct on (urls.link_url, tweets.author_id, tweets.cluster_id)
                urls.link_url as link_url,
                tweets.*
              from urls
                inner join (
                  select
                    tweets.*,
                    scores.cluster_id as cluster_id,
                    scores.insider_score as insider_score,
                    scores.attention_score as attention_score,
                    to_json(scores.*) as score,
                    to_json(users.*) as author,
                    json_agg(refs.*) as refs,
                    array_agg(refs.referenced_tweet_id) as ref_ids,
                    json_agg(ref_tweets.*) as ref_tweets,
                    json_agg(ref_authors.*) as ref_authors
                  from tweets
                    inner join users on users.id = tweets.author_id
                    inner join scores on scores.user_id = tweets.author_id
                    inner join clusters on clusters.id = scores.cluster_id and clusters.slug = '${slug}'
                    left outer join refs on refs.referencer_tweet_id = tweets.id and refs.type != 'replied_to'
                    left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
                    left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
                  ${
                    filter === 'hide_retweets'
                      ? `where refs is null or 'retweeted' not in (refs.type)`
                      : ''
                  }
                  group by tweets.id,scores.id,users.id
                ) as tweets on tweets.id = urls.tweet_id or urls.tweet_id = any (tweets.ref_ids)
            ) as tweets on tweets.link_url = links.url
          where url !~ '^https?:\\/\\/twitter\\.com'
          group by links.url
          order by ${
            sort === 'tweets_count' ? 'count(tweets)' : 'attention_score'
          } desc
          limit 50;`;
        await metadata(query, `${slug} ${filter} ${sort}`, db);
      }
    }
  }
  clearInterval(intervalId);
  log.info(`Fetched link metadata for ${rows.length} clusters.`);
}

async function importRektMetadata(db) {
  const query = `
    select
      links.*,
      sum(tweets.points) as points,
      json_agg(tweets.*) as tweets
    from links
      inner join (
        select distinct on (urls.link_url, tweets.author_id)
          urls.link_url as link_url,
          tweets.*
        from urls
          inner join (
            select
              tweets.*,
              rekt.points as points,
              to_json(rekt.*) as rekt,
              to_json(users.*) as author,
              json_agg(refs.*) as refs,
              array_agg(refs.referenced_tweet_id) as ref_ids,
              json_agg(ref_tweets.*) as ref_tweets,
              json_agg(ref_authors.*) as ref_authors
            from tweets
              inner join users on users.id = tweets.author_id
              inner join rekt on rekt.user_id = tweets.author_id
              left outer join refs on refs.referencer_tweet_id = tweets.id and refs.type != 'replied_to'
              left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
              left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
            where refs is null or 'retweeted' not in (refs.type)
            group by tweets.id,rekt.id,users.id
          ) as tweets on tweets.id = urls.tweet_id or urls.tweet_id = any (tweets.ref_ids)
      ) as tweets on tweets.link_url = links.url
    where links.url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by points desc
    limit 50;`;
  await metadata(query, 'rekt', db);
}

(async () => {
  const db = await pool.connect();
  try {
    await importClusterMetadata(db);
  } catch (e) {
    throw e;
  } finally {
    log.info('Releasing database connection...');
    db.release();
  }
})().catch((e) => log.error(`Caught error: ${e.stack}`));
