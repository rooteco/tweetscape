import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { json } from 'remix';

import type { Article, Tweet, TweetRef, URL } from '~/types.server';
import { decode, fetchFromCache, log } from '~/utils.server';

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

async function getTweets(id: string): Promise<TwitterData> {
  log.info(`Fetching tweets for influencer (${id})...`);
  const res = await fetchFromCache(
    `https://api.twitter.com/2/users/${id}/tweets?` +
      `tweet.fields=created_at,entities,author_id,public_metrics,referenced_tweets&` +
      `expansions=referenced_tweets.id,referenced_tweets.id.author_id&` +
      `max_results=15`,
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
    const res = await fetchFromCache(url, {
      signal: controller.signal,
    });
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

async function getArticles(id: string): Promise<Article[]> {
  const tweets = await getTweets(id);
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

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles for influencer (${params.id})...`);
  const articles = await getArticles(params.id);
  return json(articles);
};
