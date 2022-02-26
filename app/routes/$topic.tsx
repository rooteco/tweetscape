import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import log from '~/log';
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

// Return a random integer between min and max (inclusive).
function random(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Sample **n** random values from a collection using the modern version of the
// [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
// If **n** is not specified, returns a single random element.
// The internal `guard` argument allows it to work with `map`.
function sample<T>(obj: T[], num: number): T[] {
  const sampl = Array.from(obj);
  const n = Math.max(Math.min(num, sampl.length), 0);
  const last = sampl.length - 1;
  for (let index = 0; index < n; index += 1) {
    const rand = random(index, last);
    const temp = sampl[index];
    sampl[index] = sampl[rand];
    sampl[rand] = temp;
  }
  return sampl.slice(0, n);
}

let id = 0;
function pic() {
  const src = `/pics/${
    sample(['brendon', 'jasmine', 'rauchg', 'rhys', 'ryan', 'vanessa'], 1)[0]
  }.jpg`;
  id += 1;
  return { id, src };
}

declare const HIVE_TOKEN: string;
declare const TWITTER_TOKEN: string;
export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.topic, 'expected params.topic');
  if (!['eth', 'btc', 'nfts', 'tesla'].includes(params.topic))
    throw new Response('Not Found', { status: 404 });
  log.info('Fetching influencers...');
  const hive = await fetch(
    `https://api.borg.id/influence/clusters/Tesla/influencers?page=0&sort_by=score&sort_direction=desc&influence_type=all`,
    {
      headers: { authorization: `Token ${HIVE_TOKEN}` },
    }
  );
  const { influencers } = (await hive.json()) as { influencers: Influencer[] };
  log.debug(`Influencer: ${JSON.stringify(influencers[0], null, 2)}`);
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
  search.data
    .filter((t) =>
      t.entities.urls?.some(
        (l) => l && l.expanded_url && !/twitter.com/.test(l.expanded_url)
      )
    )
    .forEach((t: Tweet) => {
      // TODO: Perhaps remove the assumption that each tweet only has one link.
      const url = t.entities.urls.filter(
        (l) => l && l.expanded_url && !/twitter.com/.test(l.expanded_url)
      )[0];
      const author = influencers.find(
        (i) => i.social_account.social_account.id === t.author_id
      );
      invariant(author, `expected tweeter (${t.author_id}) to be influencer`);

      log.debug(
        `Tweet (https://twitter.com/${author.social_account.social_account.screen_name}/status/${t.id}): ${t.text}`
      );
      log.debug(
        `Author (https://hive.one/p/${
          author.social_account.social_account.screen_name
        }): ${author.social_account.social_account.name} (@${
          author.social_account.social_account.screen_name
        }) (Rank: ${
          author.rank
        }) (Insider Score: ${author.insider_score.toFixed(
          2
        )}) (Attention Score: ${author.attention_score.toFixed(
          2
        )}) (Weekly Change: ${author.attention_score_change_week.toFixed(2)})`
      );
      log.debug(
        `Links: ${JSON.stringify(
          t.entities.urls.filter(
            (l) => l && l.expanded_url && !/twitter.com/.test(l.expanded_url)
          ),
          null,
          2
        )}`
      );

      log.debug(`Tweet: ${JSON.stringify(t, null, 2)}`);
      const link = links.find((l) => l.url.url === url.url) ?? {
        url,
        tweets: [{ ...t, author }],
      };
      t.referenced_tweets?.forEach((rt) => {
        log.debug(`Referenced tweet: ${JSON.stringify(rt, null, 2)}`);
        if (rt.type === 'replied_to')
          return log.debug(
            `Skipping reply to tweet: ${JSON.stringify(rt, null, 2)}`
          );
        if (link.tweets.some((tt) => rt.id === tt.id))
          return log.debug(
            `Skipping already counted tweet: ${JSON.stringify(rt, null, 2)}`
          );
        // TODO: Recursively add referenced tweets (unless already counted).
        const rtt = [...search.data, ...search.includes.tweets].find(
          (tt) => rt.id === tt.id
        );
        if (!rtt)
          return log.warn(
            `Missing referenced tweet: ${JSON.stringify(rt, null, 2)}`
          );
        const rta = influencers.find(
          (i) => i.social_account.social_account.id === rtt.author_id
        );
        if (!rta)
          return log.warn(
            `Missing referenced tweet author: ${JSON.stringify(rtt, null, 2)}`
          );
        log.debug(
          `Adding referenced parent tweet score (${rta.social_account.social_account.screen_name}): ${rta.attention_score}`
        );
        link.tweets.push({ ...rtt, author: rta });
      });
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
      const html = await res.text();
      // TODO: Use CloudFlare's HTMLRewriter to do this HTML parsing.
      let descriptionMatches =
        /<meta\b([^>]*\bcontent=(['"])(.*)\2)?[^>]*\bproperty=["]og:description["]([^>]*\bcontent=(['"])(.*)\2)?\s*\/?[>]/.exec(
          html
        );
      if (!descriptionMatches) log.warn(`No og:description matches: ${url}`);
      descriptionMatches =
        /<meta\b([^>]*\bcontent=(['"])(.*)\2)?[^>]*\bname=["]description["]([^>]*\bcontent=(['"])(.*)\2)?\s*\/?[>]/.exec(
          html
        );
      if (!descriptionMatches) log.warn(`No description matches: ${url}`);
      const [
        descriptionHTML,
        contentBeforeHTML,
        contentBeforeQuoteMark,
        contentBeforeText,
        contentAfterHTML,
        contentAfterQuoteMark,
        contentAfterText,
      ] = descriptionMatches ?? [];
      const ogTitleMatches =
        /<meta\b([^>]*\bcontent=(['"])(.*)\2)?[^>]*\bproperty=["]og:title["]([^>]*\bcontent=(['"])(.*)\2)?\s*\/?[>]/.exec(
          html
        );
      if (!ogTitleMatches) log.warn(`No og:title matches: ${url}`);
      const [
        ogTitleHTML,
        titleBeforeHTML,
        titleBeforeQuoteMark,
        titleBeforeText,
        titleAfterHTML,
        titleAfterQuoteMark,
        titleAfterText,
      ] = ogTitleMatches ?? [];
      const titleMatches = /<title>[\n\r\s]*(.*)[\n\r\s]*<\/title>/.exec(html);
      if (!titleMatches) log.warn(`No title matches: ${url}`);
      const [titleHTML, titleText] = titleMatches ?? [];
      return {
        url,
        domain: new URL(url).hostname.replace(/^www\./, ''),
        title:
          titleBeforeText || titleAfterText || titleText || l.url.display_url,
        description:
          contentBeforeText ||
          contentAfterText ||
          'no appropriate description meta tag found in article html; perhaps they did something weird like put their tag names in ALL CAPS 🤷.',
        tweets: l.tweets,
        // TODO: Perhaps show the most recent share or the first share or the date
        // the article or content link was actually published (use metascraper).
        date: l.tweets[0].created_at,
      };
    })
  );
  log.debug(`Articles: ${JSON.stringify(articles, null, 2)}`);

  return json(articles, {
    headers: { 'Set-Cookie': await topic.serialize(params.topic) },
  });
  return json(
    [
      {
        url: 'https://www.cbsnews.com/news/ukraine-russia-invasion-economic-impact-united-states',
        domain: 'cbsnews.com',
        title: 'How the Ukraine crisis is already hitting Americans’ wallets',
        description:
          'With higher gas prices, inflation and supply-chain shocks, the conflict in Europe is spilling over into the U.S. economy.',
        shares: Array(25)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 23 • 05:54 AM',
      },
      {
        url: 'https://www.theblockcrypto.com/post/134871/luna-founation-guard-token-sale',
        domain: 'theblockcrypto.com',
        title:
          'Luna Foundation Guard raises $1 billion to form bitcoin reserve for UST stablecoin',
        description:
          'The Luna Foundation Guard (LFG) has raised $1 billion through an over-the-counter sale of LUNA.',
        shares: Array(21)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 22 • 05:02 PM',
      },
      {
        url: 'https://news.bloomberglaw.com/securities-law/sec-accredited-investor-definition-tweak-faces-equity-concerns',
        domain: 'news.bloomberglaw.com',
        title:
          'SEC ‘Accredited Investor’ Definition Tweak Faces Equity Concerns',
        description:
          'The SEC’s plan to reconsider who is eligible to invest in startups’ privately-held share offerings is stirring questions about equity and diversity.',
        shares: Array(16)
          .fill(null)
          .map(() => pic()),
        date: '9h ago',
      },
      {
        url: 'https://www.btc-echo.de/news/bitcoin-spd-gruene-und-linke-fordern-verbot-in-der-eu-135678/',
        domain: 'btc-echo.de',
        title:
          'Exklusiv: SPD, Grüne und Linke wollen Bitcoin in Europa verbieten',
        description:
          'Das EU-Parlament spricht sich für ein Dienstleistungsverbot mit Bitcoin aus – auf Anraten von SPD, Grünen und Linken.',
        shares: Array(13)
          .fill(null)
          .map(() => pic()),
        date: '12h ago',
      },
      {
        url: 'https://blog.obol.tech/announcing-the-proto-community/',
        domain: 'blog.obol.tech',
        title: 'Proto Community Launch',
        description:
          'Obol Proto Community Today we are honored to launch the Obol Proto Community, an onramp to organize, educate, and incentivize community members contributing to DVT and the Obol Ecosystem.   The Proto Community will fuse the different subcommunities of Obol and offer community members the opportunity to participate in the development',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: '20h ago',
      },
      {
        url: 'https://review.mirror.xyz/IRnxxEaQVblaA5OjGpJ3T9XlvqbydzCiDfCYg54jLOo',
        domain: 'review.mirror.xyz',
        title: 'Lens Protocol 🌿',
        description:
          'Lens is a decentralized social graph protocol created by the AAVE team. The purpose of the protocol is to empower creators to own the links in the social graph that connects them with their community. Lens allows accounts to create and follow profiles, publish and collect posts, and much more, focusing on the economics of social interactions.',
        shares: Array(4)
          .fill(null)
          .map(() => pic()),
        date: '20h ago',
      },
      {
        url: 'https://www.theblockcrypto.com/linked/135292/eth-market-faces-500-million-liquidation-if-price-drops-below-2100?utm_source=twitter&utm_medium=social',
        domain: 'theblockcrypto.com',
        title:
          'ETH market faces $500 million liquidation if price drops below $2,100',
        description:
          '$500 million in ETH is in danger of liquidation if a Maker vault holder fails to top their vaults before the price ETH falls below $2,100.',
        shares: Array(2)
          .fill(null)
          .map(() => pic()),
        date: '3h ago',
      },
      {
        url: 'https://aika.market/',
        domain: 'aika.market',
        title: 'Non Fungible Time',
        description:
          'Mint your time as NFTs on the Polygon network. Sell your time to interested parties. Purchase other people’s time.',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 23 • 05:59 PM',
      },
      {
        url: 'https://markets.businessinsider.com/news/currencies/ftx-blockchain-crypto-bitcoin-ethereum-tom-brady-nft-metaverse-fashion-2022-2?utmSource=twitter&utmContent=referral&utmTerm=topbar&referrer=twitter',
        domain: 'markets.businessinsider.com',
        title:
          'FTX takes aim at the $300 billion luxury goods market and hires a beauty entrepreneur to head the push',
        description:
          'Crypto exchange FTX has hired Lauren Remington Platt to work on partnerships with luxury and fashion brands.',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 23 • 07:13 PM',
      },
      {
        url: 'https://www.theblockcrypto.com/post/135286/china-crypto-jail-people-if-funds-raised-public',
        domain: 'theblockcrypto.com',
        title:
          'China can now jail people if funds raised via crypto from public',
        description:
          'China can now issue sentences if funds are raised via crypto from the public as the country’s Supreme Court has amended Criminal Law.',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: '6h ago',
      },
    ],
    { headers: { 'Set-Cookie': await topic.serialize(params.topic) } }
  );
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
              <span className='flex flex-row-reverse justify-end -ml-[2px] mr-2.5'>
                {article.tweets.map((tweet) => (
                  <img
                    className='inline-block cursor-pointer duration-75 hover:transition hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full border-2 border-white -mr-2'
                    key={tweet.id}
                    src={pic().src}
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
