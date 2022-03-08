// node.js script to fetch article metadata (title and description) for db.

import { parse, walk, SyntaxKind } from 'html5parser';
import Bottleneck from 'bottleneck';
import fetch from 'node-fetch';
import format from 'pg-format';

import { log } from './utils.mjs';
import { pool } from './shared.mjs';

const scheduler = new Bottleneck({
  trackDoneStatus: true,
  maxConcurrent: 100,
  minTime: 250,
});
const fetched = scheduler.wrap(fetch);

(async () => {
  log.info('Fetching links without metadata...');
  const { rows } = await pool.query(
    `
    SELECT * FROM links 
    WHERE title IS null 
    AND expanded_url !~ '^https?:\\/\\/twitter\\.com'
    `
  );
  log.info(`Fetching ${rows.length} link metadata...`);
  const values = [];
  const intervalId = setInterval(() => {
    const c = scheduler.counts();
    const msg =
      `Fetch calls: ${c.RECEIVED} received, ${c.QUEUED} queued, ` +
      `${c.RUNNING} running, ${c.EXECUTING} executing, ${c.DONE} done.`;
    log.debug(msg);
  }, 2500);
  await Promise.all(
    rows.map(async (row, idx) => {
      const url = row.expanded_url;
      try {
        log.debug(`Fetching link (${url}) metadata...`);
        const res = await fetched(url);
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
              const name = node.attributes.find((a) => a.name.value === 'name');
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
          format.literal(ogTitle || title || null),
          format.literal(ogDescription || description || null),
          format.literal(res.headers.location ?? url),
          row.id,
        ]);
      } catch (e) {
        log.error(`Caught fetching error for link (${url}): ${e.stack}`);
      }
    })
  );
  log.trace(`Values: ${JSON.stringify(values, null, 2)}`);
  const query = format(
    `
    UPDATE links as l SET 
      status = d.status, 
      title = d.title,
      description = d.description,
      unwound_url = d.unwound_url
    FROM (VALUES %s) AS d (status, title, description, unwound_url, id)
    WHERE d.id = l.id;
    `,
    values
  );
  log.trace(`Query: ${query}`);
  log.info(`Updating ${values.length} links...`);
  await pool.query(query);
  clearInterval(intervalId);
})().catch((e) => log.error(`Caught error: ${e.stack}`));
