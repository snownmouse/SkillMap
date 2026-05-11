# SkillMap WebSocket 指南

## 1. 概述

SkillMap 使用 WebSocket 实现实时双向通信，支持技能树生成进度推送、对话实时回复等功能。

## 2. 连接方式

### 2.1 建立连接

```javascript
const ws = new WebSocket('ws://localhost:3000/ws?deviceId=your-device-id');
```

### 2.2 连接状态

```javascript
ws.onopen = () => {
  console.log('WebSocket 已连接');
};

ws.onclose = () => {
  console.log('WebSocket 已断开');
};

ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};
```

## 3. 认证

推荐在连接 URL 上携带 token（已登录用户）或 deviceId（临时用户）。连接后也可发送认证消息（可选）：

```javascript
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'token'
  }));
};
```

## 4. 消息格式

### 4.1 客户端发送消息

#### 认证消息
```json
{
  "type": "auth",
  "token": "token"
}
```

#### 订阅任务进度
```json
{
  "type": "subscribe_task",
  "taskId": "uuid-string"
}
```

#### 取消订阅
```json
{
  "type": "unsubscribe_task"
}
```

### 4.2 服务端推送消息

#### 连接确认
```json
{
  "type": "connected",
  "clientId": "ws_xxx"
}
```

#### 任务更新
```json
{
  "type": "task_update",
  "taskId": "uuid-string",
  "status": "in_progress",
  "progress": 50,
  "phase": "准备生成",
  "timestamp": "2026-04-16T00:00:00Z"
}
```

#### 错误通知
```json
{
  "type": "error",
  "message": "错误描述"
}
```

注：当前 WebSocket 主要用于任务进度推送；对话实时推送未作为稳定能力对外承诺。

## 5. 前端 Hook

项目提供了 `useWebSocket` Hook 简化 WebSocket 使用：

```typescript
import { useWebSocket } from './hooks/useWebSocket';

function MyComponent() {
  const {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe
  } = useWebSocket();

  const handleSubscribe = () => {
    subscribe('task-id-123');
  };

  return (
    <div>
      <p>连接状态: {isConnected ? '已连接' : '未连接'}</p>
      <button onClick={handleSubscribe}>订阅任务</button>
    </div>
  );
}
```

## 6. 使用场景

### 6.1 技能树生成进度

```typescript
// 订阅任务进度
subscribe(taskId);

// 监听进度更新
useEffect(() => {
  if (lastMessage?.type === 'task_progress') {
    setProgress(lastMessage.progress);
  }
}, [lastMessage]);
```

### 6.2 实时对话

```typescript
// 订阅对话消息
subscribe(`chat:${treeId}:${nodeId}`);

// 监听新消息
useEffect(() => {
  if (lastMessage?.type === 'chat_message') {
    addMessage(lastMessage.content);
  }
}, [lastMessage]);
```

## 7. 断线重连

建议实现断线重连机制：

```typescript
const reconnect = () => {
  const timer = setTimeout(() => {
    connect();
    timer = null;
  }, 3000);
};

ws.onclose = () => {
  reconnect();
};
```

## 8. 注意事项

- WebSocket 连接需要在 HTTPS 环境下使用（生产环境）
- 确保 token 有效期足够长
- 合理使用订阅/取消订阅避免资源浪费
- 处理网络波动时的重连逻辑
