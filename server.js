import { createEventHandler } from '@remix-run/cloudflare-workers';
import * as build from '@remix-run/dev/server-build';

const handler = createEventHandler({ build, mode: process.env.NODE_ENV });

addEventListener('fetch', handler);
