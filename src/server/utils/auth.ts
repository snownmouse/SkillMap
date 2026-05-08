import { Request } from 'express';

export function getAllowedUserIds(req: Request): string[] {
  const user = (req as any).user;
  const userId = user?.id || 'default';
  if (user?.isTempUser) {
    const allowLegacyDefault = process.env.ALLOW_LEGACY_DEFAULT_USER === 'true';
    return allowLegacyDefault ? [userId, 'default'] : [userId];
  }
  return [userId];
}
