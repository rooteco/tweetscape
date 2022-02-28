import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';
import { json } from 'remix';

import type { Article, Influencer, Tweet, TweetRef, URL } from '~/types.server';
import { caps, decode, log } from '~/utils.server';
import { topic } from '~/cookies.server';

async function fetchFromCache(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const cacheKey = new Request(new URL(url).toString(), init);
  const cache = caches.default;
  let res = await cache.match(cacheKey);
  if (!res) {
    log.debug(`Cache miss for: ${url}`);
    res = await fetch(cacheKey);
    res = new Response(res.body, res);
    res.headers.append('Cache-Control', `s-maxage=${24 * 60 * 60}`);
    await cache.put(cacheKey, res.clone());
  } else {
    log.debug(`Cache hit for: ${url}`);
  }
  return res;
}

interface Link {
  url: URL;
  tweets: (Tweet & { author: Influencer })[];
}

function logTweet(t: Tweet, a: Influencer, url: string, tweets: Tweet[]): void {
  log.debug('============================================================');
  log.debug(
    `Author: ${a.social_account.social_account.id} | https://hive.one/p/${
      a.social_account.social_account.screen_name
    } | ${a.social_account.social_account.name} | @${
      a.social_account.social_account.screen_name
    } | Rank: ${a.rank} | Insider Score: ${a.insider_score.toFixed(
      2
    )} | Attention Score: ${a.attention_score.toFixed(
      2
    )} | Weekly Change: ${a.attention_score_change_week.toFixed(2)}`
  );
  log.debug(`Link: ${url} | ${tweets.length} tweets`);
  log.debug(
    `Tweet: https://twitter.com/` +
      `${a.social_account.social_account.screen_name}/status/${t.id}` +
      `\n\n${t.text}\n`
  );
}

interface HiveData {
  influencers: Influencer[];
  has_more: boolean;
  total: string;
}

async function getInfluencers(topic: string, n = 0): Promise<HiveData> {
  log.info(`Fetching influencers for topic (${topic})...`);
  // Hive returns results in batches of 50; currently, no way to change this.
  // @see https://www.notion.so/API-Docs-69fe2f3d624843fcb0b44658b135161b
  const page = Math.floor(n / 50);
  const res = await fetchFromCache(
    `https://api.borg.id/influence/clusters/${caps(topic)}/influencers?` +
      `page=${page}&sort_by=score&sort_direction=desc&influence_type=all`,
    { headers: { authorization: `Token ${HIVE_TOKEN}` } }
  );
  const headers = Object.fromEntries(res.headers.entries());
  log.debug(`Headers: ${JSON.stringify(headers, null, 2)}`);
  const data = (await res.json()) as HiveData;
  return {
    ...data,
    has_more: data.has_more || (n + 5) % 50 > 0,
    influencers: data.influencers.slice(n, n + 5),
  };
}

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

async function getTweets(influencer: Influencer): Promise<TwitterData> {
  const id = influencer.social_account.social_account.id;
  log.info(`Fetching tweets for influencer (${id})...`);
  const res = await fetchFromCache(
    `https://api.twitter.com/2/users/${id}/tweets?` +
      `tweet.fields=created_at,entities,author_id,public_metrics,referenced_tweets&` +
      `expansions=referenced_tweets.id,referenced_tweets.id.author_id&` +
      `max_results=5`,
    { headers: { authorization: `Bearer ${TWITTER_TOKEN}` } }
  );
  const headers = Object.fromEntries(res.headers.entries());
  log.debug(`Headers: ${JSON.stringify(headers, null, 2)}`);
  const data = (await res.json()) as TwitterData;
  if (data.errors && data.title && data.detail && data.type)
    log.error(`${data.title}: ${data.detail} (${data.type})`);
  return data;
}

