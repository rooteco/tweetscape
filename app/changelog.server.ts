import fs from 'fs/promises';
import { resolve } from 'path';

import type { LoaderFunction } from 'remix';
import fm from 'front-matter';
import { marked } from 'marked';
import superjson from 'superjson';

import { json } from '~/json';
import { log } from '~/utils.server';

const renderer = new marked.Renderer();
renderer.link = function link(...args) {
  const link = marked.Renderer.prototype.link.apply(this, args);
  return link.replace(`<a`, `<a target='_blank' rel='noopener noreferrer'`);
};
marked.setOptions({ renderer });

export type LoaderData = { date: Date; id: string; html: string }[];

export const loader: LoaderFunction = async () => {
  const filenames = await fs.readdir('changelog');
  const resolved = filenames.map((f) => resolve('changelog', f));
  log.info(`Reading files... ${superjson.stringify(resolved)}`);
  const files = await Promise.all(resolved.map((f) => fs.readFile(f)));
  log.info(`Parsing markdown for ${files.length} files...`);
  const posts = files
    .map((f) => fm<{ date: string }>(f.toString()))
    .map((d, idx) => ({
      date: new Date(d.attributes.date),
      html: marked.parse(d.body),
      id: filenames[idx],
    }));
  return json<LoaderData>(posts);
};
