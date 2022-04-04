export function substr(str: string, len: number): string {
  return `${str.substring(0, len).trim()}${str.length > len ? '…' : ''}`;
}

export function caps(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

export function num(n: number): string {
  if (n > 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')}M`;
  if (n > 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return n.toString();
}

// Numbers in JS are absolutely horrendous which is why Prisma wraps large
// integers in `BigInt`. But, when using raw queries, it doesn't and thus I
// can't simply compare them as digits. Instead, I use strings:
// > tweetIds[0]
// 1509926247165411300n
// > tweets[0].id
// 1509926247165411300
// > BigInt(tweets[0].id)
// 1509926247165411328n
// > tweets[0].id == tweetIds[0]
// false
// > tweets[0].id.toString() == tweetIds[0].toString()
// true
export function eq(n1?: bigint | string | null, n2?: bigint | string | null) {
  return n1?.toString() === n2?.toString();
}

// TODO: Replace `Array(5).fill(null)` with `range(0, 5)` or similar.
// @see https://www.joshwcomeau.com/snippets/javascript/range/
export function range(start: number, end?: number, step = 1) {
  const output: number[] = [];
  if (typeof end === 'undefined') {
    end = start;
    start = 0;
  }
  for (let i = start; i < end; i += step) output.push(i);
  return output;
}

// @see https://www.joshwcomeau.com/snippets/javascript/random/
export function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}
