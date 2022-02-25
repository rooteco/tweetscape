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
        shares: Array(21)
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
      {
        url: 'https://blog.obol.tech/announcing-the-proto-community/',
        domain: 'blog.obol.tech',
        title: 'Proto Community Launch',
        description:
          'Obol Proto Community Today we are honored to launch the Obol Proto Community, an onramp to organize, educate, and incentivize community members contributing to DVT and the Obol Ecosystem.   The Proto Community will fuse the different subcommunities of Obol and offer community members the opportunity to participate in the development',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: '20h ago',
      },
      {
        url: 'https://review.mirror.xyz/IRnxxEaQVblaA5OjGpJ3T9XlvqbydzCiDfCYg54jLOo',
        domain: 'review.mirror.xyz',
        title: 'Lens Protocol 🌿',
        description:
          'Lens is a decentralized social graph protocol created by the AAVE team. The purpose of the protocol is to empower creators to own the links in the social graph that connects them with their community. Lens allows accounts to create and follow profiles, publish and collect posts, and much more, focusing on the economics of social interactions.',
        shares: Array(4)
          .fill(null)
          .map(() => pic()),
        date: '20h ago',
      },
      {
        url: 'https://www.theblockcrypto.com/linked/135292/eth-market-faces-500-million-liquidation-if-price-drops-below-2100?utm_source=twitter&utm_medium=social',
        domain: 'theblockcrypto.com',
        title:
          'ETH market faces $500 million liquidation if price drops below $2,100',
        description:
          '$500 million in ETH is in danger of liquidation if a Maker vault holder fails to top their vaults before the price ETH falls below $2,100.',
        shares: Array(2)
          .fill(null)
          .map(() => pic()),
        date: '3h ago',
      },
      {
        url: 'https://aika.market/',
        domain: 'aika.market',
        title: 'Non Fungible Time',
        description:
          'Mint your time as NFTs on the Polygon network. Sell your time to interested parties. Purchase other people’s time.',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 23 • 05:59 PM',
      },
      {
        url: 'https://markets.businessinsider.com/news/currencies/ftx-blockchain-crypto-bitcoin-ethereum-tom-brady-nft-metaverse-fashion-2022-2?utmSource=twitter&utmContent=referral&utmTerm=topbar&referrer=twitter',
        domain: 'markets.businessinsider.com',
        title:
          'FTX takes aim at the $300 billion luxury goods market and hires a beauty entrepreneur to head the push',
        description:
          'Crypto exchange FTX has hired Lauren Remington Platt to work on partnerships with luxury and fashion brands.',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: 'Feb 23 • 07:13 PM',
      },
      {
        url: 'https://www.theblockcrypto.com/post/135286/china-crypto-jail-people-if-funds-raised-public',
        domain: 'theblockcrypto.com',
        title:
          'China can now jail people if funds raised via crypto from public',
        description:
          'China can now issue sentences if funds are raised via crypto from the public as the country’s Supreme Court has amended Criminal Law.',
        shares: Array(3)
          .fill(null)
          .map(() => pic()),
        date: '6h ago',
      },
    ],
    { headers: { 'Set-Cookie': await topic.serialize(params.topic) } }
  );
};

export default function Index() {
  const links = useLoaderData<Link[]>();
  return (
    <main>
      <ol className='list-decimal text-sm ml-6 mr-4'>
        {links.map((link) => (
          <li key={link.url} className='my-4'>
            <div className='ml-2'>
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
            <p className='text-sm ml-2'>{link.description}</p>
            <div className='text-sm text-stone-600 lowercase flex items-center mt-1.5 ml-2'>
              <span className='flex flex-row-reverse justify-end -ml-[2px] mr-2.5'>
                {link.shares.map((picture) => (
                  <img
                    className='inline-block cursor-pointer duration-75 hover:transition hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full border-2 border-white -mr-2'
                    key={picture.id}
                    src={picture.src}
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
