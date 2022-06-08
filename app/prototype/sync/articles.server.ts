import { SyntaxKind, parse, walk } from 'html5parser';
import Bottleneck from 'bottleneck';
import type { IText } from 'html5parser';
import { decode } from 'html-entities';

import type { ArticleFull, Link } from '~/prototype/types';
import { db } from '~/prototype/db.server';
import { log } from '~/prototype/utils.server';

const limiter = new Bottleneck({
  trackDoneStatus: true,
  maxConcurrent: 100,
  minTime: 250,
});
limiter.on('error', (e) => {
  log.error(`Limiter error: ${(e as Error).message}`);
});
limiter.on('failed', (e) => {
  log.warn(`Limiter job failed: ${(e as Error).message}`);
});

export async function syncArticleMetadata(articles: ArticleFull[]) {
  const articlesToFetch: ArticleFull[] = [];
  articles.forEach((article) => {
    if (article.status === 200) return;
    if (article.title && article.description) return;
    if (articlesToFetch.some((a) => a.url === article.url)) return;
    articlesToFetch.push(article);
  });
  log.info(`Fetching ${articlesToFetch.length} link metadata...`);
  const linksToUpdate: Link[] = [];
  await Promise.all(
    articlesToFetch.map(async (article) => {
      const { url } = article;
      try {
        log.trace(`Fetching link (${url}) metadata...`);
        const res = await limiter.schedule({ expiration: 5000 }, fetch, url);
        const html = await res.text();
        log.trace(`Parsing link (${url}) metadata...`);
        const ast = parse(html);
        /* eslint-disable-next-line one-var */
        let title, description, ogTitle, ogDescription;
        walk(ast, {
          enter(node) {
            if (
              node.type === SyntaxKind.Tag &&
              node.name === 'title' &&
              node.body &&
              node.body[0]
            )
              title = (node.body[0] as IText).value;
            if (node.type === SyntaxKind.Tag && node.name === 'meta') {
              const name = node.attributes.find((a) => a.name.value === 'name');
              const content = node.attributes.find(
                (a) => a.name.value === 'content'
              );
              if (name?.value?.value === 'description')
                description = content?.value?.value ?? '';
              const property = node.attributes.find(
                (a) => a.name.value === 'property'
              );
              if (property?.value?.value === 'og:description')
                ogDescription = content?.value?.value ?? '';
              if (property?.value?.value === 'og:title')
                ogTitle = content?.value?.value ?? '';
            }
          },
        });
        linksToUpdate.push({
          url: article.url,
          display_url: article.display_url,
          status: res.status,
          title: decode(ogTitle || title) || null,
          description: decode(ogDescription || description) || null,
          unwound_url: res.url,
        });
      } catch (e) {
        log.error(`Error fetching link (${url}): ${(e as Error).message}`);
      }
    })
  );
  log.info(`Updating ${linksToUpdate.length} links...`);
  // Prisma doesn't support bulk PostgreSQL updates, so I have to use this:
  // @see {@link https://github.com/prisma/prisma/issues/6862}
  await db.$transaction(
    linksToUpdate.map((data) =>
      db.links.update({ data, where: { url: data.url } })
    )
  );
}
