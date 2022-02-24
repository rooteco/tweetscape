import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import { topic } from '~/cookies.server';

interface Pic {
  id: string;
  src: string;
}

interface Link {
  url: string;
  domain: string;
  title: string;
  description: string;
  shares: Pic[];
  date: string;
}

// Return a random integer between min and max (inclusive).
function random(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Sample **n** random values from a collection using the modern version of the
// [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
// If **n** is not specified, returns a single random element.
// The internal `guard` argument allows it to work with `map`.
function sample<T>(obj: T[], num: number): T[] {
  const sampl = Array.from(obj);
  const n = Math.max(Math.min(num, sampl.length), 0);
  const last = sampl.length - 1;
  for (let index = 0; index < n; index += 1) {
    const rand = random(index, last);
    const temp = sampl[index];
    sampl[index] = sampl[rand];
    sampl[rand] = temp;
  }
  return sampl.slice(0, n);
}

let id = 0;
function pic() {
  const src = `/pics/${
    sample(['brendon', 'jasmine', 'rauchg', 'rhys', 'ryan', 'vanessa'], 1)[0]
  }.jpg`;
  id += 1;
  return { id, src };
}

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.topic, 'expected params.topic');
  if (!['eth', 'btc', 'nfts', 'tesla'].includes(params.topic))
    throw new Response('Not Found', { status: 404 });
  return json(
    [
      {
        url: 'https://www.cbsnews.com/news/ukraine-russia-invasion-economic-impact-united-states',
        domain: 'cbsnews.com',
        title: 'How the Ukraine crisis is already hitting Americans’ wallets',
        description:
          'With higher gas prices, inflation and supply-chain shocks, the conflict in Europe is spilling over into the U.S. economy.',
        shares: Array(25)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 23 • 05:54 AM',
      },
      {
        url: 'https://www.theblockcrypto.com/post/134871/luna-founation-guard-token-sale',
        domain: 'theblockcrypto.com',
        title:
          'Luna Foundation Guard raises $1 billion to form bitcoin reserve for UST stablecoin',
        description:
          'The Luna Foundation Guard (LFG) has raised $1 billion through an over-the-counter sale of LUNA.',
        shares: Array(23)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 22 • 05:02 PM',
      },
      {
        url: 'https://news.bloomberglaw.com/securities-law/sec-accredited-investor-definition-tweak-faces-equity-concerns',
        domain: 'news.bloomberglaw.com',
        title:
          'SEC ‘Accredited Investor’ Definition Tweak Faces Equity Concerns',
        description:
          'The SEC’s plan to reconsider who is eligible to invest in startups’ privately-held share offerings is stirring questions about equity and diversity.',
        shares: Array(16)
          .fill(null)
          .map(() => pic()),
        date: '9h ago',
      },
      {
        url: 'https://www.btc-echo.de/news/bitcoin-spd-gruene-und-linke-fordern-verbot-in-der-eu-135678/',
        domain: 'btc-echo.de',
        title:
          'Exklusiv: SPD, Grüne und Linke wollen Bitcoin in Europa verbieten',
        description:
          'Das EU-Parlament spricht sich für ein Dienstleistungsverbot mit Bitcoin aus – auf Anraten von SPD, Grünen und Linken.',
        shares: Array(13)
          .fill(null)
          .map(() => pic()),
        date: '12h ago',
      },
    ],
    { headers: { 'Set-Cookie': await topic.serialize(params.topic) } }
  );
};

export default function Index() {
  const links = useLoaderData<Link[]>();
  return (
    <main>
      <ol className='list-decimal text-sm ml-4 mr-4'>
        {links.map((link) => (
          <li key={link.url} className='my-4'>
            <div>
              <a
                className='font-serif font-semibold hover:underline text-base'
                href={link.url}
                target='_blank'
                rel='noopener noreferrer'
              >
                {link.title}
              </a>{' '}
              <span className='text-sm'>
                (
                <a
                  className='hover:underline'
                  href={`https://${link.domain}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {link.domain}
                </a>
                )
              </span>
            </div>
            <p className='text-sm'>{link.description}</p>
            <div className='text-sm text-stone-600 lowercase flex items-center mt-1.5'>
              <span className='flex flex-row-reverse justify-end -ml-[2px] mr-2.5'>
                {link.shares.map(({ id, src }) => (
                  <img
                    className='inline-block h-6 w-6 rounded-full border-2 border-white -mr-2'
                    key={id}
                    src={src}
                    alt=''
                  />
                ))}
              </span>
              <span className='ml-1 hover:underline cursor-pointer'>
                {link.shares.length} Tweets
              </span>
              <span className='mx-1'>•</span>
              <span>{link.date}</span>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
