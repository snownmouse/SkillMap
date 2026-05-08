# SkillMap API 文档

## 1. API 概述

SkillMap 提供了一组 RESTful API，用于实现技能树生成、对话交互、用户认证等功能。所有 API 请求均以 `/api` 开头，返回 JSON 格式的数据。

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Session Token（通过 `Authorization: Bearer <token>` 传递）
- **可选认证**: 部分接口支持 optionalAuth，无需登录即可访问

## 2. 认证 API

### 2.1 用户注册
- **端点**: `POST /api/auth/register`
- **描述**: 创建新用户账号
- **请求体**:
  ```json
  {
    "username": "your-name",
    "password": "password123",
    "displayName": "显示名称（可选）"
  }
  ```
- **响应**:
  ```json
  {
    "token": "token",
    "refreshToken": "refresh-token",
    "expiresAt": "2026-04-16T00:00:00.000Z",
    "refreshExpiresAt": "2026-04-23T00:00:00.000Z",
    "user": { "id": "user-id", "username": "your-name", "displayName": "显示名称" }
  }
  ```

### 2.2 用户登录
- **端点**: `POST /api/auth/login`
- **描述**: 用户登录
- **请求体**:
  ```json
  {
    "username": "your-name",
    "password": "password123"
  }
  ```
- **响应**:
  ```json
  {
    "token": "token",
    "refreshToken": "refresh-token",
    "expiresAt": "2026-04-16T00:00:00.000Z",
    "refreshExpiresAt": "2026-04-23T00:00:00.000Z",
    "user": { "id": "user-id", "username": "your-name", "displayName": "显示名称" }
  }
  ```

### 2.3 获取当前用户信息
- **端点**: `GET /api/auth/me`
- **描述**: 获取当前登录用户的信息
- **认证**: 必须
- **响应**:
  ```json
  {
    "user": { "id": "user-id", "username": "your-name", "displayName": "显示名称" }
  }
  ```

### 2.4 刷新 Token
- **端点**: `POST /api/auth/refresh`
- **描述**: 使用 refreshToken 换取新的 token
- **认证**: 不需要（由 refreshToken 完成校验）
- **请求体**:
  ```json
  {
    "refreshToken": "refresh-token"
  }
  ```
- **响应**:
  ```json
  {
    "token": "new-token",
    "refreshToken": "new-refresh-token",
    "expiresAt": "2026-04-16T00:00:00.000Z",
    "refreshExpiresAt": "2026-04-23T00:00:00.000Z",
    "user": { "id": "user-id", "username": "your-name", "displayName": "显示名称" }
  }
  ```

### 2.5 登出
- **端点**: `POST /api/auth/logout`
- **描述**: 用户登出
- **认证**: 可选（带 token 会清除对应 session）
- **响应**:
  ```json
  {
    "success": true
  }
  ```

