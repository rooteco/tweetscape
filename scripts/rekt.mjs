import fs from 'fs/promises';

import { TwitterApi, TwitterV2IncludesHelper } from 'twitter-api-v2';
import fetch from 'node-fetch';
import prisma from '@prisma/client';
import Bottleneck from 'bottleneck';

import { TWEET_EXPANSIONS, TWEET_FIELDS, USER_FIELDS } from './shared.mjs';
import { log } from './utils.mjs';

const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

const db = new prisma.PrismaClient();
const api = new TwitterApi(process.env.TWITTER_TOKEN);
const limiter = new Bottleneck({
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

function toList(l) {
  return {
    id: l.id,
    owner_id: l.owner_id,
    name: l.name,
    description: l.description,
    private: l.private,
    follower_count: l.follower_count,
    member_count: l.member_count,
    created_at: new Date(l.created_at),
  };
}

function toInfluencer(u) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    verified: u.verified ?? null,
    description: u.description ?? null,
    profile_image_url: u.profile_image_url ?? null,
    followers_count: u.public_metrics?.followers_count ?? null,
    following_count: u.public_metrics?.following_count ?? null,
    tweets_count: u.public_metrics?.tweet_count ?? null,
    created_at: u.created_at ? new Date(u.created_at) : null,
    updated_at: new Date(),
  };
}

function toAnnotation(a, t) {
  return {
    tweet_id: t.id,
    normalized_text: a.normalized_text,
    probability: a.probability,
    type: a.type,
    start: a.start,
    end: a.end,
  };
}

function toTag(h, t, type) {
  return {
    type,
    tweet_id: t.id,
    tag: h.tag,
    start: h.start,
    end: h.end,
  };
}

function toRef(r, t) {
  return {
    referenced_tweet_id: r.id,
    referencer_tweet_id: t.id,
    type: r.type,
  };
}

function toTweet(tweet) {
  return {
    id: tweet.id,
    author_id: tweet.author_id,
    text: tweet.text,
    retweet_count: tweet.public_metrics?.retweet_count,
    reply_count: tweet.public_metrics?.reply_count,
    like_count: tweet.public_metrics?.like_count,
    quote_count: tweet.public_metrics?.quote_count,
    created_at: new Date(tweet.created_at),
  };
}

function toLink(u) {
  return {
    url: u.expanded_url,
    display_url: u.display_url,
    status: u.status ? Number(u.status) : null,
    title: u.title ?? null,
    description: u.description ?? null,
    unwound_url: u.unwound_url,
  };
}

function toURL(u, t) {
  return {
    link_url: u.expanded_url,
    tweet_id: t.id,
    start: u.start,
    end: u.end,
  };
}

function toImages(u) {
  return (u.images ?? []).map((i) => ({
    link_url: u.expanded_url,
    url: i.url,
    width: i.width,
    height: i.height,
  }));
}

function tweetToCreateQueue(t, authors, queue) {
  queue.tweets.push(toTweet(t));
  t.entities?.mentions?.forEach((m) => {
    const mid = authors.find((u) => u.username === m.username)?.id;
    if (mid)
      queue.mentions.push({
        tweet_id: t.id,
        influencer_id: mid,
        start: m.start,
        end: m.end,
      });
  });
  t.entities?.annotations?.forEach((a) =>
    queue.annotations.push(toAnnotation(a, t))
  );
  t.entities?.hashtags?.forEach((h) => queue.tags.push(toTag(h, t, 'hashtag')));
  t.entities?.cashtags?.forEach((c) => queue.tags.push(toTag(c, t, 'cashtag')));
  t.referenced_tweets?.forEach((r) => {
    // Address edge-case where the referenced tweet may be
    // inaccessible to us (e.g. private account) or deleted.
    if (queue.tweets.some((tw) => tw.id === r.id)) queue.refs.push(toRef(r, t));
  });
  t.entities?.urls?.forEach((u) => {
    queue.links.push(toLink(u));
    queue.urls.push(toURL(u, t));
    toImages(u).forEach((i) => queue.images.push(i));
  });
}

function toCreateQueue(
  res,
  queue = {
    influencers: [],
    list_members: [],
    tweets: [],
    mentions: [],
    annotations: [],
    tags: [],
    refs: [],
    links: [],
    images: [],
    urls: [],
  },
  listId
) {
  const includes = new TwitterV2IncludesHelper(res);
  const authors = includes.users.map(toInfluencer);
  authors.forEach((i) => queue.influencers.push(i));
  includes.tweets.forEach((t) => tweetToCreateQueue(t, authors, queue));
  res.tweets.forEach((t) => {
    if (listId)
      queue.list_members.push({
        influencer_id: t.author_id,
        list_id: listId,
      });
    tweetToCreateQueue(t, authors, queue);
  });
  return queue;
}

