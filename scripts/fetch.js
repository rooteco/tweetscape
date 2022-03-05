const path = require('path');

const { Pool } = require('pg');
const dotenv = require('dotenv');

const { log } = require('./utils');

// follow the next.js convention for loading `.env` files.
// @see {@link https://nextjs.org/docs/basic-features/environment-variables}
const env = process.env.NODE_ENV || 'development';
[
  path.resolve(__dirname, `../.env.${env}.local`),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, `../.env.${env}`),
  path.resolve(__dirname, '../.env'),
].forEach((dotfile) => {
  log.info(`Loaded env from ${dotfile}`);
  dotenv.config({ path: dotfile });
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

if (require.main === module) {
  (async () => {
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)
    const db = await pool.connect();
    try {
      const influencers = await db.query('SELECT * FROM influencers');
      log.debug(`Influencers: ${JSON.stringify(influencers, null, 2)}`);
      const tweets = await db.query('SELECT * FROM tweets');
      log.debug(`Tweets: ${JSON.stringify(tweets, null, 2)}`);
      const tweetRefs = await db.query('select * from tweet_refs');
      log.debug(`Tweet Refs: ${JSON.stringify(tweetRefs, null, 2)}`);
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    } finally {
      db.release();
    }
  })().catch((e) => log.error(e.stack));
}
