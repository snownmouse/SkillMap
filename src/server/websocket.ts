import { WebSocketServer, WebSocket, CloseEvent } from 'ws';
import { Server } from 'http';
import { getPool } from './database';
import { logger } from './utils/logger';

interface WSClient {
  ws: WebSocket;
  userId: string;
  taskId?: string;
  lastPongAt: number;
  isAlive: boolean;
  connectedAt: number;
}

const clients: Map<string, WSClient> = new Map();
const HEARTBEAT_INTERVAL_MS = 30000;
const CONNECTION_TIMEOUT_MS = 60000;

let wss: WebSocketServer;
let heartbeatTimer: NodeJS.Timeout | null = null;

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

    const client: WSClient = {
      ws,
      userId,
      lastPongAt: Date.now(),
      isAlive: true,
      connectedAt: Date.now(),
    };

    ws.on('pong', () => {
      client.lastPongAt = Date.now();
      client.isAlive = true;
    });

    const authPromise = (async () => {
      try {
        const url = new URL(req.url || '', 'http://localhost');
        const token = url.searchParams.get('token');
        const deviceId = url.searchParams.get('deviceId');

        if (token) {
          const pool = getPool();
          const result = await pool.query(
            `SELECT s.user_id FROM sessions s
             WHERE s.token = $1 AND s.expires_at > NOW()`,
            [token]
          );

          if (result.rows.length > 0) {
            userId = result.rows[0].user_id;
            client.userId = userId;
          }
          return;
        }

        if (deviceId) {
          userId = `device_${deviceId}`;
          client.userId = userId;
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
      client.taskId = message.taskId;
      logger.info('WebSocket 订阅任务', { clientId, taskId: message.taskId });
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