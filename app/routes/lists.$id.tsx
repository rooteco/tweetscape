import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import { autoLink, lang, log } from '~/utils.server';
import { commitSession, getSession } from '~/session.server';
import type { Article } from '~/types';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import Nav from '~/components/nav';
import OAuth from '~/components/oauth';
import { redis } from '~/redis.server';

export type LoaderData = { articles: Article[]; locale: string };

export type Filter = 'show_retweets' | 'hide_retweets';

export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles for list (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const filter = (url.searchParams.get('filter') ?? 'hide_retweets') as Filter;
  /* prettier-ignore */
  const articles = await redis<Article>(
    `
    select
      links.*,
      json_agg(tweets.*) as tweets
    from links
      inner join (
        select distinct on (urls.link_id, tweets.author_id)
          urls.link_id as link_id,
          tweets.*
        from urls
          inner join (
            select 
              tweets.*,
              to_json(influencers.*) as author
            from tweets
              inner join influencers on influencers.id = tweets.author_id
              inner join list_members on list_members.influencer_id = influencers.id
            where list_members.list_id = '${params.id}'
            ${filter === 'hide_retweets' ? `and not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : ''}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_id = links.id
    where expanded_url !~ '^https?:\\/\\/twitter\\.com'
    group by links.id
    order by count(tweets) desc
    limit 20;
    `
  );
  log.trace(`Articles: ${JSON.stringify(articles, null, 2)}`);
  log.info(`Fetched ${articles.length} articles for list (${params.id}).`);
  articles.forEach((article) =>
    article.tweets.forEach((tweet) => {
      tweet.html = autoLink(tweet.text, {
        linkAttributeBlock(entity, attrs) {
          attrs.target = '_blank';
          attrs.rel = 'noopener noreferrer';
          attrs.class = 'hover:underline';
        },
      });
    })
  );
  return json<LoaderData>(
    { articles, locale: lang(request) },
    { headers: { 'Set-Cookie': await commitSession(session) } }
  );
};

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <main>
      <Nav />
      <Empty>
        <p>an unexpected runtime error occurred</p>
        <p>{error.message}</p>
      </Empty>
    </main>
  );
}

export default function Cluster() {
  const { articles } = useLoaderData<LoaderData>();
  return (
    <main>
      <OAuth />
      <Nav />
      <ol className='text-sm'>
        {!articles.length && <Empty>no articles to show</Empty>}
        {articles.map((a) => (
          <ArticleItem {...a} key={Number(a.id)} />
        ))}
      </ol>
    </main>
  );
}
