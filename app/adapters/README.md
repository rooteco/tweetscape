# `adapters`

A set of adapters for interacting with various centralized social media platform APIs and databases.

Each adapter provides an interface for:

- Getting data from their source (i.e. a database or social media platform API) using a query language that is standardized across all adapters;
- Parsing that data into an `ActivityPub` [collection](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-collection);
- Parsing an `ActivityPub` collection to their source's native data types;
- Pushing those parsed native data types back to the source (two-way sync).

Each adapter file, in addition to exporting functions for each of those aforementioned requirements, also (optionally) contains type definitions for their platform's native data types.
Most of the time, however, manually defining those native data types isn't necessary, as libraries like Prisma (for native Postgres types) and SDKs like `twitter-api-v2` (for Twitter API v2 types) already define those types.
