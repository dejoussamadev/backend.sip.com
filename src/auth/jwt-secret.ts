export function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwtSecret;
}
