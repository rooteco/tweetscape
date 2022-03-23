import { SyntaxKind, parse, walk } from 'html5parser';
import type { ActionFunction } from 'remix';
import Bottleneck from 'bottleneck';
import type { IText } from 'html5parser';
import { decode } from 'html-entities';

import type { Article, Link } from '~/types';
import { ArticlesFilter, ArticlesSort } from '~/query';
import {
  getListArticles,
  getLists,
  revalidateListsCache,
} from '~/query.server';
import { getLoggedInSession, log } from '~/utils.server';
import { commitSession } from '~/session.server';
import { db } from '~/db.server';

const limiter = new Bottleneck({
  trackDoneStatus: true,
  maxConcurrent: 100,
  minTime: 250,
});
limiter.on('error', (e) => {
  log.error(`Limiter error: ${(e as Error).stack}`);
});
limiter.on('failed', (e) => {
  log.warn(`Limiter job failed: ${(e as Error).stack}`);
});

export const action: ActionFunction = async ({ request }) => {
  const { session, uid } = await getLoggedInSession(request);
  log.info(`Fetching owned and followed lists for user (${uid})...`);
  // TODO: Should I allow potentially stale data (from redis) to be used here?
  const listIds = (await getLists(uid)).map((l) => l.id);
  log.info(`Fetching articles for ${listIds.length} user (${uid}) lists...`);
  const articlesToFetch: Article[] = [];
  await Promise.all(
    listIds
      .map((listId) =>
        Object.values(ArticlesSort).map((sort) => {
          if (typeof sort === 'string') return;
          return Object.values(ArticlesFilter).map(async (filter) => {
            if (typeof filter === 'string') return;
            const articles = await getListArticles(listId, sort, filter);
            articles.forEach((article) => {
              if (article.status === 200) return;
              if (article.title && article.description) return;
              if (articlesToFetch.some((a) => a.url === article.url)) return;
              articlesToFetch.push(article);
            });
          });
        })
      )
      .flat(2)
  );
  log.info(`Fetching ${articlesToFetch.length} link metadata...`);
  const linksToUpdate: Link[] = [];
  await Promise.all(
    articlesToFetch.map(async (article) => {
      const { url } = article;
      try {
        log.debug(`Fetching link (${url}) metadata...`);
        const res = await limiter.schedule({ expiration: 5000 }, fetch, url);
        const html = await res.text();
        log.debug(`Parsing link (${url}) metadata...`);
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
        log.error(`Error fetching link (${url}): ${(e as Error).stack}`);
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
  await revalidateListsCache(listIds);
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};
