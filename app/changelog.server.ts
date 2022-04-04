import fs from 'fs/promises';
import { resolve } from 'path';

import type { LoaderFunction } from 'remix';
import { bundleMDX } from 'mdx-bundler';

import { json } from '~/json';
import { log } from '~/utils.server';

type Meta = { date: string; author: string };
export type LoaderData = { frontmatter: Meta; code: string }[];

export const loader: LoaderFunction = async () => {
  const filenames = await fs.readdir('changelog');
  const files = filenames.map((f) => resolve('changelog', f));
  log.info(`Parsing markdown for ${files.length} files...`);
  const posts = await Promise.all(
    files.map((file) => bundleMDX<Meta>({ file }))
  );
  return json<LoaderData>(posts);
};
