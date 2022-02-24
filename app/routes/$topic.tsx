import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import { topic } from '~/cookies.server';

interface Link {
  url: string;
  domain: string;
  title: string;
  shares: number;
  date: string;
}

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.topic, 'expected params.topic');
  if (!['eth', 'btc', 'nfts', 'tesla'].includes(params.topic))
    throw new Response('Not Found', { status: 404 });
  return json([
    {
      url: 'https://www.cbsnews.com/news/ukraine-russia-invasion-economic-impact-united-states',
      domain: 'cbsnews.com',
      title: 'How the Ukraine crisis is already hitting Americans’ wallets',
      shares: 12,
      date: 'Feb 23 · 05:54 AM',
    }, 
    {
      url: 'https://www.theblockcrypto.com/post/134871/luna-founation-guard-token-sale',
      domain: 'theblockcrypto.com',
      title: 'Luna Foundation Guard raises $1 billion to form bitcoin reserve for UST stablecoin',
      shares: 11,
      date: 'Feb 22 · 05:02 PM',
    },
    {
      url: 'https://news.bloomberglaw.com/securities-law/sec-accredited-investor-definition-tweak-faces-equity-concerns',
      domain: 'news.bloomberglaw.com',
      title: 'SEC ‘Accredited Investor’ Definition Tweak Faces Equity Concerns',
      shares: 8,
      date: '9h',
    },
    {
      url: 'https://www.btc-echo.de/news/bitcoin-spd-gruene-und-linke-fordern-verbot-in-der-eu-135678/',
      domain: 'btc-echo.de',
      title: 'Exklusiv: SPD, Grüne und Linke wollen Bitcoin in Europa verbieten',
      shares: 4,
      date: '12h',
    },
    {
      url: 'https://www.cbsnews.com/news/ukraine-russia-invasion-economic-impact-united-states',
      domain: 'cbsnews.com',
      title: 'How the Ukraine crisis is already hitting Americans’ wallets',
      shares: 3,
      date: '13h',
    }, 
    {
      url: 'https://www.theblockcrypto.com/post/134871/luna-founation-guard-token-sale',
      domain: 'theblockcrypto.com',
      title: 'Luna Foundation Guard raises $1 billion to form bitcoin reserve for UST stablecoin',
      shares: 9,
      date: '14h',
    },
    {
      url: 'https://news.bloomberglaw.com/securities-law/sec-accredited-investor-definition-tweak-faces-equity-concerns',
      domain: 'news.bloomberglaw.com',
      title: 'SEC ‘Accredited Investor’ Definition Tweak Faces Equity Concerns',
      shares: 8,
      date: '15h',
    },
    {
      url: 'https://www.btc-echo.de/news/bitcoin-spd-gruene-und-linke-fordern-verbot-in-der-eu-135678/',
      domain: 'btc-echo.de',
      title: 'Exklusiv: SPD, Grüne und Linke wollen Bitcoin in Europa verbieten',
      shares: 4,
      date: '16h',
    },
    {
      url: 'https://www.cbsnews.com/news/ukraine-russia-invasion-economic-impact-united-states',
      domain: 'cbsnews.com',
      title: 'How the Ukraine crisis is already hitting Americans’ wallets',
      shares: 7,
      date: '18h',
    }, 
    {
      url: 'https://www.theblockcrypto.com/post/134871/luna-founation-guard-token-sale',
      domain: 'theblockcrypto.com',
      title: 'Luna Foundation Guard raises $1 billion to form bitcoin reserve for UST stablecoin',
      shares: 3,
      date: '24h',
    },
  ], { headers: { 'Set-Cookie': await topic.serialize(params.topic) } });
};

export default function Index() {
  const links = useLoaderData<Link[]>();
  return (
    <main>
      <ol className='list-decimal text-sm ml-4 mr-4 mt-6'>
        {links.map((link) => (
          <li key={link.url} className='my-1'>
            <div>
              <a 
                className='font-serif font-semibold hover:underline text-base' 
                href={link.url} 
                target='_blank' 
                rel='noopener noreferrer'
              >{link.title}
              </a> <span className='text-sm'>
                (<a className='hover:underline' href={`https://${link.domain}`} target='_blank' rel='noopener noreferrer'>{link.domain}</a>)
              </span>
            </div>
            <div className='text-sm'>
              <span className='hover:underline cursor-pointer'>{link.shares} shares</span>{' · '}
              <span>{link.date}</span>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