### 2.6 转换临时用户
- **端点**: `POST /api/auth/convert-temp`
- **描述**: 将临时用户转换为正式用户
- **认证**: 必须
- **请求体**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "用户名"
  }
  ```

### 2.7 更新密码
- **端点**: `POST /api/auth/update-password`
- **描述**: 更新当前用户密码
- **认证**: 必须
- **请求体**:
  ```json
  {
    "oldPassword": "old-password",
    "newPassword": "new-password"
  }
  ```

## 3. 技能树 API

### 3.1 生成技能树
- **端点**: `POST /api/trees/generate`
- **描述**: 生成个性化技能树（异步任务）
- **认证**: 可选
- **请求体**:
  ```json
  {
    "major": "计算机科学",
    "career": "前端工程师",
    "level": "zero",
    "weeklyHours": 10,
    "notes": "零基础，希望转行前端",
    "existingSkills": ["基本计算机操作"]
  }
  ```
- **说明**:
  - `level`: 技能水平，可选值 `zero`(零基础)、`basic`(基础)、`intermediate`(中级)、`advanced`(高级)
  - `weeklyHours`: 每周学习时长（小时）
- **响应**:
  ```json
  {
    "taskId": "uuid-string"
  }
  ```

### 3.2 查询任务状态
- **端点**: `GET /api/trees/task/:taskId`
- **描述**: 查询技能树生成任务的状态
- **认证**: 可选
- **响应**:
  ```json
  {
    "taskId": "uuid-string",
    "status": "completed",
    "progress": 100,
    "phase": "生成完成",
    "result": { "id": "tree-uuid", "data": {} },
    "error": null,
    "createdAt": "2026-04-16T00:00:00Z",
    "updatedAt": "2026-04-16T00:01:00Z"
  }
  ```
- **兼容端点**: 也支持 `GET /api/tasks/:taskId`
- **status 状态值**:
  - `pending`: 等待处理
  - `in_progress`: 处理中
  - `completed`: 已完成
  - `failed`: 失败

### 3.3 取消任务
- **端点**: `POST /api/tasks/:taskId/cancel`
- **描述**: 取消正在进行的任务
- **认证**: 可选
- **响应**:
  ```json
  {
    "success": true
  }
  ```

### 3.4 获取技能树详情
- **端点**: `GET /api/trees/:id`
- **描述**: 获取技能树的详细信息
- **认证**: 可选（按当前用户/临时用户隔离）
- **响应**:
  ```json
  {
    "id": "tree-uuid",
    "career": "前端工程师",
    "summary": "技能树描述",
    "nodes": {},
    "edges": []
  }
  ```

### 3.6 获取所有技能树
- **端点**: `GET /api/trees`
- **描述**: 获取用户的所有技能树
- **认证**: 可选
- **响应**:
  ```json
  {
    "trees": [
      {
        "id": "tree-uuid",
        "career": "前端工程师",
        "created_at": "2026-04-16T00:00:00Z"
      }
    ]
  }
  ```

### 3.7 更新技能树
- **端点**: `PUT /api/trees/:id`
- **描述**: 更新指定技能树的数据
- **认证**: 可选
- **请求体**: 部分更新字段

### 3.8 删除技能树
- **端点**: `DELETE /api/trees/:id`
- **描述**: 删除指定的技能树
- **认证**: 可选
- **响应**:
  ```json
  {
    "success": true
  }
  ```

## 4. 对话 API

### 4.1 与技能节点对话
- **端点**: `POST /api/trees/:treeId/chat`
- **描述**: 与指定技能树的节点进行对话
- **认证**: 可选
- **请求体**:
  ```json
  {
    "nodeId": "node-1",
    "message": "我在学习HTML时遇到了问题"
  }
  ```
- **响应**:
  ```json
  {
    "reply": "AI回复内容",
    "progressUpdate": {
      "nodeId": "node-1",
      "newProgress": 20,
      "reason": "用户完成了基础学习"
    }
  }
  ```

### 4.2 获取对话历史
- **端点**: `GET /api/trees/:treeId/chat/:nodeId`
- **描述**: 获取指定技能树的对话历史
- **认证**: 可选
- **响应**:
  ```json
  {
    "messages": [
      {
        "id": "msg-uuid",
        "nodeId": "node-1",
        "role": "user",
        "content": "用户消息",
        "timestamp": "2026-04-16T00:00:00Z"
      }
    ]
  }
  ```

## 5. 职业规划 API

### 5.1 生成职业规划
- **端点**: `POST /api/careers/plan`
- **描述**: 生成个性化职业规划
- **认证**: 可选
- **请求体**:
  ```json
  {
    "major": "计算机科学",
    "career": "前端工程师",
    "level": "zero",
    "weeklyHours": 10,
    "notes": "零基础，希望转行前端",
    "existingSkills": ["基本计算机操作"]
  }
  ```
- **响应**:
  ```json
  {
    "targetCareer": "前端工程师",
    "paths": [
      {
        "id": "path-1",
        "name": "技术路线",
        "description": "专注于技术深度",
        "fitScore": 85,
        "steps": [
          {
            "career": "初级前端",
            "description": "掌握基础技能",
            "duration": "1年"
          }
        ]
      }
    ]
  }
  ```

## 6. 目标规划 API

### 6.1 生成“阉割/里程碑”成长计划
- **端点**: `POST /api/goals/plan`
- **描述**: 基于既有技能树生成多路径（tech/management/slash）成长计划，并在超过承载上限时输出裁剪节点及原因
- **认证**: 可选
- **请求体**:
  ```json
  {
    "treeId": "tree-uuid",
    "title": "成为前端工程师",
    "path": "tech",
    "maxNodes": 60,
    "weeklyHours": 10
  }
  ```

## 7. 调试与监控 API

### 7.1 健康检查
- **端点**: `GET /api/health`
- **描述**: 获取系统健康状态
- **响应**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-04-16T00:00:00Z",
    "version": "2.0.0",
    "metrics": {}
  }
  ```

### 7.2 系统指标
- **端点**: `GET /api/metrics`
- **描述**: 获取系统详细指标
- **响应**:
  ```json
  {
    "snapshot": {},
    "llmStats": {}
  }
  ```

### 7.3 获取 LLM 调用日志
- **端点**: `GET /api/debug/llm-logs`
- **描述**: 获取最近的 LLM 调用日志
- **认证**: 可选
- **说明**: `/api/debug/*` 仅在非 production 环境挂载
- **查询参数**:
  - `limit`: 返回数量，默认 50，最大 200

### 7.4 获取 LLM 统计信息
- **端点**: `GET /api/debug/llm-stats`
- **描述**: 获取 LLM 调用的详细统计

## 8. WebSocket API

### 8.1 连接
- **URL**: `ws://localhost:3000/ws`
- **描述**: 建立 WebSocket 连接

推荐在连接 URL 上携带身份信息：

```
ws://localhost:3000/ws?token=<token>&deviceId=<device-id>
```

### 8.2 认证消息
连接后也可发送认证消息（可选）：
```json
{
  "type": "auth",
  "token": "token"
}
```

### 8.3 订阅任务进度
```json
{
  "type": "subscribe_task",
  "taskId": "uuid-string"
}
```

## 9. API 响应格式

当前 API 未强制统一 envelope，常见形态如下：

### 8.1 成功响应
- 直接返回业务数据（例如 `GET /api/trees` 返回 `{ trees: [...] }`）
- 或返回 `{ success: true }`（例如删除/登出）

### 8.2 错误响应
```json
{
  "error": "错误信息"
}
```

## 10. 状态码

| 状态码 | 描述 |
|--------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 11. 认证机制

SkillMap 使用 token 进行认证。登录成功后，服务器会返回 token，客户端需要在后续的请求中在请求头中携带此 token：

```
Authorization: Bearer token
```
