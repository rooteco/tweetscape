import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';
import { json } from 'remix';

import type { Article, Influencer, Tweet } from '~/types.server';
import { caps, fetchFromCache, log } from '~/utils.server';
import { topic } from '~/cookies.server';

// How many influencers to fetch at a time. Hive returns influencers in batches
// of 50, but Cloudflare only allows 50 subrequests per worker (which counts
// calls to the cache API; thus, each influencer requires at max 3 calls: 1
// `cache.match`, 1 `fetch`, and 1 `cache.put`). Thus: BATCH_SIZE * 3 <= 50 and,
// to avoid further pagination complexity, 50 % BATCH_SIZE === 0.
const BATCH_SIZE = 10;

function logTweet(t: Tweet, a: Article): void {
  log.debug('============================================================');
  if (t.author)
    log.debug(
      `Author: ${t.author_id} | https://hive.one/p/${
        t.author.social_account.social_account.screen_name
      } | ${t.author.social_account.social_account.name} | @${
        t.author.social_account.social_account.screen_name
      } | Rank: ${
        t.author.rank
      } | Insider Score: ${t.author.insider_score.toFixed(
        2
      )} | Attention Score: ${t.author.attention_score.toFixed(
        2
      )} | Weekly Change: ${t.author.attention_score_change_week.toFixed(2)}`
    );
  log.debug(`Link: ${a.url} | ${a.tweets.length} tweets`);
  log.debug(
    `Tweet: https://twitter.com/${t.author_id}/status/${t.id}\n\n${t.text}\n`
  );
}

interface HiveData {
  influencers: Influencer[];
  has_more: boolean;
  total: string;
}

async function getInfluencers(t: string, n = 0): Promise<HiveData> {
  log.info(`Fetching influencers for topic (${t})...`);
  // Hive returns results in batches of 50. Seeing as their currently isn't a
  // documented way to change this, I manage my own pagination in groups of "n".
  // @see https://www.notion.so/API-Docs-69fe2f3d624843fcb0b44658b135161b
  const page = Math.floor(n / 50);
  const res = await fetchFromCache(
    `https://api.borg.id/influence/clusters/${caps(t)}/influencers?` +
      `page=${page}&sort_by=score&sort_direction=desc&influence_type=all`,
    { headers: { authorization: `Token ${HIVE_TOKEN}` } }
  );
  const headers = Object.fromEntries(res.headers.entries());
  log.trace(`Headers: ${JSON.stringify(headers, null, 2)}`);
  const data = (await res.json()) as HiveData;
  return {
    ...data,
    has_more: data.has_more || (n + BATCH_SIZE) % 50 > 0,
    influencers: data.influencers.slice(n, n + BATCH_SIZE),
  };
}

async function getArticles(i: Influencer, host: string): Promise<Article[]> {
  const { id } = i.social_account.social_account;
  log.debug(`Fetching articles for influencer (${id})...`);
  const res = await fetch(`${host}/influencers/${id}/articles`, {
    body: JSON.stringify([]),
    method: 'POST',
  });
  const data = (await res.json()) as Article[];
  return data;
}

export const action: ActionFunction = async ({ params, request }) => {
  invariant(params.topic, 'expected params.topic');
  const n = Number(new URL(request.url).searchParams.get('n') ?? 0);
  const articles = ((await request.json()) ?? []) as Article[];
  const url = new URL(request.url);
  const host = `${url.protocol}//${url.host}`;

  // 1. Fetch all 12989 influencers from Hive (in batches of 100).
  const { influencers, has_more: more } = await getInfluencers(params.topic, n);

  // 2. For each influencer, fetch all 3200 tweets from Twitter timeline (in
  // batches of 100) and each tweet's article's metadata (e.g. title).
  (await Promise.all(influencers.map((i) => getArticles(i, host))))
    .flat()
    .forEach((a: Article) => {
      const exists = articles.find((b) => b.url === a.url);
      a.tweets.forEach((t: Tweet) => {
        /* eslint-disable-next-line no-param-reassign */
        t.author = influencers.find(
          (i) => i.social_account.social_account.id === t.author_id
        );
        if (!t.author) log.warn(`Author (${t.author_id}) not an influencer.`);
        if (exists?.tweets.every((c) => c.id !== t.id)) exists.tweets.push(t);
        logTweet(t, a);
      });
      if (!exists) articles.push(a);
    });

  // 3. Sort articles descendingly by their tweets' authors' attention scores.
  const sc = (a: number, b: Tweet) => a + (b.author?.attention_score ?? 0);
  articles.sort((a, b) => b.tweets.reduce(sc, 0) - a.tweets.reduce(sc, 0));

  // 4. Recursively continue to fetch influencers and their articles (note that
  // Cloudflare Workers are limited to 16 recursions... i.e. 160 influencers).
  if (!more || n >= 14 * BATCH_SIZE) return json(articles);
  return fetch(`${host}/articles/${params.topic}?n=${n + BATCH_SIZE}`, {
    headers: { 'Set-Cookie': await topic.serialize(params.topic) },
    body: JSON.stringify(articles),
    method: 'POST',
  });
};
