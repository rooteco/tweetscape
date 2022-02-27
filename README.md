<h1 align='center'>Tweetscape: The Supercharged Twitter Feed</h1>

Tweetscape surfaces the best "insider" information—and the conversation around it—as shared by the smartest people in a given topic (e.g. ETH, BTC, NFTs, or Tesla) on Twitter.
Tweetscape curates article links shared by the most reputable accounts on Twitter for a number of topics (e.g. ETH, BTC, NFTs, or Tesla).
Learn more [here](https://www.roote.co/tweetscape).

## How it works

### High level

Tweetscape uses [`hive.one`](https://hive.one) to determine who are the most reputable (i.e. the "smartest") people in a specific field (e.g. who are the experts in ETH, BTC, NFTs, or Tesla) on Twitter; [`hive.one`](https://hive.one) acts as [a reputation layer for the internet](https://borgcollective.notion.site/About-15b9db2c1f414cf998c5abc58b715176), determining who you can trust through [a weighted graph of who follows who](https://borgcollective.notion.site/FAQ-5434e4695d60456cb481acb98bb88b18) (e.g. a reputable user following another user raises that other user's "attention score" by more than if some random Joe follows them).

Tweetscape then uses Twitter's API and that list of "smartest" people to get links to the articles most abundantly (and most recently) shared by the "smartest" people on Twitter for a given topic (e.g. ETH, BTC, NFTs, or Tesla).
It also shows you the conversation around each link; you get to see the best links _and_ what the smartest people are saying about them.

### Low level

Tweetscape is a full-stack React application built with [Remix](https://remix.run) and React Router.

Every 24 hours, when a user visits [`tweetscape.co`](https://tweetscape.co), we:

1. Fetch the top influencers from [`hive.one`](https://docs.hive.one/core-resources/top-influencers) (using an [`ETag`](https://docs.hive.one/using-etags) to de-dupe requests):

`GET https://api.hive.one/v1/influencers/top`

2. Fetch the top 50 links that were most abundantly (and most recently) shared by those influencers on Twitter:
3. Server-side render that list of links (and their corresponding conversations) to send to the client—you.

The aforementioned fetched data and generated HTML are both cached at the edge with [Redis](https://redis.com) and [SWR](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate), respectively.
We actually run the application at the edge too with [Fly.io](https://fly.io/docs/reference/regions).
One of our goals with Tweetscape is to save you time—primarily by rescuing you from Twitter's [arbitrary wormhole of a feed](https://www.roote.co/tweetscape/vision)—but also by optimizing our app to run **even faster than Twitter**, saving you milliseconds that you can then spend learning about [the wisdom age](https://www.roote.co/wisdom-age) 😎.