async function executeCreateQueue(queue) {
  log.info(`Creating ${queue.influencers.length} tweet authors...`);
  log.info(`Creating ${queue.list_members.length} list members...`);
  log.info(`Creating ${queue.tweets.length} tweets...`);
  log.info(`Creating ${queue.mentions.length} mentions...`);
  log.info(`Creating ${queue.tags.length} hashtags and cashtags...`);
  log.info(`Creating ${queue.refs.length} tweet refs...`);
  log.info(`Creating ${queue.links.length} links...`);
  log.info(`Creating ${queue.images.length} link images...`);
  log.info(`Creating ${queue.urls.length} tweet urls...`);
  const skipDuplicates = true;
  await db.$transaction([
    db.influencers.createMany({ data: queue.influencers, skipDuplicates }),
    db.list_members.createMany({ data: queue.list_members, skipDuplicates }),
    db.tweets.createMany({ data: queue.tweets, skipDuplicates }),
    db.mentions.createMany({ data: queue.mentions, skipDuplicates }),
    db.annotations.createMany({ data: queue.annotations, skipDuplicates }),
    db.tags.createMany({ data: queue.tags, skipDuplicates }),
    db.refs.createMany({ data: queue.refs, skipDuplicates }),
    db.links.createMany({ data: queue.links, skipDuplicates }),
    db.images.createMany({ data: queue.images, skipDuplicates }),
    db.urls.createMany({ data: queue.urls, skipDuplicates }),
  ]);
}

async function importRektScores(n = 1000) {
  log.info(`Fetching ${n} rekt scores...`);
  const res = await fetch(`https://feed.rekt.news/api/v1/parlor/crypto/0/${n}`);
  const json = await res.json();
  log.info(`Fetching ${json.length} rekt influencers...`);
  const splits = [];
  while (json.length) splits.push(json.splice(0, 100));
  const influencersToCreate = [];
  const scoresToCreate = [];
  await Promise.all(
    splits.map(async (scores) => {
      const users = await api.v2.usersByUsernames(
        scores.map((r) => r.screen_name),
        {
          'user.fields': USER_FIELDS,
          'tweet.fields': TWEET_FIELDS,
          'expansions': ['pinned_tweet_id'],
        }
      );
      log.trace(`Fetched influencers: ${JSON.stringify(users, null, 2)}`);
      log.info(`Parsing ${users.data.length} users...`);
      const influencers = users.data.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        verified: u.verified ?? null,
        description: u.description ?? null,
        profile_image_url: u.profile_image_url ?? null,
        followers_count: u.public_metrics?.followers_count ?? null,
        following_count: u.public_metrics?.following_count ?? null,
        tweets_count: u.public_metrics?.tweet_count ?? null,
        created_at: u.created_at ? new Date(u.created_at) : null,
        updated_at: new Date(),
      }));
      influencers.forEach((i) => influencersToCreate.push(i));
      log.info(`Parsing ${scores.length} rekt scores...`);
      const rekt = scores.map((d) => ({
        id: d.id,
        influencer_id: influencers.find((i) => i.username === d.screen_name)
          ?.id,
        username: d.screen_name,
        name: d.name,
        profile_image_url: d.profile_picture,
        points: d.points_v2,
        rank: d.rank,
        followers_count: d.followers,
        followers_in_people_count: d.followers_in_people_count,
      }));
      const missing = rekt.filter((r) => !r.influencer_id);
      log.warn(
        `Missing influencer data for: ${JSON.stringify(missing, null, 2)}`
      );
      rekt
        .filter((r) => r.influencer_id)
        .forEach((r) => scoresToCreate.push(r));
    })
  );
  log.info(`Inserting ${scoresToCreate.length} rekt scores and influencers...`);
  const skipDuplicates = true;
  await db.$transaction([
    db.influencers.createMany({ data: influencersToCreate, skipDuplicates }),
    db.rekt.createMany({ data: scoresToCreate, skipDuplicates }),
  ]);
}

async function importRektTweets(n = 1000) {
  log.info(`Fetching ${n} rekt scores from database...`);
  const scores = await db.rekt.findMany({ take: n });
  log.info(`Fetching recent tweets from ${scores.length} rekt influencers...`);
  const queue = {
    influencers: [],
    list_members: [],
    tweets: [],
    mentions: [],
    annotations: [],
    tags: [],
    refs: [],
    links: [],
    images: [],
    urls: [],
  };
  await Promise.all(
    scores.map(async (s) => {
      log.debug(`Scheduling fetch for user (${s.influencer_id}) timeline...`);
      const job = { expiration: 5000, id: s.influencer_id };
      const res = await limiter.schedule(job, () => {
        log.debug(`Fetching user (${s.influencer_id}) timeline...`);
        return api.v2.userTimeline(s.influencer_id, {
          'tweet.fields': TWEET_FIELDS,
          'user.fields': USER_FIELDS,
          'expansions': TWEET_EXPANSIONS,
          'start_time': start.toISOString(),
          'end_time': end.toISOString(),
          'max_results': 100,
        });
      });
      toCreateQueue(res, queue);
    })
  );
  await fs.writeFile('rekt.json', JSON.stringify(queue, null, 2));
  await executeCreateQueue(queue);
}

async function executeStoredQueue() {
  const queue = await fs.readFile('rekt.json');
  await executeCreateQueue(JSON.parse(queue.toString()));
}

async function importRekt() {
  const intervalId = setInterval(() => {
    const c = limiter.counts();
    const msg =
      `Twitter API calls: ${c.RECEIVED} received, ${c.QUEUED} queued, ` +
      `${c.RUNNING} running, ${c.EXECUTING} executing, ${c.DONE} done.`;
    log.debug(msg);
  }, 2500);
  await importRektScores();
  await importRektTweets();
  clearInterval(intervalId);
}

(async () => {
  await importRekt();
})();
