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

Tweetscape is a full-stack React application built with [Remix](https://remix.run) and deployed on [Fly](https://fly.io).

## Contributing

### Project Structure

This repository is a [React](https://reactjs.org) app built in [Typescript](https://typescriptlang.org) with [Remix](https://remix.run), [TailwindCSS](https://tailwindcss), and [PostgreSQL](https://www.postgresql.org).
Both the Remix app and PostgreSQL database are deployed worldwide as edge-based, clustered applications on [Fly](https://fly.io):

```
.
├── app
│   ├── cookies.server.ts
│   ├── db.server.ts
│   ├── entry.client.tsx
│   ├── entry.server.tsx
│   ├── img.server.ts
│   ├── root.tsx
│   ├── routes
│   │   ├── $cluster.tsx
│   │   ├── img.$url.ts
│   │   └── index.tsx
│   ├── styles
│   │   └── app.css
│   └── utils.server.ts
├── db
│   ├── copy.pgsql
│   └── setup.pgsql
├── Dockerfile
├── fly.toml
├── LICENSE
├── package.json
├── postcss.config.js
├── public
│   ├── favicon.ico
│   ├── fonts
│   │   ├── sans.css
│   │   ├── sans.ttf
│   │   ├── sans.woff
│   │   ├── sans.woff2
│   │   ├── serif.css
│   │   └── serif-vietnamese.woff2
│   └── pics
│       ├── placeholder.png
│       └── vanessa.jpg
├── README.md
├── remix.config.js
├── remix.env.d.ts
├── scripts
│   ├── data.mjs
│   └── utils.mjs
├── styles
│   └── app.css
├── tailwind.config.js
├── tsconfig.json
├── wrangler.toml
└── yarn.lock

10 directories, 66 files
```

- The `app/` directory contains all of the front-end [Remix](https://remix.run) components, server-side business logic (files suffixed with `.server.ts` will only be included in the server-side bundle), and pages.
- The `public/` directory contains publicly visible assets (e.g. fonts, pictures, favicons, etc).
- The `scripts/` directory defines a set of Node.js scripts used to seed our PostgreSQL database with data from Twitter's and Hive's APIs.
- The `db/` directory contains `.pgsql` scripts that define our database schema. Use them with care (i.e. don't accidentally reset the production database).
- The `styles/` directory contains the entry point for the [TailwindCSS](https://tailwindcss.com) compiler (which outputs `app/styles/app.css` which you shouldn't ever edit manually).
- And, of course, the root directory contains a number of configuration files (for [ESLint](https://eslint.org), [Prettier](https://prettier.io), [Tailwind](https://tailwindcss.com), [Fly](https://fly.io), a [`Dockerfile`](https://docs.docker.com/engine/reference/builder) for [Fly deployments](https://fly.io/docs/getting-started/dockerfile), etc).

### Database Types

I could've used an ORM like [Prisma](https://www.prisma.io) to automatically generate Typescript type definitions and my PostgreSQL database schema at the same time, but I like being able to use the full power of both languages separately, so I've redefined my data types twice: once in SQL (`db/setup.pgsql`) and once in Typescript (`app/db.server.ts`).

The data structures that I chose and the property names that I chose come directly from [Twitter's API](https://developer.twitter.com/en/docs/twitter-api/data-dictionary/object-model/tweet) and [Hive's API](https://www.notion.so/API-Docs-69fe2f3d624843fcb0b44658b135161b).
I aimed to be as unopinionated as possible when storing their data; I stored everything that was returned in—what I think is—a perfectly normalized PostgreSQL schema.

It can be useful to install something like [Beekeeper Studio](https://www.beekeeperstudio.io/get) to open the PostgreSQL database in a visual spreadsheet-like form in order to better understand what each table actually contains and how they relate to one another.

### Development Environment

To setup the development environment for and to contribute to Tweetscape:

1. Follow [these instructions](https://github.com/nvm-sh/nvm#installing-and-updating) to install `nvm` (our suggested way to use Node.js) on your machine. Verify that `nvm` is installed by running:

```
$ command -v nvm
```

2. Run the following command to install Node.js v16.14.0 (the [current LTS](https://nodejs.org/en/about/releases)):

```
$ nvm i 16.14.0
```

3. (Optional) Run the following command to set Node.js v16.14.0 as your default Node.js version (useful if you have multiple Node.js versions installed and don't want to have to remember to switch to v16.14.0):

```
$ nvm alias default 16.14.0
```

4. Ensure that you have recent versions of Node.js and it's package manager `npm` by running:

```
$ node -v
16.14.0
$ npm -v
8.3.1
```

5. (Optional) Install the [Cypress system dependencies](https://bit.ly/2QHuAiG) if you plan on running our integration tests locally.

```
$ sudo apt-get install libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb
```

6. Clone and `cd` into this repository locally by running:

```
$ git clone https://github.com/nicholaschiang/tweetscape.git && cd tweetscape/
```

7. Follow [these instructions](https://yarnpkg.com/getting-started/install) to install `yarn` (our dependency manager for a number of reasons):

```
$ corepack enable
```

8. Then, install of our project's dependencies with the following command:

```
$ yarn
```

9. Copy over the `.env` file (which contains project secrets) from [this private repository](https://github.com/nicholaschiang/tweetscape-env):

```
$ cp tweetscape-env/.env* tweetscape/
```

10. [Install the `flyctl` CLI](https://fly.io/docs/getting-started/installing-flyctl), login to the CLI, and setup port forwarding so you can access the PostgreSQL database from your machine:

```
$ fly proxy 5432 -a tweetscape-db
```

11. (Optional) Install [Beekeeper Studio](https://www.beekeeperstudio.io/get) to be able to visually manipulate the PostgreSQL data.
    Or, you should be able to simply access the `psql` command interface directly:

```
$ psql postgres://tweetscape:<pwd-from-env-file>@localhost:5432/tweetscape
```

12. Finally, you should be able to start a fully-functioning development server:

```
$ yarn dev
```

### Commit Message Format

I have very precise rules over how Git commit messages must be formatted.
This format leads to **easier to read commit history**.
Please refer to the following documentation for more info:

- [Conventional Commit Messages](https://www.conventionalcommits.org/en/v1.0.0/)
- [Angular's Commit Message Format](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-format)
- [Udacity's Commit Message Style Guide](http://udacity.github.io/git-styleguide/)

#### Commit Message Header

Commit messages that do not adhere to the following commit style will not be merged into `develop`:

```
<type>(<scope>): <short summary>
  │       │             │
  │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │
  │       └─⫸ Commit Scope: The page, API route, or component modified.
  │
  └─⫸ Commit Type: ci|docs|feat|fix|perf|refactor|test|deps|chore
```

The `<type>` and `<summary>` fields are mandatory, the `(<scope>)` field is optional.

##### Type

Must be one of the following:

- **ci**: Changes to our CI configuration files and scripts.
- **docs**: Documentation only changes.
- **feat**: A new feature.
- **fix**: A bug fix.
- **perf**: A code change that improves performance.
- **refactor**: A code change that neither fixes a bug nor adds a feature.
- **test**: Adding missing tests or correcting existing tests.
- **deps**: A change in dependencies.
- **chore**: A code change in utility scripts, build configurations, etc.

##### Scope

The scope should refer to the page, API route, or component modified.
This can be flexible however (e.g. the scope for a `docs:` commit may be the `README`).

##### Summary

Use the summary field to provide a succinct description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes".
- Don't capitalize the first letter.
- No dot (.) at the end.
