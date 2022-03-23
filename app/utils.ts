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
