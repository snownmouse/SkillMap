import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../database';
import { logger } from '../utils/logger';
import { errors } from '../middleware/errorHandler';
import { config } from '../config';
import { validate } from '../../utils/validation';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const ATTEMPT_WINDOW_MINUTES = 15;

function isAppError(error: any): error is { statusCode: number; userMessage: string } {
  return Boolean(
    error &&
    typeof error.statusCode === 'number' &&
    typeof error.userMessage === 'string'
  );
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function isBcryptHash(value: string): boolean {
  return typeof value === 'string' && value.startsWith('$2');
}

async function hashPasswordBcrypt(password: string): Promise<string> {
  const rounds = Math.min(14, Math.max(10, parseInt(process.env.BCRYPT_COST || '12')));
  return await bcrypt.hash(password, rounds);
}

async function verifyPasswordHash(storedHash: string, password: string): Promise<{ ok: boolean; upgradeToBcrypt: boolean }> {
  if (storedHash && isBcryptHash(storedHash)) {
    return { ok: await bcrypt.compare(password, storedHash), upgradeToBcrypt: false };
  }
  return { ok: storedHash === hashPassword(password), upgradeToBcrypt: true };
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encodeSessionToken(rawToken: string): string {
  return `h1:${sha256Hex(rawToken)}`;
}

async function findSessionByTokenWithUser(pool: any, token: string): Promise<any | null> {
  const nowStr = new Date().toISOString();
  const encoded = encodeSessionToken(token);
  let res = await pool.query(
    `SELECT s.*, u.username, u.display_name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > $2`,
    [encoded, nowStr]
  );
  if ((res.rows || []).length > 0) return res.rows[0];

  res = await pool.query(
    `SELECT s.*, u.username, u.display_name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > $2`,
    [token, nowStr]
  );
  if ((res.rows || []).length === 0) return null;

  const row = res.rows[0];
  try {
    await pool.query('UPDATE sessions SET token = $1 WHERE id = $2', [encoded, row.id]);
    row.token = encoded;
  } catch {
  }
  return row;
}

async function findSessionByRefreshTokenWithUser(pool: any, refreshToken: string): Promise<any | null> {
  const nowStr = new Date().toISOString();
  const encoded = encodeSessionToken(refreshToken);
  let res = await pool.query(
    `SELECT s.*, u.username, u.display_name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.refresh_token = $1 AND s.refresh_expires_at > $2`,
    [encoded, nowStr]
  );
  if ((res.rows || []).length > 0) return res.rows[0];

  res = await pool.query(
    `SELECT s.*, u.username, u.display_name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.refresh_token = $1 AND s.refresh_expires_at > $2`,
    [refreshToken, nowStr]
  );
  if ((res.rows || []).length === 0) return null;

  const row = res.rows[0];
  try {
    await pool.query('UPDATE sessions SET refresh_token = $1 WHERE id = $2', [encoded, row.id]);
    row.refresh_token = encoded;
  } catch {
  }
  return row;
}

function getSessionExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

function getRefreshTokenExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

async function checkLoginRateLimit(ip: string): Promise<void> {
  const pool = getPool();
  const now = new Date();
  const nowStr = now.toISOString();

  const result = await pool.query(
    'SELECT * FROM login_attempts WHERE ip_address = $1',
    [ip]
  );

  if (result.rows.length === 0) {
    await pool.query(
      `INSERT INTO login_attempts (id, ip_address, attempt_count, last_attempt_at)
       VALUES ($1, $2, 0, $3)`,
      [uuidv4(), ip, nowStr]
    );
    return;
  }

  const row = result.rows[0];

  if (row.locked_until) {
    const lockedUntil = new Date(row.locked_until);
    if (lockedUntil > now) {
      const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
      throw errors.validation(`登录尝试次数过多，请 ${remainingMinutes} 分钟后再试`);
    } else {
      await pool.query(
        `UPDATE login_attempts SET attempt_count = 0, locked_until = NULL, last_attempt_at = $1
         WHERE ip_address = $2`,
        [nowStr, ip]
      );
      return;
    }
  }

  const lastAttempt = new Date(row.last_attempt_at);
  const windowMs = ATTEMPT_WINDOW_MINUTES * 60 * 1000;
  if (now.getTime() - lastAttempt.getTime() > windowMs) {
    await pool.query(
      `UPDATE login_attempts SET attempt_count = 0, last_attempt_at = $1
       WHERE ip_address = $2`,
      [nowStr, ip]
    );
    return;
  }

  const newCount = row.attempt_count + 1;
  if (newCount >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await pool.query(
      `UPDATE login_attempts SET attempt_count = $1, last_attempt_at = $2, locked_until = $3
       WHERE ip_address = $4`,
      [newCount, nowStr, lockedUntil.toISOString(), ip]
    );
    throw errors.validation('登录尝试次数过多，请 15 分钟后再试');
  }

  await pool.query(
    `UPDATE login_attempts SET attempt_count = $1, last_attempt_at = $2
     WHERE ip_address = $3`,
    [newCount, nowStr, ip]
  );
}

async function recordLoginFailure(ip: string): Promise<void> {
  const pool = getPool();
  const now = new Date();
  const nowStr = now.toISOString();

  const result = await pool.query(
    'SELECT * FROM login_attempts WHERE ip_address = $1',
    [ip]
  );

  if (result.rows.length === 0) {
    await pool.query(
      `INSERT INTO login_attempts (id, ip_address, attempt_count, last_attempt_at)
       VALUES ($1, $2, 1, $3)`,
      [uuidv4(), ip, nowStr]
    );
    return;
  }

  const newCount = result.rows[0].attempt_count + 1;
  if (newCount >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await pool.query(
      `UPDATE login_attempts SET attempt_count = $1, last_attempt_at = $2, locked_until = $3
       WHERE ip_address = $4`,
      [newCount, nowStr, lockedUntil.toISOString(), ip]
    );
  } else {
    await pool.query(
      `UPDATE login_attempts SET attempt_count = $1, last_attempt_at = $2
       WHERE ip_address = $3`,
      [newCount, nowStr, ip]
    );
  }
}

async function recordLoginSuccess(ip: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM login_attempts WHERE ip_address = $1', [ip]);
}

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { username, password, displayName } = req.body;

      if (!username || !password) {
        throw errors.validation('用户名和密码不能为空');
      }
      
      const usernameError = validate.minLength(username, 2, '用户名长度需在 2-20 之间');
      if (usernameError) {
        throw errors.validation(usernameError);
      }
      
      const usernameMaxError = validate.maxLength(username, 20, '用户名长度需在 2-20 之间');
      if (usernameMaxError) {
        throw errors.validation(usernameMaxError);
      }

      const passwordError = validate.password(password, config.security.passwordMinLength);
      if (passwordError) {
        throw errors.validation(passwordError);
      }

      if (config.security.passwordComplexity) {
        const complexityError = validate.passwordComplexity(password);
        if (complexityError) {
          throw errors.validation(complexityError);
        }
      }

      const pool = getPool();
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existing.rows.length > 0) {
        throw errors.validation('用户名已存在');
      }

      const userId = uuidv4();
      const passwordHash = await hashPasswordBcrypt(password);
      await pool.query(
        `INSERT INTO users (id, username, password_hash, display_name)
         VALUES ($1, $2, $3, $4)`,
        [userId, username, passwordHash, displayName || username]
      );

      const token = generateToken();
      const refreshToken = generateToken();
      const sessionId = uuidv4();
      const expiresAt = getSessionExpiry();
      const refreshExpiresAt = getRefreshTokenExpiry();

      await pool.query(
        `INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, refresh_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, userId, encodeSessionToken(token), encodeSessionToken(refreshToken), expiresAt, refreshExpiresAt]
      );

      logger.info('用户注册成功', { userId, username });

      res.status(201).json({
        token,
        refreshToken,
        expiresAt,
        refreshExpiresAt,
        user: { id: userId, username, displayName: displayName || username }
      });
    } catch (error) {
      if (isAppError(error)) {
        res.status(error.statusCode).json({ error: error.userMessage });
        return;
      }
      logger.error('注册失败', error);
      res.status(500).json({ error: '注册失败，请稍后重试' });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

      await checkLoginRateLimit(clientIp);

      if (!username || !password) {
        throw errors.validation('用户名和密码不能为空');
      }

      const pool = getPool();
      const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      const user = userResult.rows[0];
      if (!user) {
        await recordLoginFailure(clientIp);
        throw errors.unauthorized('用户名或密码错误');
      }

      const verification = await verifyPasswordHash(String(user.password_hash || ''), password);
      if (!verification.ok) {
        await recordLoginFailure(clientIp);
        throw errors.unauthorized('用户名或密码错误');
      }

      await recordLoginSuccess(clientIp);

      if (verification.upgradeToBcrypt) {
        try {
          const upgraded = await hashPasswordBcrypt(password);
          await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [upgraded, user.id]);
        } catch {
        }
      }

      await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);

      const token = generateToken();
      const refreshToken = generateToken();
      const sessionId = uuidv4();
      const expiresAt = getSessionExpiry();
      const refreshExpiresAt = getRefreshTokenExpiry();

      await pool.query(
        `INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, refresh_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, user.id, encodeSessionToken(token), encodeSessionToken(refreshToken), expiresAt, refreshExpiresAt]
      );

      logger.info('用户登录成功', { userId: user.id, username });

      res.json({
        token,
        refreshToken,
        expiresAt,
        refreshExpiresAt,
        user: { id: user.id, username: user.username, displayName: user.display_name || user.username }
      });
    } catch (error) {
      if (isAppError(error)) {
        res.status(error.statusCode).json({ error: error.userMessage });
        return;
      }
      logger.error('登录失败', error);
      res.status(500).json({ error: '登录失败，请稍后重试' });
    }
  },

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw errors.validation('刷新令牌不能为空');
      }

      const pool = getPool();
      const oldSession = await findSessionByRefreshTokenWithUser(pool, refreshToken);
      if (!oldSession) {
        throw errors.unauthorized('刷新令牌无效或已过期');
      }

      const newToken = generateToken();
      const newRefreshToken = generateToken();
      const expiresAt = getSessionExpiry();
      const refreshExpiresAt = getRefreshTokenExpiry();

      await pool.query('DELETE FROM sessions WHERE id = $1', [oldSession.id]);

      const newSessionId = uuidv4();
      await pool.query(
        `INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, refresh_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newSessionId, oldSession.user_id, encodeSessionToken(newToken), encodeSessionToken(newRefreshToken), expiresAt, refreshExpiresAt]
      );

      logger.info('Token 刷新成功', { userId: oldSession.user_id });

      res.json({
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt,
        refreshExpiresAt,
        user: {
          id: oldSession.user_id,
          username: oldSession.username,
          displayName: oldSession.display_name || oldSession.username
        }
      });
    } catch (error) {
      if (isAppError(error)) {
        res.status(error.statusCode).json({ error: error.userMessage });
        return;
      }
      logger.error('Token 刷新失败', error);
      res.status(500).json({ error: 'Token 刷新失败，请重新登录' });
    }
  },

  async me(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw errors.unauthorized('未登录');
      }

      const token = authHeader.slice(7);
      const pool = getPool();
      const session = await findSessionByTokenWithUser(pool, token);
      if (!session) {
        throw errors.unauthorized('登录已过期，请重新登录');
      }
      const expiresAt = new Date(session.expires_at);

      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const shouldAutoRefresh = timeUntilExpiry < 24 * 60 * 60 * 1000;

      const response: any = {
        user: {
          id: session.user_id,
          username: session.username,
          displayName: session.display_name || session.username
        }
      };

      if (shouldAutoRefresh) {
        const newToken = generateToken();
        const newRefreshToken = generateToken();
        const newExpiresAt = getSessionExpiry();
        const newRefreshExpiresAt = getRefreshTokenExpiry();

        await pool.query('DELETE FROM sessions WHERE id = $1', [session.id]);
        const newSessionId = uuidv4();
        await pool.query(
          `INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, refresh_expires_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newSessionId, session.user_id, encodeSessionToken(newToken), encodeSessionToken(newRefreshToken), newExpiresAt, newRefreshExpiresAt]
        );

        response.token = newToken;
        response.refreshToken = newRefreshToken;
        response.expiresAt = newExpiresAt;
        response.refreshExpiresAt = newRefreshExpiresAt;
      }

      res.json(response);
    } catch (error) {
      if (isAppError(error)) {
        res.status(error.statusCode).json({ error: error.userMessage });
        return;
      }
      logger.error('验证失败', error);
      res.status(500).json({ error: '验证失败，请稍后重试' });
    }
  },
  async whoami(req: Request, res: Response) {
    res.json({ user: (req as any).user || null });
  },
  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const pool = getPool();
        await pool.query('DELETE FROM sessions WHERE token = $1 OR token = $2', [encodeSessionToken(token), token]);
        logger.info('用户登出成功');
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('登出失败', error);
      res.status(500).json({ error: '退出失败，请稍后重试' });
    }
  },

  async convertTempUser(req: Request, res: Response) {
    try {
      const { username, password, displayName } = req.body;
      const tempUserId = (req as any).user?.id;

      if (!username || !password) {
        throw errors.validation('用户名和密码不能为空');
      }
      
      const usernameError = validate.minLength(username, 2, '用户名长度需在 2-20 之间');
      if (usernameError) {
        throw errors.validation(usernameError);
      }
      
      const usernameMaxError = validate.maxLength(username, 20, '用户名长度需在 2-20 之间');
      if (usernameMaxError) {
        throw errors.validation(usernameMaxError);
      }

      const passwordError = validate.password(password, config.security.passwordMinLength);
      if (passwordError) {
        throw errors.validation(passwordError);
      }

      if (config.security.passwordComplexity) {
        const complexityError = validate.passwordComplexity(password);
        if (complexityError) {
          throw errors.validation(complexityError);
        }
      }

      const pool = getPool();
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existing.rows.length > 0) {
        throw errors.validation('用户名已存在');
      }

      const userId = typeof tempUserId === 'string' && (tempUserId.startsWith('guest_') || tempUserId.startsWith('temp_') || tempUserId.startsWith('device_'))
        ? tempUserId
        : uuidv4();
      const passwordHash = await hashPasswordBcrypt(password);

      try {
        await pool.query(
          `INSERT INTO users (id, username, password_hash, display_name)
           VALUES ($1, $2, $3, $4)`,
          [userId, username, passwordHash, displayName || username]
        );
      } catch (e) {
        await pool.query(
          `UPDATE users SET username = $1, password_hash = $2, display_name = $3
           WHERE id = $4`,
          [username, passwordHash, displayName || username, userId]
        );
      }

      const token = generateToken();
      const refreshToken = generateToken();
      const sessionId = uuidv4();
      const expiresAt = getSessionExpiry();
      const refreshExpiresAt = getRefreshTokenExpiry();

      await pool.query(
        `INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, refresh_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, userId, encodeSessionToken(token), encodeSessionToken(refreshToken), expiresAt, refreshExpiresAt]
      );

      logger.info('临时用户转换成功', { userId, username });

      res.status(201).json({
        token,
        refreshToken,
        expiresAt,
        refreshExpiresAt,
        user: { id: userId, username, displayName: displayName || username },
        message: '账户创建成功'
      });
    } catch (error) {
      if (isAppError(error)) {
        res.status(error.statusCode).json({ error: error.userMessage });
        return;
      }
      logger.error('转换临时用户失败', error);
      res.status(500).json({ error: '创建账户失败，请稍后重试' });
    }
  },

  async updatePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = (req as any).user?.id;

      if (!oldPassword || !newPassword) {
        throw errors.validation('旧密码和新密码不能为空');
      }

      const passwordError = validate.password(newPassword, config.security.passwordMinLength);
      if (passwordError) {
        throw errors.validation(passwordError);
      }

      if (config.security.passwordComplexity) {
        const complexityError = validate.passwordComplexity(newPassword);
        if (complexityError) {
          throw errors.validation(complexityError);
        }
      }

      const pool = getPool();

      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      if (!user) {
        throw errors.notFound('用户');
      }

      const verification = await verifyPasswordHash(String(user.password_hash || ''), oldPassword);
      if (!verification.ok) {
        throw errors.unauthorized('旧密码错误');
      }

      const newPasswordHash = await hashPasswordBcrypt(newPassword);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

      logger.info('密码修改成功', { userId });

      res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
      if (isAppError(error)) {
        res.status(error.statusCode).json({ error: error.userMessage });
        return;
      }
      logger.error('修改密码失败', error);
      res.status(500).json({ error: '修改密码失败，请稍后重试' });
    }
  }
};

const GUEST_COOKIE_NAME = 'sm_guest';
const GUEST_TTL_DAYS = parseInt(process.env.GUEST_SESSION_TTL_DAYS || '30');

function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function buildGuestSetCookie(token: string, nodeEnv: string): string {
  const maxAgeSeconds = Math.max(1, GUEST_TTL_DAYS) * 24 * 60 * 60;
  const secure = nodeEnv === 'production' || nodeEnv === 'staging';
  return [
    `${GUEST_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

async function getOrCreateGuestUser(req: Request, res: Response, pool: any) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const cookies = parseCookieHeader(req.headers.cookie as string | undefined);
  const cookieToken = cookies[GUEST_COOKIE_NAME];

  const now = new Date();
  const nowStr = now.toISOString();
  const expiresAt = new Date(now.getTime());
  expiresAt.setDate(expiresAt.getDate() + Math.max(1, GUEST_TTL_DAYS));
  const expiresAtStr = expiresAt.toISOString();

  if (cookieToken) {
    const tokenHash = sha256Hex(cookieToken);
    const result = await pool.query(
      `SELECT user_id FROM guest_sessions WHERE token_hash = $1 AND expires_at > $2`,
      [tokenHash, nowStr]
    );
    if (result.rows?.length > 0) {
      const userId = String(result.rows[0].user_id);
      await pool.query(
        `UPDATE guest_sessions SET last_seen_at = $1 WHERE token_hash = $2`,
        [nowStr, tokenHash]
      );
      return { id: userId, username: '访客', displayName: '访客', isTempUser: true };
    }
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(newToken);
  const userId = `guest_${uuidv4()}`;

  await pool.query(
    `INSERT INTO guest_sessions (token_hash, user_id, expires_at, created_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tokenHash, userId, expiresAtStr, nowStr, nowStr]
  );

  res.setHeader('Set-Cookie', buildGuestSetCookie(newToken, nodeEnv));
  return { id: userId, username: '访客', displayName: '访客', isTempUser: true };
}

export async function optionalAuth(req: Request, res: Response, next: any) {
  try {
    const authHeader = req.headers.authorization;
    const pool = getPool();
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      (req as any).user = await getOrCreateGuestUser(req, res, pool);
      return next();
    }

    const token = authHeader.slice(7);
    const session = await findSessionByTokenWithUser(pool, token);
    if (!session) {
      res.status(401).json({ error: 'SESSION_EXPIRED', message: '登录已过期，请重新登录' });
      return;
    }

    (req as any).user = {
      id: session.user_id,
      username: session.username,
      displayName: session.display_name || session.username,
      isTempUser: false
    };
    next();
  } catch (error) {
    logger.error('optionalAuth 失败', error);
    const pool = getPool();
    (req as any).user = await getOrCreateGuestUser(req, res, pool);
    next();
  }
}

export async function requireAuth(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未登录，请先登录' });
      return;
    }

    const token = authHeader.slice(7);
    const pool = getPool();
    const session = await findSessionByTokenWithUser(pool, token);
    if (!session) {
      res.status(401).json({ error: '登录已过期，请重新登录' });
      return;
    }

    (req as any).user = {
      id: session.user_id,
      username: session.username,
      displayName: session.display_name || session.username
    };
    next();
  } catch (error) {
    logger.error('requireAuth 失败', error);
    res.status(500).json({ error: '鉴权失败，请稍后重试' });
  }
}
