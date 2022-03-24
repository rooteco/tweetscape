// Download fonts in a Google Fonts CSS file and store them locally on our own
// servers (to reduce the number of requests that have to be resolved by the
// browser and to make it easier for us to preload the specific font files).

// I could never get this to work with Firefox; it's sanitizer kept on rejecting
// my downloaded `woff2` files (probably something to do with `gzip`) so I just
// ended up using: https://google-webfonts-helper.herokuapp.com/fonts/inter

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fetch from 'node-fetch';

const FONT = 'inter';

(async () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const cssPath = resolve(dir, `../public/fonts/${FONT}.css`);
  const css = (await fs.readFile(cssPath)).toString();
  const regex =
    /\/\* (\w+-?\w+) \*\/\n(.*\n.*\n.*\n.*)font-weight: (\d+);\n(.*\n.*)url\((.*)\) format\('(\w+)'\);\n(.*\n})/gm;
  let matches;
  const fonts = [];
  while ((matches = regex.exec(css)) !== null) fonts.push(matches);
  let generated = '';
  for await (const [
    _,
    subset,
    fontFaceDef,
    weight,
    displayDef,
    url,
    fileType,
    unicodeDef,
  ] of fonts) {
    console.log('Subset:', subset);
    console.log('Weight:', weight);
    console.log('URL:', url);
    console.log('File type:', fileType);
    const path = `/fonts/${FONT}-${subset}-${weight}.${fileType}`;
    const config = {
      method: 'GET',
      headers: {
        'Accept': 'font/woff2',
        'Accept-Encoding': 'identity',
      },
    };
    await fetch(url, config).then(
      (res) =>
        new Promise((resolve, reject) => {
          const dest = fs.createWriteStream(resolve(dir, `../public${path}`));
          res.body.pipe(dest);
          res.body.on('end', () => resolve());
          dest.on('error', reject);
        })
    );
    generated += `${fontFaceDef}font-weight: ${weight};\n${displayDef}url('${path}') format('${fileType}');\n${unicodeDef}\n`;
  }
  await fs.writeFile(resolve(dir, `../public/fonts/${FONT}.css`), generated);
})();
