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
limiter.on('error', (e) => {
  log.error(`Limiter error: ${e.stack}`);
});
limiter.on('failed', (e, job) => {
  log.warn(`Job (${job.options.id}) failed: ${e.stack}`);
  if (job.retryCount < 5) {
    log.debug(`Retrying job (${job.options.id}) in 500ms...`);
    return 500;
  }
});
limiter.on('retry', (e, job) => {
  log.debug(`Now retrying job (${job.options.id})...`);
});

const SORTS = ['attention_score', 'tweets_count'];
const FILTERS = ['show_retweets', 'hide_retweets'];

async function metadata(cluster, sort, filter, db) {
  try {
    log.info(
      `Beginning database transaction (${cluster}; ${sort}; ${filter})...`
    );
    await db.query('BEGIN');
    await db.query('SET CONSTRAINTS ALL IMMEDIATE');
    log.info(
      `Fetching the top 20 articles for ${cluster} (sorted by ${sort}; ${filter})...`
    );
    const { rows } = await db.query(
      `
      select * from (
        select
          links.*,
          clusters.id as cluster_id,
          clusters.name as cluster_name,
          clusters.slug as cluster_slug,
          sum(tweets.insider_score) as insider_score,
          sum(tweets.attention_score) as attention_score,
          json_agg(tweets.*) as tweets
        from links
          inner join (
            select distinct on (tweets.author_id, urls.link_url)
              urls.link_url as link_url,
              tweets.*
            from urls
              inner join (
                select 
                  tweets.*,
                  scores.cluster_id as cluster_id,
                  scores.insider_score as insider_score,
                  scores.attention_score as attention_score,
                  to_json(influencers.*) as author,
                  to_json(scores.*) as score
                from tweets
                  inner join influencers on influencers.id = tweets.author_id
                  inner join scores on scores.influencer_id = influencers.id
                ${
                  filter === 'hide_retweets'
                    ? `where not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')`
                    : ''
                }
              ) as tweets on tweets.id = urls.tweet_id
          ) as tweets on tweets.link_url = links.url
          inner join clusters on clusters.id = tweets.cluster_id
        group by links.url, clusters.id
      ) as articles where (title is null or description is null) and cluster_slug = '${cluster}' and url !~ '^https?:\\/\\/twitter\\.com'
      order by ${
        sort === 'tweets_count' ? 'json_array_length(tweets)' : sort
      } desc
      limit 20;
      `
    );
    log.info(`Fetching ${rows.length} link metadata...`);
    const values = [];
    await Promise.all(
      rows.map(async (row, idx) => {
        const { url } = row;
        try {
          log.debug(`Fetching link (${url}) metadata...`);
          const job = { expiration: 5000, id: url };
          const res = await limiter.schedule(job, fetch, url);
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
    if (!values.length) return log.info(`Skipping updates for ${cluster}...`);
    log.trace(`Values: ${JSON.stringify(values, null, 2)}`);
    const query = format(
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
    log.trace(`Query: ${query}`);
    log.info(`Updating ${values.length} links for ${cluster}...`);
    await db.query(query);
    log.info(`Committing database transaction (${cluster})...`);
    await db.query('COMMIT');
  } catch (e) {
    log.error(`Error with database transaction (${cluster}): ${e.stack}`);
    log.warn(`Rolling back database transaction (${cluster})...`);
    await db.query('ROLLBACK');
  }
}

(async () => {
  const db = await pool.connect();
  try {
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
          await metadata(slug, sort, filter, db);
        }
      }
    }
    clearInterval(intervalId);
    log.info(`Fetched link metadata for ${rows.length} clusters.`);
  } catch (e) {
    throw e;
  } finally {
    log.info('Releasing database connection...');
    db.release();
  }
})().catch((e) => log.error(`Caught error: ${e.stack}`));
