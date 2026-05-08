import { WebSocketServer, WebSocket, CloseEvent } from 'ws';
import { Server } from 'http';
import crypto from 'crypto';
import { getPool } from './database';
import { logger } from './utils/logger';

interface WSClient {
  ws: WebSocket;
  userId: string;
  taskId?: string;
  lastPongAt: number;
  isAlive: boolean;
  connectedAt: number;
  ip?: string;
  windowStartedAt?: number;
  windowMessageCount?: number;
}

const clients: Map<string, WSClient> = new Map();
const HEARTBEAT_INTERVAL_MS = 30000;
const CONNECTION_TIMEOUT_MS = 60000;
const WS_RATE_WINDOW_MS = parseInt(process.env.WS_RATE_WINDOW_MS || '10000');
const WS_MAX_MESSAGES_PER_WINDOW = parseInt(process.env.WS_MAX_MESSAGES_PER_WINDOW || '50');
const WS_MAX_CONNECTIONS_PER_IP = parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '20');

const ipConnectionCounts: Map<string, number> = new Map();

let wss: WebSocketServer;
let heartbeatTimer: NodeJS.Timeout | null = null;

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

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getAllowedOrigins(): string[] {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean).filter(o => o !== '*');
}

function getClientIp(req: any): string {
  const forwarded = (req?.headers?.['x-forwarded-for'] as string | undefined) || undefined;
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown';
}

async function resolveUserIdFromGuestCookie(req: any): Promise<string | null> {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  const token = cookies['sm_guest'];
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const pool = getPool();
  const nowStr = new Date().toISOString();
  const result = await pool.query(
    `SELECT user_id FROM guest_sessions WHERE token_hash = $1 AND expires_at > $2`,
    [tokenHash, nowStr]
  );
  if ((result.rows || []).length === 0) return null;
  return String(result.rows[0].user_id);
}

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    maxPayload: 1024 * 1024 * 5,
    perMessageDeflate: {
      zlibDeflateOptions: { level: 1 },
      zlibInflateOptions: { chunkSize: 1024 },
      threshold: 1024,
    },
  });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const clientId = generateClientId();
    let userId = 'default';
    const ip = getClientIp(req);
    const currentCount = ipConnectionCounts.get(ip) || 0;
    if (currentCount >= WS_MAX_CONNECTIONS_PER_IP) {
      ws.close(1013, 'Too many connections');
      return;
    }
    ipConnectionCounts.set(ip, currentCount + 1);
    const origin = (req?.headers?.origin as string | undefined) || undefined;
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
      ws.close(1008, 'Origin not allowed');
      ipConnectionCounts.set(ip, Math.max(0, (ipConnectionCounts.get(ip) || 1) - 1));
      return;
    }

    const client: WSClient = {
      ws,
      userId,
      lastPongAt: Date.now(),
      isAlive: true,
      connectedAt: Date.now(),
      ip,
      windowStartedAt: Date.now(),
      windowMessageCount: 0,
    };

    ws.on('pong', () => {
      client.lastPongAt = Date.now();
      client.isAlive = true;
    });

    const authPromise = (async () => {
      try {
        const guestUserId = await resolveUserIdFromGuestCookie(req);
        if (guestUserId) {
          userId = guestUserId;
          client.userId = userId;
          return;
        }
      } catch (e) {
        logger.warn('WebSocket 认证失败，使用默认用户', { error: (e as Error).message });
      }
    })();

    authPromise.then(() => {
      clients.set(clientId, client);

      logger.info('WebSocket 客户端连接', { 
        clientId, 
        userId, 
        totalClients: clients.size 
      });

      ws.send(JSON.stringify({ type: 'connected', clientId, totalClients: clients.size }));

      ws.on('message', (data: any) => {
        try {
          const now = Date.now();
          if (!client.windowStartedAt || now - client.windowStartedAt >= WS_RATE_WINDOW_MS) {
            client.windowStartedAt = now;
            client.windowMessageCount = 0;
          }
          client.windowMessageCount = (client.windowMessageCount || 0) + 1;
          if (client.windowMessageCount > WS_MAX_MESSAGES_PER_WINDOW) {
            ws.close(1008, 'Rate limit');
            return;
          }

          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            client.lastPongAt = Date.now();
            client.isAlive = true;
            return;
          }
          handleMessage(clientId, message);
        } catch (e) {
          logger.warn('WebSocket 消息解析失败', { 
            clientId, 
            error: (e as Error).message 
          });
        }
      });

      ws.on('close', (code: number, reason: Buffer) => {
        const duration = Math.round((Date.now() - client.connectedAt) / 1000);
        clients.delete(clientId);
        if (client.ip) {
          ipConnectionCounts.set(client.ip, Math.max(0, (ipConnectionCounts.get(client.ip) || 1) - 1));
        }
        logger.info('WebSocket 客户端断开', { 
          clientId, 
          userId,
          code, 
          reason: reason.toString(),
          duration,
          totalClients: clients.size 
        });
      });

      ws.on('error', (error: Error) => {
        logger.error('WebSocket 错误', { 
          clientId, 
          error: error.message,
          stack: error.stack 
        });
        clients.delete(clientId);
        if (client.ip) {
          ipConnectionCounts.set(client.ip, Math.max(0, (ipConnectionCounts.get(client.ip) || 1) - 1));
        }
      });
    }).catch((error) => {
      logger.error('WebSocket 连接初始化失败', { 
        clientId, 
        error: error.message 
      });
      ws.close(1011, '服务器内部错误');
    });
  });

  wss.on('error', (error: Error) => {
    logger.error('WebSocket 服务器错误', { 
      error: error.message,
      stack: error.stack 
    });
  });

  wss.on('close', () => {
    logger.info('WebSocket 服务器关闭');
  });

  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [clientId, client] of clients) {
      if (!client.isAlive) {
        logger.warn('WebSocket 心跳超时，断开连接', { clientId });
        client.ws.terminate();
        clients.delete(clientId);
        cleaned++;
        continue;
      }

      if (now - client.lastPongAt > CONNECTION_TIMEOUT_MS) {
        client.isAlive = false;
        client.ws.ping();
      }
    }

    if (cleaned > 0) {
      logger.info('WebSocket 心跳检查完成', { 
        cleaned, 
        remaining: clients.size 
      });
    }
  }, HEARTBEAT_INTERVAL_MS);

  logger.info('WebSocket 服务器已初始化');
}

