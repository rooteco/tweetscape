const { decode } = require('html-entities');
const { fetch } = require('@miniflare/core');

const LogLevel = {
  Trace: 0,
  Debug: 1,
  Info: 2,
  Warn: 3,
  Error: 4,
};

class Logger {
  level = LogLevel.Info;

  constructor(level) {
    this.level = level;
  }

  trace(msg) {
    if (this.level <= LogLevel.Trace) console.log(`[trace] ${msg}`);
  }

  debug(msg) {
    if (this.level <= LogLevel.Debug) console.log(`[debug] ${msg}`);
  }

  info(msg) {
    if (this.level <= LogLevel.Info) console.info(`[info] ${msg}`);
  }

  warn(msg) {
    if (this.level <= LogLevel.Warn) console.warn(`[warn] ${msg}`);
  }

  error(msg) {
    if (this.level <= LogLevel.Error) console.error(`[error] ${msg}`);
  }
}

const log = new Logger(LogLevel.Trace);
const fetchFromCache = (...args) => fetch(...args);

module.exports = { decode, fetchFromCache, log };
