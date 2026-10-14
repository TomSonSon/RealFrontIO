/**
 * Coalition-sanction damage (Realistic World mode): how much a target's
 * passive income is reduced per concurrent embargo-wielding sender, capped so
 * a sanctioned economy keeps a floor. More senders (a coalition / isolation)
 * hurts more - coordinating pressure is stronger than a lone boycott.
 */
export function coalitionSanctionPercent(senders: number): number {
  return Math.max(50, 100 - 25 * senders);
}
