import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import Bottleneck from 'bottleneck';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import pg from 'pg';

import { log } from './utils.mjs';

// follow the next.js convention for loading `.env` files.
// @see {@link https://nextjs.org/docs/basic-features/environment-variables}
const dir = dirname(fileURLToPath(import.meta.url));
const env = process.env.NODE_ENV ?? 'development';
[
  resolve(dir, `../.env.${env}.local`),
  resolve(dir, '../.env.local'),
  resolve(dir, `../.env.${env}`),
  resolve(dir, '../.env'),
].forEach((dotfile) => {
  log.info(`Loaded env from ${dotfile}`);
  dotenv.config({ path: dotfile });
});

// twitter api rate limit: max 1500 timeline API requests per 15 mins per app.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const limiter = new Bottleneck({
  reservoir: 1500,
  reservoirRefreshInterval: 15 * 60 * 1000,
  reservoirRefreshAmount: 1500,
  trackDoneStatus: true,
  maxConcurrent: 10,
  minTime: 250,
});
limiter.on('error', (e) => {
  log.error(`Limiter error: ${e.stack}`);
});
limiter.on('failed', (e, job) => {
  log.warn(`Job (${job.options.id}) failed: ${e.stack}`);
  if (job.retryCount < 5) {
    const wait = 500 * (job.retryCount + 1);
    log.debug(`Retrying job (${job.options.id}) in ${wait}ms...`);
    return wait;
  }
});
limiter.on('retry', (e, job) => {
  log.debug(`Now retrying job (${job.options.id})...`);
});

export const USER_FIELDS = [
  'id',
  'name',
  'username',
  'verified',
  'description',
  'profile_image_url',
  'public_metrics',
  'created_at',
];
export const TWEET_FIELDS = [
  'created_at',
  'entities',
  'author_id',
  'public_metrics',
  'referenced_tweets',
];
export const TWEET_EXPANSIONS = [
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
    `${
      token ? `(${token}) ` : ''
    }by influencer (https://twitter.com/i/user/${id})...`;
  log.debug(msg);
  const url =
    `https://api.twitter.com/2/users/${id}/tweets?` +
    `tweet.fields=${TWEET_FIELDS.join()}&` +
    `expansions=${TWEET_EXPANSIONS.join()}&user.fields=${USER_FIELDS.join()}&` +
    `start_time=${start.toISOString()}&end_time=${end.toISOString()}&` +
    `max_results=100${token ? `&pagination_token=${token}` : ''}` +
    `${lastTweetId ? `&since_id=${lastTweetId}` : ''}`;
  const headers = { authorization: `Bearer ${process.env.TWITTER_TOKEN}` };
  const job = { expiration: 5000 };
  const res = await limiter.schedule(job, fetch, url, { headers });
  const data = await res.json();
  if (data.errors && data.errors[0])
    log.error(
      `Error fetching tweets by influencer (https://twitter.com/i/user/${id}): ${data.errors[0].title}: ${data.errors[0].detail} (${data.errors[0].type})`
    );
  if (data.meta?.result_count === undefined)
    log.debug(
      `Fetched no tweets by influencer (https://twitter.com/i/user/${id}): ${JSON.stringify(
        data,
        null,
        2
      )}`
    );
  log.debug(
    `Fetched ${data.meta?.result_count} tweets by influencer (https://twitter.com/i/user/${id}).`
  );
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
  const data = await (await fetch(url, { headers })).json();
  if (data.influencers && data.total) return data;
  log.warn(`Fetched influencers: ${JSON.stringify(data, null, 2)}`);
  return { influencers: [], total: 0 };
}
