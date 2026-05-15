import { randomBytes } from 'crypto';

export function generateReservationCode(): string {
  return randomBytes(9).toString('base64url'); // 12 URL-safe chars, ~72 bits entropy
}
