import JSONBig from 'json-bigint';
import type { Session } from 'remix';
import { autoLink } from 'twitter-text';
import invariant from 'tiny-invariant';
import { parse as parseLangHeader } from 'accept-language-parser';
import { redirect } from 'remix';

import { commitSession, getSession } from '~/session.server';

export { nanoid } from 'nanoid';

const DEFAULT_REDIRECT = '/rekt/crypto/articles';

export const { parse, stringify } = JSONBig({ useNativeBigInt: true });

export function html(text: string): string {
  return autoLink(text, {
    usernameIncludeSymbol: true,
    linkAttributeBlock(entity, attrs) {
      attrs.target = '_blank';
      attrs.rel = 'noopener noreferrer';
      attrs.class = 'hover:underline dark:text-sky-400 text-sky-500';
    },
  });
}

export function getUserIdFromSession(session: Session) {
  const userId = session.get('uid') as string | undefined;
  const uid = userId ? BigInt(userId) : undefined;
  return uid;
}

export async function getLoggedInSession(req: Request) {
  const session = await getSession(req.headers.get('Cookie'));
  const uid = getUserIdFromSession(session);
  invariant(uid, 'expected session uid');
  return { session, uid };
}

export function getBaseURL(req: Request) {
  const url = new URL(req.url);
  // Fly flattens all requests to HTTP in its private network.
  // @see {@link https://fly.io/blog/always-be-connecting-with-https}
  const proto = req.headers.get('X-Forwarded-Proto');
  const protocol = proto ? `${proto}:` : url.protocol;
  return `${protocol}//${url.host}`;
}

export async function redirectToLastVisited(
  req: Request,
  session: Session,
  reset = true
) {
  const url = getBaseURL(req);
  const dest = new URL(`${url}${session.get('href') ?? DEFAULT_REDIRECT}`);
  if (reset) dest.searchParams.delete('l'); // Reset infinite scroller limit.
  const headers = { 'Set-Cookie': await commitSession(session) };
  return redirect(dest.href, { headers });
}

export function lang(request: Request): string {
  const langs = parseLangHeader(request.headers.get('Accept-Language') ?? '');
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
