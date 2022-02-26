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

declare const ENV: 'development' | 'production' | 'test';
export const log = new Logger(
  ENV === 'development' ? LogLevel.Debug : LogLevel.Info
);
