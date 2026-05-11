import { Request } from 'express';

export function getAllowedUserIds(req: Request): string[] {
  const user = (req as any).user;
  let userId = user?.id || 'default';
  // 对于临时用户，统一用 'default' 作为 user_id，方便查询
  if (userId && (userId.startsWith('guest_') || userId.startsWith('temp_') || userId.startsWith('device_'))) {
    userId = 'default';
  }
  if (user?.isTempUser) {
    const allowLegacyDefault = true; // 总是允许查询 legacy default 用户
    return allowLegacyDefault ? [userId, 'default'] : [userId];
  }
  return [userId];
}
