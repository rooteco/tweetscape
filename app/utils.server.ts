export { decode } from 'html-entities';

export enum LogLevel {
  Trace,
  Debug,
  Info,
  Warn,
  Error,
}

export class Logger {
  public constructor(private level: LogLevel) {}

  public trace(msg: string): void {
    if (this.level <= LogLevel.Trace) console.log(`[trace] ${msg}`);
  }

  public debug(msg: string): void {
    if (this.level <= LogLevel.Debug) console.log(`[debug] ${msg}`);
  }

  public info(msg: string): void {
    if (this.level <= LogLevel.Info) console.info(`[info] ${msg}`);
  }

  public warn(msg: string): void {
    if (this.level <= LogLevel.Warn) console.warn(`[warn] ${msg}`);
  }

  public error(msg: string): void {
    if (this.level <= LogLevel.Error) console.error(`[error] ${msg}`);
  }
}

export const log = new Logger(
  ENV === 'development' ? LogLevel.Debug : LogLevel.Info
);

export function caps(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

export async function fetchFromCache(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const cacheKey = new Request(new URL(url).toString(), init);
  const cache = caches.default;
  let res = await cache.match(cacheKey);
  if (!res) {
    log.trace(`Cache miss for: ${url}`);
    res = await fetch(cacheKey);
    res = new Response(res.body, res);
    res.headers.append('Cache-Control', `s-maxage=${24 * 60 * 60}`);
    await cache.put(cacheKey, res.clone());
  } else {
    log.trace(`Cache hit for: ${url}`);
  }
  return res;
}
