import { SyntaxKind, parse, walk } from 'html5parser';
import type { ActionFunction } from 'remix';
import Bottleneck from 'bottleneck';
import type { IText } from 'html5parser';
import { decode } from 'html-entities';
import invariant from 'tiny-invariant';

import type { Article, Link, List } from '~/types';
import { FILTERS, getListArticles } from '~/articles.server';
import { commitSession, getSession } from '~/session.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';
import { swr } from '~/swr.server';

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

function needsToBeFetched(article: Article): boolean {
  return !article.title || !article.description;
}

export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  invariant(uid, 'expected session uid');
  log.info(`Fetching owned and followed lists for user (${uid})...`);
  // TODO: Move this `swr` query call into a reusable function (as it's used
  // both here and in the `app/root.tsx` loader function).
  // TODO: Should I allow potentially stale data (from redis) to be used here?
  // TODO: Wrap the `uid` in some SQL injection avoidance mechanism as it's
  // very much possible that somebody smart and devious could:
  // a) find our cookie secret and encrypt their own (fake) session cookie;
  // b) set the session cookie `uid` to some malicious raw SQL;
  // c) have that SQL run here and mess up our production db.
  const lists = await swr<Pick<List, 'id'>>(
    `
    select lists.id from lists
    left outer join list_followers on list_followers.list_id = lists.id
    where lists.owner_id = '${uid}' or list_followers.influencer_id = '${uid}'
    `
  );
  const listIds = lists.map((l) => l.id);
  log.info(`Fetching articles for ${listIds.length} user (${uid}) lists...`);
  const articlesToFetch: Article[] = [];
  await Promise.all(
    listIds
      .map((listId) =>
        FILTERS.map(async (filter) => {
          const articles = await getListArticles(listId, filter);
          articles.forEach((article) => {
            if (
              needsToBeFetched(article) &&
              !articlesToFetch.some(
                (a) => a.expanded_url === article.expanded_url
              )
            )
              articlesToFetch.push(article);
          });
        })
      )
      .flat()
  );
  log.info(`Fetching ${articlesToFetch.length} link metadata...`);
  const linksToUpdate: Link[] = [];
  await Promise.all(
    articlesToFetch.map(async (article) => {
      const url = article.expanded_url;
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
          id: article.id,
          url: article.url,
          expanded_url: article.expanded_url,
          display_url: article.display_url,
          status: res.status,
          title: decode(ogTitle || title) || null,
          description: decode(ogDescription || description) || null,
          unwound_url: res.headers.get('Location') ?? url,
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
    linksToUpdate.map((link) =>
      db.links.update({
        data: { ...link, id: undefined },
        where: { id: link.id },
      })
    )
  );
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};
