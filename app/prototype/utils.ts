export const canUseDOM = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

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