function handleMessage(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (!client) {
    logger.warn('WebSocket 消息处理失败：客户端不存在', { clientId });
    return;
  }

  switch (message.type) {
    case 'subscribe_task':
      if (!message.taskId) {
        logger.warn('WebSocket 订阅任务失败：缺少 taskId', { clientId });
        return;
      }
      (async () => {
        try {
          const pool = getPool();
          const res = await pool.query('SELECT user_id FROM tasks WHERE id = $1', [message.taskId]);
          const owner = res.rows?.[0]?.user_id ? String(res.rows[0].user_id) : null;
          if (!owner || owner !== client.userId) {
            logger.warn('WebSocket 订阅任务拒绝：任务不属于当前用户', { clientId, taskId: message.taskId });
            return;
          }
          client.taskId = message.taskId;
          logger.info('WebSocket 订阅任务', { clientId, taskId: message.taskId });
        } catch (e) {
          logger.warn('WebSocket 订阅任务失败', { clientId, taskId: message.taskId, error: (e as Error).message });
        }
      })();
      break;
    case 'unsubscribe_task':
      client.taskId = undefined;
      logger.info('WebSocket 取消订阅任务', { clientId });
      break;
    case 'auth':
      (async () => {
        try {
          const token = message.token;
          if (!token) {
            logger.warn('WebSocket 认证失败：缺少 token', { clientId });
            return;
          }

          const pool = getPool();
          const result = await pool.query(
            `SELECT s.user_id FROM sessions s
             WHERE s.token = $1 AND s.expires_at > NOW()`,
            [token]
          );

          if (result.rows.length > 0) {
            client.userId = result.rows[0].user_id;
            logger.info('WebSocket 认证成功', { clientId, userId: result.rows[0].user_id });
          } else {
            logger.warn('WebSocket 认证失败：无效 token', { clientId });
          }
        } catch (e) {
          logger.warn('WebSocket 认证失败', { 
            clientId, 
            error: (e as Error).message 
          });
        }
      })();
      break;
    default:
      logger.warn('WebSocket 未知消息类型', { clientId, type: message.type });
  }
}

export function notifyTaskUpdate(taskId: string, update: {
  status: string;
  userId?: string;
  treeId?: string;
  error?: string;
  progress?: number;
  stage?: string;
  message?: string;
  phase?: string;
  preview?: string;
  nodeId?: string;
  nodeData?: any;
}) {
  try {
    const payload = JSON.stringify({
      type: 'task_update',
      taskId,
      ...update,
      timestamp: new Date().toISOString(),
    });

    let sent = 0;
    for (const [clientId, client] of clients) {
      if (client.taskId === taskId && client.ws.readyState === WebSocket.OPEN) {
        if (update.userId && client.userId !== update.userId) continue;
        client.ws.send(payload);
        sent++;
      }
    }

    if (sent > 0) {
      logger.debug('WebSocket 任务更新已发送', { taskId, sent });
    }
  } catch (e) {
    logger.error('WebSocket 任务更新发送失败', { 
      taskId, 
      error: (e as Error).message 
    });
  }
}

export function notifyProgressUpdate(userId: string, update: {
  treeId: string;
  nodeId: string;
  progress: number;
  status: string;
}) {
  try {
    const payload = JSON.stringify({
      type: 'progress_update',
      ...update,
      timestamp: new Date().toISOString(),
    });

    let sent = 0;
    for (const [_clientId, client] of clients) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
        sent++;
      }
    }

    if (sent > 0) {
      logger.debug('WebSocket 进度更新已发送', { userId, sent });
    }
  } catch (e) {
    logger.error('WebSocket 进度更新发送失败', { 
      userId, 
      error: (e as Error).message 
    });
  }
}

export function notifyAchievement(userId: string, achievement: any) {
  try {
    const payload = JSON.stringify({
      type: 'achievement_earned',
      achievement,
      timestamp: new Date().toISOString(),
    });

    let sent = 0;
    for (const [_clientId, client] of clients) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
        sent++;
      }
    }

    if (sent > 0) {
      logger.debug('WebSocket 成就通知已发送', { userId, sent });
    }
  } catch (e) {
    logger.error('WebSocket 成就通知发送失败', { 
      userId, 
      error: (e as Error).message 
    });
  }
}

export function closeWebSocket() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  logger.info('WebSocket 服务器正在关闭，断开所有连接', { count: clients.size });

  for (const [clientId, client] of clients) {
    client.ws.close(1001, '服务器正在关闭');
  }

  clients.clear();

  if (wss) {
    wss.close((error) => {
      if (error) {
        logger.error('WebSocket 服务器关闭失败', { error: error.message });
      } else {
        logger.info('WebSocket 服务器已关闭');
      }
    });
  }
}

export function getClientCount(): number {
  return clients.size;
}

function generateClientId(): string {
  return 'ws_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}
