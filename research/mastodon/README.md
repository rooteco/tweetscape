# `mastodon`

[Mastodon](https://joinmastodon.org) is an [open-source](https://github.com/mastodon/mastodon) client for the [`ActivityPub`](https://activitypub.rocks) decentralized social protocol.
Mastodon is the most widely adopted social platform whose implementation uses the W3C's `ActivityPub` and `ActivityStreams` 2.0 "recommendations".
Their implementation is built on [Ruby on Rails](https://rubyonrails.org) (which manage their Postgres database and API layers) and [React](https://reactjs.org) (for the front-end).

Here, I investigate:

- [ ] How Mastodon [has extended](https://github.com/mastodon/mastodon/blob/main/FEDERATION.md) the [`ActivityStreams` core functionality](https://www.w3.org/TR/activitystreams-core/#extensibility) for their app.
- [x] How Mastodon converts the `ActivityStreams` JSON-LD format into performant Postgres tables and how it then queries those tables to create a Twitter-like end-user experience.

> From my very limited knowledge of Ruby on Rails and after digging around the Mastodon repository, I'm almost 100% sure that Rails manages the Postgres schema automatically (e.g. you define a Ruby class or "object" type and then Rails will create the corresponding Postgres table).
> Because I don't know Ruby or how to use Rails, I simply followed the [setup instructions](https://docs.joinmastodon.org/dev/setup) to create a local copy of their production database schema.
> Then, I `pg_dump`-ed that schema into the `schema.sql` file found here.
> You should be able to just `psql -i schema.sql`, open the resulting database in something like Beekeeper Studio, and then play around with the Mastodon `ActivityStreams` 2.0 Postgres schema.
