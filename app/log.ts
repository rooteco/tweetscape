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
    if (this.level <= LogLevel.Trace) console.log(msg);
  }

  public debug(msg: string): void {
    if (this.level <= LogLevel.Debug) console.log(msg);
  }

  public info(msg: string): void {
    if (this.level <= LogLevel.Info) console.info(msg);
  }

  public warn(msg: string): void {
    if (this.level <= LogLevel.Warn) console.warn(msg);
  }

  public error(msg: string): void {
    if (this.level <= LogLevel.Error) console.error(msg);
  }
}

declare const ENV: 'development' | 'production' | 'test';
export default new Logger(
  ENV === 'development' ? LogLevel.Debug : LogLevel.Info
);
