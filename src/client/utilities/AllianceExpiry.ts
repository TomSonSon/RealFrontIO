import { renderDuration, translateText } from "../Utils";

/**
 * Real-borders treaty alliances expire at tick + 1,000,000,000, about 3 years
 * at 10 ticks per second. Anything past one year reads as permanent.
 */
export const PERMANENT_ALLIANCE_SECONDS = 31_536_000;

export function renderAllianceRemaining(remainingSeconds: number): string {
  if (remainingSeconds > PERMANENT_ALLIANCE_SECONDS) {
    return translateText("alliance.permanent");
  }
  return renderDuration(remainingSeconds);
}
