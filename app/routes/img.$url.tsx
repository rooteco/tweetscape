import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

export const loader: LoaderFunction = async ({ request, params }) => {
  // Cloudflare-specific options are in the cf object.
  // @see https://developers.cloudflare.com/images/image-resizing/resize-with-workers/#an-example-worker
  const options: { cf: RequestInitCfProperties } = { cf: {} };

  // Copy parameters from query string to request options.
  // You can implement various different parameters here.
  options.cf.image = {};
  options.cf.image.fit = 'cover';
  options.cf.image.width = 20;
  options.cf.image.height = 20;
  options.cf.image.quality = 50;

  // Your Worker is responsible for automatic format negotiation. Check the Accept header.
  const accept = request.headers.get('Accept') ?? '';
  if (/image\/avif/.test(accept)) {
    options.cf.image.format = 'avif';
  } else if (/image\/webp/.test(accept)) {
    options.cf.image.format = 'webp';
  }

  // Get URL of the original (full size) image to resize.
  // You could adjust the URL here, e.g., prefix it with a fixed address of your server,
  // so that user-visible URLs are shorter and cleaner.
  invariant(params.url, 'expected params.url');
  const { hostname, pathname } = new URL(params.url);

  // Optionally, only allow URLs with JPEG, PNG, GIF, or WebP file extensions.
  // @see https://developers.cloudflare.com/images/url-format#supported-formats-and-limitations
  if (!/\.(jpe?g|png|gif|webp)$/i.test(pathname))
    return new Response('Disallowed file extension', { status: 400 });

  // Only accept Twitter profile images.
  if (hostname !== 'pbs.twimg.com')
    return new Response('Must use pbs.twimg.com images', { status: 403 });

  // Build a request that passes through request headers.
  const imageRequest = new Request(params.url, { headers: request.headers });

  // Returning fetch() with resizing options will pass through response with the resized image.
  return fetch(imageRequest, options);
};
