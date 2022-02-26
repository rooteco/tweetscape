import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import { decode, log } from '~/utils.server';
import { topic } from '~/cookies.server';

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
  entities: {
    urls: URL[];
    mentions: Mention[];
    annotations: Annotation[];
    hashtags: Tag[];
    cashtags: Tag[];
  };
  created_at: string;
}

interface TwitterSearch {
  data: Tweet[];
  includes: {
    users: { id: string; name: string; username: string }[];
    tweets: Tweet[];
  };
  meta: {
    newest_id: string;
    oldest_id: string;
    result_count: number;
    next_token: string;
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

interface Article {
  url: string;
  domain: string;
  title: string;
  description: string;
  tweets: (Tweet & { author: Influencer })[];
  date: string;
}

declare const HIVE_TOKEN: string;
declare const TWITTER_TOKEN: string;
export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.topic, 'expected params.topic');
  if (!['eth', 'btc', 'nfts', 'tesla'].includes(params.topic))
    return new Response('Not Found', { status: 404 });
  log.info('Fetching influencers...');
  const hive = await fetch(
    `https://api.borg.id/influence/clusters/Tesla/influencers?page=0&sort_by=score&sort_direction=desc&influence_type=all`,
    {
      headers: { authorization: `Token ${HIVE_TOKEN}` },
    }
  );
  const { influencers } = (await hive.json()) as { influencers: Influencer[] };
  log.info('Fetching tweets...');
  // I'm limited to 512 characters in my Twitter search query and thus can't
  // filter by all 100 of the top ranked influencers from Hive. Instead, I just
  // search for tweets made by the top 25 influencers in the last 7 days.
  const query = `tesla has:links (${influencers
    .slice(0, 25)
    .map((i) => `from:${i.social_account.social_account.screen_name}`)
    .join(' OR ')})`;
  // TODO: Decide whether or not to sort by recency or relevancy.
  const twitter = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(
      query
    )}&tweet.fields=created_at,entities,author_id,public_metrics,referenced_tweets&expansions=referenced_tweets.id,referenced_tweets.id.author_id&max_results=100`,
    {
      headers: { authorization: `Bearer ${TWITTER_TOKEN}` },
    }
  );
  const search = (await twitter.json()) as TwitterSearch;
  log.info(`Fetched ${search.data.length} tweets.`);
  // Only look at tweets that link to articles and content outside of Twitter.
  // TODO: Also add the attention scores of every referenced tweet. Ideally, we
  // want the sum of every single time the link has been shared on Twitter. This
  // is, however, beyond the scope of what Tweetscape would be capable of, so we
  // do the next best thing:
  // - Start with the author's attention score.
  // - Add the attention scores of the authors of the quoted or retweeted tweet.
  const links: Link[] = [];
  const isArticleURL = (l?: URL) =>
    l && l.expanded_url && !/twitter.com/.test(l.expanded_url);
  search.data
    .filter((t) => t.entities.urls?.some(isArticleURL))
    .forEach((t: Tweet) => {
      const url = t.entities.urls.filter(isArticleURL)[0];
      const author = influencers.find(
        (i) => i.social_account.social_account.id === t.author_id
      );
      invariant(author, `expected tweeter (${t.author_id}) to be influencer`);

      const link = links.find(
        (l) => l.url.expanded_url === url.expanded_url
      ) ?? { url, tweets: [] };

      log.debug('============================================================');
      log.debug(
        `Author: ${
          author.social_account.social_account.id
        } | https://hive.one/p/${
          author.social_account.social_account.screen_name
        } | ${author.social_account.social_account.name} | @${
          author.social_account.social_account.screen_name
        } | Rank: ${
          author.rank
        } | Insider Score: ${author.insider_score.toFixed(
          2
        )} | Attention Score: ${author.attention_score.toFixed(
          2
        )} | Weekly Change: ${author.attention_score_change_week.toFixed(2)}`
      );
      log.debug(
        `Link: ${link.url.expanded_url} | ${link.tweets.length} tweets`
      );
      log.debug(
        `Tweet: https://twitter.com/` +
          `${author.social_account.social_account.screen_name}/status/${t.id}` +
          `\n\n${t.text}\n`
      );

      function count(rt: Omit<TweetRef, 'type'> & Partial<TweetRef>) {
        if (rt.type === 'replied_to') {
          log.debug(`Skipping replied_to tweet (${rt.id})`);
          return;
        }
        if (link.tweets.some((tt) => rt.id === tt.id)) {
          log.debug(`Skipping already counted tweet (${rt.id})`);
          return;
        }
        const tweets = [...search.data, ...search.includes.tweets];
        const tweet = tweets.find((tt) => rt.id === tt.id);
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

  // Sort links descendingly by attention score sum.
  const ranked = links
    .map((l) => ({
      ...l,
      score: l.tweets.reduce((s, c) => s + c.author.attention_score, 0),
    }))
    .sort((a, b) => b.score - a.score);

  const articles: Article[] = await Promise.all(
    ranked.map(async (l) => {
      const url = l.url.expanded_url;
      const res = await fetch(url);
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
      return {
        url,
        tweets: l.tweets,
        title: decode(title || l.url.display_url),
        description:
          decode(description) ||
          'no appropriate description meta tag found in article html; perhaps' +
            'they did something weird like put their tag names in ALL CAPS 🤷.',
        // TODO: Perhaps show the most recent share or the first share or the date
        // the article or content link was actually published (use metascraper).
        date: l.tweets[0].created_at,
        domain: new URL(url).hostname.replace(/^www\./, ''),
      };
    })
  );

  return json(articles, {
    headers: { 'Set-Cookie': await topic.serialize(params.topic) },
  });
};

export default function Index() {
  const articles = useLoaderData<Article[]>();
  return (
    <main>
      <ol className='list-decimal text-sm ml-6 mr-4'>
        {articles.map((article) => (
          <li key={article.url} className='my-4'>
            <div className='ml-2'>
              <a
                className='font-serif font-semibold hover:underline text-base'
                href={article.url}
                target='_blank'
                rel='noopener noreferrer'
              >
                {article.title}
              </a>{' '}
              <span className='text-sm'>
                (
                <a
                  className='hover:underline'
                  href={`https://${article.domain}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {article.domain}
                </a>
                )
              </span>
            </div>
            <p className='text-sm ml-2'>{article.description}</p>
            <div className='text-sm text-stone-600 lowercase flex items-center mt-1.5 ml-2'>
              <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
                {article.tweets.map((tweet) => (
                  <img
                    className='inline-block cursor-pointer duration-75 hover:transition hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full border-2 border-white -mr-2 first:mr-0'
                    src={`/img/${encodeURIComponent(
                      tweet.author.social_account.social_account
                        .profile_image_url
                    )}`}
                    key={tweet.id}
                    alt=''
                  />
                ))}
              </span>
              <span className='ml-1 hover:underline cursor-pointer'>
                {article.tweets.length} Tweets
              </span>
              <span className='mx-1'>•</span>
              <span>
                {new Date(article.date).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className='mx-1'>•</span>
              <span>
                {new Date(article.date).toLocaleString(undefined, {
                  hour: 'numeric',
                  minute: 'numeric',
                })}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
