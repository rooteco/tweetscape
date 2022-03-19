import { parse } from 'accept-language-parser';

export function lang(request: Request): string {
  const langs = parse(request.headers.get('Accept-Language') ?? '');
  return langs.length
    ? `${langs[0].code}${langs[0].region ? `-${langs[0].region}` : ''}`
    : 'en-US';
}

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

export const log = new Logger(LogLevel.Debug);

export function caps(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}
