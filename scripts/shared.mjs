import path from 'path';

import Bottleneck from 'bottleneck';
import { Pool } from 'pg';
import dotenv from 'dotenv';

import { fetchFromCache, log } from './utils';

// follow the next.js convention for loading `.env` files.
// @see {@link https://nextjs.org/docs/basic-features/environment-variables}
const env = process.env.NODE_ENV ?? 'development';
[
  path.resolve(__dirname, `../.env.${env}.local`),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, `../.env.${env}`),
  path.resolve(__dirname, '../.env'),
].forEach((dotfile) => {
  log.info(`Loaded env from ${dotfile}`);
  dotenv.config({ path: dotfile });
});

// twitter api rate limit: max 1500 timeline API requests per 15 mins per app.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const twitter = new Bottleneck({
  reservoir: 1500,
  reservoirRefreshInterval: 15 * 60 * 1000,
  reservoirRefreshAmount: 1500,
  trackDoneStatus: true,
});
const fetchFromTwitter = twitter.wrap(fetchFromCache);

const TWEET_FIELDS = [
  'created_at',
  'entities',
  'author_id',
  'public_metrics',
  'referenced_tweets',
];
const EXPANSIONS = [
  'referenced_tweets.id',
  'referenced_tweets.id.author_id',
  'entities.mentions.username',
];

export async function getTweets(
  id,
  start,
  end,
  lastTweetId = '',
  token = '',
  tweets = []
) {
  const msg =
    `Fetching tweets (${start.toDateString()}–${end.toDateString()}) ` +
    `${token ? `(${token}) ` : ''}by influencer (${id})...`;
  log.debug(msg);
  const url =
    `https://api.twitter.com/2/users/${id}/tweets?` +
    `tweet.fields=${TWEET_FIELDS.join()}&expansions=${EXPANSIONS.join()}&` +
    `start_time=${start.toISOString()}&end_time=${end.toISOString()}&` +
    `max_results=100${token ? `&pagination_token=${token}` : ''}` +
    `${lastTweetId ? `&since_id=${lastTweetId}` : ''}`;
  const headers = { authorization: `Bearer ${process.env.TWITTER_TOKEN}` };
  const res = await fetchFromTwitter(url, { headers });
  const data = await res.json();
  if (data.errors && data.title && data.detail && data.type)
    log.error(`${data.title}: ${data.detail} (${data.type})`);
  log.debug(`Fetched ${data.meta?.result_count} tweets by influencer (${id}).`);
  tweets.push(data);
  if (!data.meta?.next_token) return tweets;
  return getTweets(id, start, end, lastTweetId, data.meta.next_token, tweets);
}

export async function getInfluencers(c, pg = 0) {
  log.debug(`Fetching influencers (${pg}) for ${c.name} (${c.id})...`);
  const url =
    `https://api.borg.id/influence/clusters/${c.name}/influencers?` +
    `page=${pg}&sort_by=score&sort_direction=desc&influence_type=all`;
  const headers = { authorization: `Token ${process.env.HIVE_TOKEN}` };
  return (await fetchFromCache(url, { headers })).json();
}
