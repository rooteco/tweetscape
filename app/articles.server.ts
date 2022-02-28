import invariant from 'tiny-invariant';

import { caps, decode, log } from '~/utils.server';

interface Entity {
  start: number;
  end: number;
}

interface URL extends Entity {
  url: string;
  expanded_url: string;
  display_url: string;
  images?: { url: string; width: number; height: number }[];
  status?: number;
  title?: string;
  description?: string;
  unwound_url?: string;
}

interface Tag extends Entity {
  tag: string;
}

interface Mention extends Entity {
  username: string;
  id: string;
}

interface Annotation extends Entity {
  probability: number;
  type: 'Organization' | 'Place' | 'Person' | 'Product';
  normalized_text: string;
}

interface TweetRef {
  type: 'quoted' | 'retweeted' | 'replied_to';
  id: string;
}

interface Tweet {
  author_id: string;
  text: string;
  referenced_tweets: TweetRef[];
  id: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  entities?: {
    urls?: URL[];
    mentions?: Mention[];
    annotations?: Annotation[];
    hashtags?: Tag[];
    cashtags?: Tag[];
  };
  created_at: string;
}

interface TwitterSearch {
  data?: Tweet[];
  includes?: {
    users?: { id: string; name: string; username: string }[];
    tweets?: Tweet[];
  };
  meta: {
    newest_id?: string;
    oldest_id?: string;
    result_count: number;
    next_token?: string;
  };
}

interface SocialAccount {
  created_at: string;
  followers_count: string;
  following_count: string;
  id: string;
  name: string;
  personal: boolean;
  profile_image_url: string;
  screen_name: string;
  tweets_count: string;
  updated_at: string;
}

interface Influencer {
  attention_score: number;
  attention_score_change_week: number;
  cluster_id: string;
  created_at: string;
  id: string;
  identity: {
    clusters: unknown[];
    id: string;
    social_accounts: { social_account: SocialAccount }[];
  };
  insider_score: number;
  personal_rank: string;
  rank: string;
  social_account: { social_account: SocialAccount };
}

interface Link {
  url: URL;
  tweets: (Tweet & { author: Influencer })[];
}

export interface Article {
  url: string;
  domain: string;
  title: string;
  description: string;
  tweets: (Tweet & { author: Influencer })[];
  date: string;
}

function logTweet(t: Tweet, a: Influencer, l: Link): void {
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
  log.debug(`Link: ${l.url.expanded_url} | ${l.tweets.length} tweets`);
  log.debug(
    `Tweet: https://twitter.com/` +
      `${a.social_account.social_account.screen_name}/status/${t.id}` +
      `\n\n${t.text}\n`
  );
}

async function getInfluencers(topic: string): Promise<Influencer[]> {
  log.info(`Fetching influencers for topic (${topic})...`);
  const res = await fetch(
    `https://api.borg.id/influence/clusters/${caps(topic)}/influencers?` +
      `page=0&sort_by=score&sort_direction=desc&influence_type=all`,
    {
      headers: { authorization: `Token ${HIVE_TOKEN}` },
      cf: { cacheTtl: 24 * 60 * 60, cacheEverything: true },
    }
  );
  const headers = Object.fromEntries(res.headers.entries());
  log.debug(`Headers: ${JSON.stringify(headers, null, 2)}`);
  const { influencers } = (await res.json()) as { influencers: Influencer[] };
  log.info(`Fetched ${influencers.length} influencers.`);
  return influencers.slice(0, 5);
}

async function getTweets(influencer: Influencer): Promise<TwitterSearch> {
  const id = influencer.social_account.social_account.id;
  log.info(`Fetching tweets for influencer (${id})...`);
  const res = await fetch(
    `https://api.twitter.com/2/users/${id}/tweets?` +
      `tweet.fields=created_at,entities,author_id,public_metrics,referenced_tweets&` +
      `expansions=referenced_tweets.id,referenced_tweets.id.author_id&` +
      `max_results=100`,
    {
      headers: { authorization: `Bearer ${TWITTER_TOKEN}` },
      cf: { cacheTtl: 24 * 60 * 60, cacheEverything: true },
    }
  );
  const headers = Object.fromEntries(res.headers.entries());
  log.debug(`Headers: ${JSON.stringify(headers, null, 2)}`);
  const search = (await res.json()) as TwitterSearch;
  log.info(`Fetched ${search.meta.result_count} tweets.`);
  return search;
}

async function getArticle(l: Link): Promise<Article> {
  const url = l.url.expanded_url;
  log.debug(`Fetching metadata for link (${url})...`);
  const article = {
    url,
    tweets: l.tweets,
    title: decode(l.url.display_url),
    description:
      'No appropriate description meta tag found in article html; perhaps' +
      ' they did something weird like put their tag names in all caps 🤷.',
    // TODO: Perhaps show the most recent share or the first share or the date
    // the article or content link was actually published (use metascraper).
    date: l.tweets[0].created_at,
    domain: new URL(url).hostname.replace(/^www\./, ''),
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      cf: { cacheTtl: 24 * 60 * 60, cacheEverything: true },
    });
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
    log.error(`Error fetching metadata for link (${url}): ${e.message}`);
  }
  return article;
}

export async function getArticles(topic: string): Promise<Article[]> {
  // 1. Fetch all 12989 influencers from Hive (in batches of 100).
  const influencers = await getInfluencers(topic);
  // 2. For each influencer, fetch all 3200 tweets from Twitter timeline (in
  // batches of 100).
  const tweets = await Promise.all(influencers.map((i) => getTweets(i)));
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
    .forEach((t: Tweet) => {
      const url = t.entities?.urls?.filter(isArticleURL)[0];
      const author = influencers.find(
        (i) => i.social_account.social_account.id === t.author_id
      );

      invariant(url, `expected tweet (${t.id}) to have url`);
      invariant(author, `expected tweeter (${t.author_id}) to be influencer`);

      const exists = links.find((l) => l.url.expanded_url === url.expanded_url);
      const link = exists ?? { url, tweets: [] };

      logTweet(t, author, link);

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
          `Adding ${rt.type ?? 'original'} tweet (${rt.id}) author (https://` +
            `hive.one/p/${a.social_account.social_account.screen_name}) score` +
            `(${a.attention_score.toFixed(2)}) to link (${
              link.url.expanded_url
            })`
        );
        link.tweets.push({ ...tweet, author: a });
        log.debug(
          `${link.tweets.length} tweets for link (${link.url.expanded_url})`
        );
      }

      count(t);

      if (!links.includes(link)) links.push(link);
    });

  log.info(`Fetching metadata for ${links.length} links...`);
  return Promise.all(
    links
      .map((l) => {
        const sum = l.tweets.reduce((s, c) => s + c.author.attention_score, 0);
        return { ...l, score: sum };
      })
      .sort((a, b) => b.score - a.score)
      .map((l) => getArticle(l))
  );
}
