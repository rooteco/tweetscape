<h1 align='center'>Tweetscape: The Supercharged Twitter Feed</h1>

Tweetscape surfaces the best "insider" information—and the conversation around it—as shared by the smartest people in a given topic (e.g. ETH, BTC, NFTs, or Tesla) on Twitter.
Tweetscape curates article links shared by the most reputable accounts on Twitter for a number of topics (e.g. ETH, BTC, NFTs, or Tesla).

## How it works

### High level

Tweetscape uses [`hive.one`](https://hive.one) to determine who are the most reputable (i.e. the "smartest") people in a specific field (e.g. who are the experts in ETH, BTC, NFTs, or Tesla) on Twitter; [`hive.one`](https://hive.one) acts as [a reputation layer for the internet](https://borgcollective.notion.site/About-15b9db2c1f414cf998c5abc58b715176), determining who you can trust through [a weighted graph of who follows who](https://borgcollective.notion.site/FAQ-5434e4695d60456cb481acb98bb88b18) (e.g. a reputable user following another user raises that other user's "attention score" by more than if some random Joe follows them).

Tweetscape then uses Twitter's API and that list of "smartest" people to get links to the articles most abundantly (and most recently) shared by the "smartest" people on Twitter for a given topic (e.g. ETH, BTC, NFTs, or Tesla). Tweetscape also shows you the conversation around each link; you get to see the best links *and* what the "smartest" people are saying about them.

### Low level

Tweetscape is a full-stack React application built with Remix and React Router.
