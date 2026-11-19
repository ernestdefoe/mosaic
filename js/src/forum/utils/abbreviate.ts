/** A compact count: 950, 1.2k, 3.4M. */
export default function abbreviate(n: number): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';

  return String(v);
}
