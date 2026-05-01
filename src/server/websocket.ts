import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getPool } from './database';
import { logger } from './utils/Logger';

interface WSClient {
  ws: WebSocket;
  userId: string;
  taskId?: string;
}

const clients: Map<string, WSClient> = new Map();

let wss: WebSocketServer;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const clientId = generateClientId();
    let userId = 'default';

    const authPromise = (async () => {
      try {
        const url = new URL(req.url || '', 'http://localhost');
        const token = url.searchParams.get('token');

        if (token) {
          const pool = getPool();
          const result = await pool.query(
            `SELECT s.user_id FROM sessions s
             WHERE s.token = $1 AND s.expires_at > NOW()`,
            [token]
          );

          if (result.rows.length > 0) {
            userId = result.rows[0].user_id;
          }
        }
      } catch (e) {
        logger.warn('WebSocket 认证失败，使用默认用户');
      }
    })();

    authPromise.then(() => {
      const client: WSClient = { ws, userId };
      clients.set(clientId, client);

      logger.info('WebSocket 客户端连接', { clientId, userId });

      ws.send(JSON.stringify({ type: 'connected', clientId }));

      ws.on('message', (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          handleMessage(clientId, message);
        } catch (e) {
          logger.warn('WebSocket 消息解析失败', e);
        }
      });

      ws.on('close', () => {
        clients.delete(clientId);
        logger.info('WebSocket 客户端断开', { clientId });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket 错误', error);
        clients.delete(clientId);
      });
    });
  });

  logger.info('WebSocket 服务器已初始化');
}

function handleMessage(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'subscribe_task':
      client.taskId = message.taskId;
      logger.info('WebSocket 订阅任务', { clientId, taskId: message.taskId });
      break;
    case 'unsubscribe_task':
      client.taskId = undefined;
      break;
    case 'auth':
      (async () => {
        try {
          const token = message.token;
          if (token) {
            const pool = getPool();
            const result = await pool.query(
              `SELECT s.user_id FROM sessions s
               WHERE s.token = $1 AND s.expires_at > NOW()`,
              [token]
            );

            if (result.rows.length > 0) {
              client.userId = result.rows[0].user_id;
              logger.info('WebSocket 认证成功', { clientId, userId: result.rows[0].user_id });
            }
          }
        } catch (e) {
          logger.warn('WebSocket 认证失败', e);
        }
      })();
      break;
    default:
      logger.warn('WebSocket 未知消息类型', { type: message.type });
  }
}

export function notifyTaskUpdate(taskId: string, update: {
  status: string;
  treeId?: string;
  error?: string;
  progress?: number;
  stage?: string;
  message?: string;
}) {
  const payload = JSON.stringify({
    type: 'task_update',
    taskId,
    ...update,
    timestamp: new Date().toISOString(),
  });

  for (const [clientId, client] of clients) {
    if (client.taskId === taskId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export function notifyProgressUpdate(userId: string, update: {
  treeId: string;
  nodeId: string;
  progress: number;
  status: string;
}) {
  const payload = JSON.stringify({
    type: 'progress_update',
    ...update,
    timestamp: new Date().toISOString(),
  });

  for (const [clientId, client] of clients) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export function notifyAchievement(userId: string, achievement: any) {
  const payload = JSON.stringify({
    type: 'achievement_earned',
    achievement,
    timestamp: new Date().toISOString(),
  });

  for (const [clientId, client] of clients) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function generateClientId(): string {
  return 'ws_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}
