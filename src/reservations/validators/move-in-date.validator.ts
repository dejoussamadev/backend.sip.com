/**
 * Returns `true` when `dateString` represents today or a future date.
 * Uses UTC midnight to avoid timezone-related false negatives.
 */
export function isMoveInDateValid(dateString: string): boolean {
  const moveIn = new Date(dateString);
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  return moveIn >= todayUtc;
}
