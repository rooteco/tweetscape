---
date: April 11, 2022
author: niicholaschiang
---

![The Sub-50ms Rule](/ss/perf.png)

## Performance

> Superhuman has a 100ms rule. We have a 50ms rule.

This week, while at the beach (it was my spring break 😊), I focused on restoring Tweetscape's sub-50ms load times.

After chatting with **@ryanflorence** (the creator of [Remix](https://remix.run)) on the cause of our slow client-side renders, I realized I was doing a significant chunk of post-processing client-side that could (and should) be done server-side.
Thus, I moved as much code as humanly possible from the client to our server-side Remix `loader` and `action` functions.
Now, I perform all post-processing and data formatting server-side (e.g. `moment.js` never makes it into the client-side bundle) and then send that formatted data to the client, only sending fields that will actually be rendered in our UI.

Earlier in the week, I also polished up our PostgreSQL queries (using `pg-promise` in place of `prisma.$queryRaw` due to [a](https://github.com/prisma/prisma/issues/8121) [number](https://github.com/prisma/prisma/issues/12551) [of](https://github.com/prisma/prisma/issues/12367) [issues](https://github.com/prisma/prisma/issues/7395) related to the struggles with `bigint` + Postgres + Typescript that are [mostly resolved](https://github.com/vitaly-t/pg-promise/issues/754#issuecomment-1087125815) with `pg-promise`) to preserve large integer precision while taking advantage of the increased Postgres `join` speeds that result from moving our primary and foreign keys to be of type `int8` instead of the significantly slower `text` type.

## Fixes & Improvements

- Tweets are now contained in a virtualized list (thanks to `react-window`) that is, of course, infinitely scrollable.
- Reduced `bigint` parsing overhead by removing `superjson` and `json-bigint` from the client-side bundle and instead converting those `bigints` to `strings` server-side prior to sending them to the client.
- Specified the latest Node.js LTS as our platform of choice in a new `.nvmrc` configuration file (HT **@sergiodxa**).
- Reduced the amount of data being sent client-side to only include the fields actually visible to the end user.
