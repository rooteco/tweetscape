---
date: March 25, 2022
---

![Supercharged](/ss/supercharged.png)

## Open source Twitter

Twitter began as an open protocol—a [new form of messaging](http://paulgraham.com/twitter.html) where you don't specify message recipients.
It was incredible!
But that utopian vision for online conversation was overshadowed by money from it's inception.

> Twitter started as a corporation.
> It's had corporate incentives from day 1.
> —[@jack](https://twitter.com/jack/status/1473361222825299974) (Co-Founder and Ex-CEO Twitter)

Twitter could have become the backbone for online chatter, allowing its users to freely exchange messages with people on other social media platforms instead of locking them into conversations among themselves.

> It had the opportunity to become a protocol.
> The code was written, it worked, it was all based on open protocols.
> @Jack knows this, and it makes me sad that he still doesn't acknowledge it.
> It never shipped for the reasons Jack states, but Fred supported it at the time.
> —[@blaine](https://twitter.com/blaine/status/1473401448054411266) (Co-Founder Twitter)

Instead, the platform evolved to satisfy corporate interests: Twitter optimizes Twitter to make money, while you—the user—become [the product](https://www.netflix.com/title/81254224) and suffer.

Think about it.

Features that should be commonplace don't exist.
You have very little control over your feed—there are only two sorting options: "Top" and "Latest".
There are no filters for your feed, no offline support, no keyboard shortcuts, no [multi-quoting](https://malcolmocean.com/2021/11/twitter-multi-quote-tweet-design/), no multi-retweeting, no nested sorting whatsoever (e.g. for a tweet's replies or quote tweets or likes), and—most importantly—no transparency.
No one knows how Twitter's "algorithm" works behind-the-scenes.

> Twitter algorithm should be open source
> —[@elonmusk](https://twitter.com/elonmusk/status/1507041396242407424) (CEO Tesla and SpaceX but you knew that 🙃)

We're here to change that.
We believe that we can create a more transparent, user-centric Twitter—one that's focused not on money, but on **you.**
A version of Twitter that is optimized to serve **you**, not a corporation or its investors.

We'll empower you in ways Twitter never will:

- You control what shows up in your feed. You have direct access to every filter and sort supported by [Postgres](https://www.postgresql.org).
- You can explore social context from around the web right alongside your tweets. We'll show you conversations from IndieHackers, HackerNews, ProductHunt, or whatever other source you want to integrate (we love [PRs](https://github.com/rooteco/tweetscape/pulls)).
- You won't be tracked. We only use necessary cookies and strip UTM parameters from every link.
- Offline mode.
- Customize everything. You can change the font, colors, density, scale, line height, and more.
- Program keyboard shortcuts for everything. We set you up with some sensible defaults but you're more than welcome to re-map everything. `H`-`J`-`K`-`L` to your heart's content!
- No spinners or skeleton screens—just the content you want, instantly. [Superhuman](https://superhuman.com) has a 100ms rule. We have a 50ms rule.
- JavaScript—optional. We run on [Remix](https://remix.run), so you can enjoy a fully functional Twitter experience without **a byte** of JS.

**Tweetscape will be the must-have tool for "power users" of Twitter.**

But the keyword there is **will**.
We still have lots of work to do, which is why this weekly changelog exists.

This week, we focused on cloning Twitter's core functionality while improving it wherever possible.
For example, in our Postgres [database schema](https://github.com/rooteco/tweetscape/blob/develop/db/setup.pgsql), references between tweets are represented by a single many-to-many relation table:

![Refs many-to-many relation table definition](/ss/refs-table-definition.png)

This relational model enables you to reference any number of tweets in a single tweet.
You could, for example, quote three different tweets on the same topic to [properly compare and contrast their related opinions](https://malcolmocean.com/2021/11/twitter-multi-quote-tweet-design/).

**And this is just the beginning.**
We're still [waiting to hear from you](https://discord.gg/3KYQBJwRSS)—our community—to decide what to build next.

## Fixes & Improvements

- Image `width` and `height` properties are now explicitly specified to increase Lighthouse page performance.
- Your theme is now persisted in a session cookie instead of `localStorage`, enabling no-JS theme support.
- Clicking on a tweet now opens its replies in a new column, letting you explore deeply nested content while maintaining the context for that content (i.e. the "how you got there" is persisted in the URL pathname).
- Sync errors (e.g. after too many requests) are now handled gracefully and do not result in a client-side app crash.
- The [Inter](https://rsms.me/inter) web font is now self-hosted, preloaded, and marked as `optional` to improve speed and reduce FOUT.
- Mobile viewports are now supported.
- The feed is now infinitely scrollable and practically [impossible to outrun](https://twitter.com/niicholaschiang/status/1506379774649724928).
- You can now like and retweet tweets without leaving Tweetscape.
- Retweets primarily show the retweeted tweet content instead of the often truncated "RT @elonmusk:" text.
- Hovering over a tweet's author shows a profile pop-up with their description, public metrics, and follow button.
- Quoted tweets are now shown inline with the tweet that quoted them. This behaves exactly like Twitter **except** that it also supports a potentially infinite number of quoted tweets while Twitter only [supports one](https://malcolmocean.com/2021/11/twitter-multi-quote-tweet-design).
- This beautiful changelog now exists.
- Error messages are now more human friendly and suggest you ask a question in [our Discord community](https://discord.gg/3KYQBJwRSS).
- Verified status badges are now synced with Twitter and appear next to verified users' names.
- Images are now optimized using `sharp` in [a custom Remix resource route](https://github.com/rooteco/tweetscape/blob/develop/app/img.server.ts) to improve page performance.
- Raw SQL is now properly escaped using `prisma.$queryRaw` to prevent malicious SQL injection attacks.
- To improve performance, [Redis](https://redis.io) is now being used in place of [Postgres](https://postgresql.org) to store user-specific Twitter API rate limits.
- You can now [login with Twitter](/oauth) to explore content from your own curated Twitter Lists inside Tweetscape.
