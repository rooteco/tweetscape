import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';
import { json } from 'remix';

import type { Article, Tweet, TweetRef, URL } from '~/types.server';
import { decode, fetchFromCache, log } from '~/utils.server';

const BATCH_SIZE = 15;

interface TwitterData {
  data?: Tweet[];
  includes?: {
    users?: { id: string; name: string; username: string }[];
    tweets?: Tweet[];
  };
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count?: number;
    next_token?: string;
  };
  errors?: { parameters: Record<string, string[]>; message: string }[];
  title?: string;
  detail?: string;
  type?: string;
}

async function getTweets(id: string, token = ''): Promise<TwitterData> {
  log.info(`Fetching tweets for influencer (${id})...`);
  const res = await fetchFromCache(
    `https://api.twitter.com/2/users/${id}/tweets?` +
      `tweet.fields=created_at,entities,author_id,public_metrics,referenced_tweets&` +
      `expansions=referenced_tweets.id.author_id,referenced_tweets.id&` +
      `max_results=${BATCH_SIZE}${token ? `&pagination_token=${token}` : ''}`,
    { headers: { authorization: `Bearer ${TWITTER_TOKEN}` } }
  );
  const headers = Object.fromEntries(res.headers.entries());
  log.trace(`Headers: ${JSON.stringify(headers, null, 2)}`);
  const data = (await res.json()) as TwitterData;
  if (data.errors && data.title && data.detail && data.type)
    log.error(`${data.title}: ${data.detail} (${data.type})`);
  return data;
}

async function getArticle(url: string, tweets: Tweet[]): Promise<Article> {
  log.debug(`Fetching metadata for link (${url})...`);
  const article = {
    url,
    tweets,
    title: `${decode(url.replace(/^https?:\/\/(www\.)?/, '').substr(0, 50))}…`,
    description:
      'No appropriate description meta tag found in article html; perhaps' +
      ' they did something weird like put their tag names in all caps 🤷.',
    // TODO: Perhaps show the most recent share or the first share or the date
    // the article or content link was actually published (use metascraper).
    domain: new URL(url).hostname.replace(/^www\./, ''),
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetchFromCache(url, { signal: controller.signal });
    const headers = Object.fromEntries(res.headers.entries());
    log.trace(`Headers (${url}): ${JSON.stringify(headers, null, 2)}`);
    clearTimeout(timeoutId);
    let title = '';
    let description = '';
    await new HTMLRewriter()
      .on('meta', {
        element(el) {
          const content = el.getAttribute('content');
          if (content && el.getAttribute('property') === 'og:description')
            description = content;
          if (content && el.getAttribute('name') === 'description')
            description = content;
          if (content && el.getAttribute('property') === 'og:title')
            title = content;
        },
      })
      .on('title', {
        text(txt) {
          title += txt.text;
        },
      })
      .transform(res)
      .text();
    article.title = decode(title) || article.title;
    article.description = decode(description) || article.description;
  } catch (e) {
    log.error(`Error fetching link (${url}): ${e.message}`);
  }
  return article;
}

function isArticleURL(l?: URL): boolean {
  return !!l && !!l.expanded_url && !/twitter.com/.test(l.expanded_url);
}

function getArticles(id: string, tweets: TwitterData): Promise<Article[]> {
  log.info(`Constructing articles for influencer (${id})...`);
  const all = [...(tweets.data ?? []), ...(tweets.includes?.tweets ?? [])];
  const links: { url: string; tweets: Tweet[] }[] = [];
  (tweets.data ?? [])
    .filter((t) => t.entities?.urls?.some(isArticleURL))
    .forEach((t: Tweet) => {
      if (id !== t.author_id)
        throw new Error(`Tweet (${t.id}) author (${t.author_id}) not (${id})`);

      const url = t.entities?.urls?.filter(isArticleURL)[0].expanded_url;
      invariant(url, `expected tweet (${t.id}) to have url`);
      const exists = links.find((l) => l.url === url);
      const link = exists ?? { url, tweets: [t] };

      function count(rt: Omit<TweetRef, 'type'> & Partial<TweetRef>) {
        if (rt.type === 'replied_to') {
          log.debug(`Skipping replied_to tweet (${rt.id})`);
          return;
        }
        if (link.tweets.some((tt) => rt.id === tt.id)) {
          log.debug(`Skipping already counted tweet (${rt.id})`);
          return;
        }
        const tweet = all.find((tt) => rt.id === tt.id);
        if (!tweet) {
          log.warn(`Missing ${rt.type ?? 'original'} tweet (${rt.id})`);
          return;
        }
        tweet.referenced_tweets?.forEach(count);
        if (link.tweets.some((tt) => tt.author_id === tweet.author_id)) {
          log.debug(`Skipping already counted author (${tweet.author_id})`);
          return;
        }
        log.debug(
          `Adding ${rt.type ?? 'original'} tweet (${rt.id}) author (https:` +
            `//hive.one/p/${tweet.author_id}) score to link (${link.url})`
        );
        link.tweets.push(tweet);
        log.debug(`${link.tweets.length} tweets for link (${link.url})`);
      }

      count(t);

      if (!exists) links.push(link);
    });
  return Promise.all(links.map((l) => getArticle(l.url, l.tweets)));
}

export const action: ActionFunction = async ({ params, request }) => {
  invariant(params.id, 'expected params.id');
  const n = Number(new URL(request.url).searchParams.get('n') ?? 0);
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const articles = ((await request.json()) ?? []) as Article[];

  // 1. Fetch the most recent 15 tweets.
  const tweets = await getTweets(params.id, token);

  // 2. Fetch the article metadata for each of those tweets.
  (await getArticles(params.id, tweets)).forEach((a) => articles.push(a));

  // 3. Continue to recursively fetch tweets (and their article metadata).
  if (!tweets.meta?.next_token || n >= 13) return json(articles);
  const url = new URL(request.url);
  const api = `${url.protocol}//${url.host}/influencers/${params.id}/articles`;
  return fetch(`${api}?token=${tweets.meta.next_token}&n=${n + 1}`, {
    body: JSON.stringify(articles),
    method: 'POST',
  });
};
