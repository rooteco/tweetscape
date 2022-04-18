import fs from 'fs/promises';
import { resolve } from 'path';

import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { bundleMDX } from 'mdx-bundler';

import { log } from '~/utils.server';

type Meta = { date: string; author: string };
export type LoaderData = { frontmatter: Meta; code: string }[];

export const loader: LoaderFunction = async () => {
  const cwd = resolve(__dirname, '../changelog');
  const filenames = await fs.readdir(cwd);
  const files = filenames.map((f) => resolve(cwd, f));
  log.info(`Parsing markdown for ${files.length} files...`);
  const posts = await Promise.all(
    files.map((file) => bundleMDX<Meta>({ file, cwd }))
  );
  return json<LoaderData>(posts);
};