async function getArticle(link: Link): Promise<Article> {
  log.debug(`Fetching metadata for link (${link.url.expanded_url})...`);
  const article = {
    score: link.tweets.reduce((a, b) => a + b.author.attention_score, 0),
    tweets: link.tweets,
    url: link.url.expanded_url,
    title: decode(link.url.display_url),
    description:
      'No appropriate description meta tag found in article html; perhaps' +
      ' they did something weird like put their tag names in all caps 🤷.',
    // TODO: Perhaps show the most recent share or the first share or the date
    // the article or content link was actually published (use metascraper).
    domain: new URL(link.url.expanded_url).hostname.replace(/^www\./, ''),
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetchFromCache(link.url.expanded_url, {
      signal: controller.signal,
    });
    const headers = Object.fromEntries(res.headers.entries());
    log.debug(
      `Headers (${link.url.expanded_url}): ${JSON.stringify(headers, null, 2)}`
    );
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
    log.error(`Error fetching link (${link.url.expanded_url}): ${e.message}`);
  }
  return article;
}

export const action: ActionFunction = async ({ params, request }) => {
  invariant(params.topic, 'expected params.topic');
  const n = Number(new URL(request.url).searchParams.get('n') ?? 0);
  const articles = ((await request.json()) ?? []) as Article[];
  // 1. Fetch all 12989 influencers from Hive (in batches of 100).
  const { influencers, has_more } = await getInfluencers(params.topic, n);
  // 2. For each influencer, fetch all 3200 tweets from Twitter timeline (in
  // batches of 100).
  const tweets = await Promise.all(influencers.map(getTweets));
  const all = tweets.reduce(
    (a, b) => [...a, ...(b.data ?? []), ...(b.includes?.tweets ?? [])],
    [] as Tweet[]
  );
  // 3. From each tweet, construct an articles database ranking the top articles
  // by attention score sum.
  const links: Link[] = [];
  const isArticleURL = (l?: URL) =>
    l && l.expanded_url && !/twitter.com/.test(l.expanded_url);
  tweets
    .reduce((a, b) => [...a, ...(b.data ?? [])], [] as Tweet[])
    .filter((t) => t.entities?.urls?.some(isArticleURL))
    .map((t: Tweet) => {
      const url = t.entities?.urls?.filter(isArticleURL)[0];
      const author = influencers.find(
        (i) => i.social_account.social_account.id === t.author_id
      );

      invariant(url, `expected tweet (${t.id}) to have url`);
      invariant(author, `expected tweeter (${t.author_id}) to be influencer`);

      const existing =
        articles.find((a) => a.url === url.expanded_url) ??
        links.find((l) => l.url.expanded_url === url.expanded_url);
      const link = existing ?? { url, tweets: [{ ...t, author }] };

      logTweet(t, author, url.expanded_url, link.tweets);

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
        const a = influencers.find(
          (i) => i.social_account.social_account.id === tweet.author_id
        );
        if (!a) {
          log.warn(`Missing ${rt.type ?? 'original'} tweet (${rt.id}) author`);
          return;
        }
        log.debug(
          `Adding ${rt.type ?? 'original'} tweet (${rt.id}) author (https:` +
            `//hive.one/p/${a.social_account.social_account.screen_name}) ` +
            `score (${a.attention_score.toFixed(2)}) to link (${link.url})`
        );
        link.tweets.push({ ...tweet, author: a });
        log.debug(`${link.tweets.length} tweets for link (${link.url})`);
      }

      count(t);

      if (!existing) links.push(link as Link);
    });

  (await Promise.all(links.map(getArticle))).map((a) => articles.push(a));
  articles.forEach((a) => {
    a.score = a.tweets.reduce((b, c) => b + c.author.attention_score, 0);
  });
  articles.sort((a, b) => b.score - a.score);

  if (!has_more || n >= 20) return json(articles);
  const url = new URL(request.url);
  const host = `${url.protocol}//${url.host}`;
  return fetch(`${host}/articles/${params.topic}?n=${n + 5}`, {
    method: 'POST',
    body: JSON.stringify(articles),
    headers: { 'Set-Cookie': await topic.serialize(params.topic) },
  });
};
