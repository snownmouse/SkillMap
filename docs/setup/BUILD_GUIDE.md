# SkillMap 构建与部署指南

## 1. 构建指南

### 1.1 开发环境构建

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 1.2 生产环境构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 1.3 构建产物

构建完成后，产物将生成在 `dist` 目录中，包括：
- 静态 HTML 文件
- 打包后的 JavaScript 文件
- 优化后的 CSS 文件
- 其他静态资源

## 2. 依赖管理

### 2.1 核心依赖

- **前端框架**: React 19, React DOM 19
- **路由**: React Router v7
- **样式**: Tailwind CSS v4
- **图谱渲染**: Cytoscape.js
- **动画**: Motion
- **后端**: Express, Node.js
- **数据库**: SQLite (better-sqlite3), PostgreSQL (pg)
- **AI 集成**: 火山引擎 Ark, 硅基流动, DeepSeek 等
- **工具链**: TypeScript, Vite, tsx

### 2.2 依赖更新

```bash
# 检查过时的依赖
npm outdated

# 更新依赖到最新版本
npm update

# 更新到新主要版本（谨慎使用）
npm install package@latest
```

## 3. 部署

### 3.1 服务器要求

- **操作系统**: Linux (Ubuntu 20.04+), macOS, Windows Server
- **Node.js**: 20.0.0 或更高版本
- **内存**: 建议 2GB 以上
- **磁盘**: 建议 10GB 以上

### 3.2 部署步骤

1. **代码部署**:
   ```bash
   git clone <repository-url>
   cd skillmap
   npm install
   ```

2. **环境配置**:
   ```bash
   cp .env.example .env
   # 编辑 .env 填写必要的配置
   ```

3. **生产构建**:
   ```bash
   npm run build
   ```

4. **启动服务**:
   ```bash
   # 使用 PM2 管理进程
   npm install -g pm2
   pm2 start npm --name "skillmap" -- run start

   # 或使用 nohup
   nohup npm run start > app.log 2>&1 &
   ```

5. **配置反向代理**: 配置 Nginx 或其他反向代理服务器

### 3.3 Docker Compose 部署（推荐）

仓库提供 `docker-compose.yml`，会启动 Postgres + Redis + 应用服务：

```bash
docker compose up --build
```

## 4. 性能优化

### 4.1 前端优化

- **代码分割**: 使用动态导入减少初始加载时间
- **资源压缩**: Vite 生产构建自动压缩
- **缓存策略**: 合理配置静态资源缓存
- **CDN 加速**: 考虑使用 CDN 分发静态资源

### 4.2 后端优化

- **数据库索引**: 确保常用查询字段有索引
- **连接池**: 合理配置数据库连接池大小
- **缓存**: 对频繁访问的数据使用缓存
- **异步处理**: 使用任务队列处理耗时操作

### 4.3 LLM 优化

- **提供商选择**: 根据延迟和成本选择合适的 Provider
- **缓存响应**: 对相同请求缓存响应结果
- **熔断机制**: 配置好主备 Provider 切换

## 5. 备份策略

### 5.1 SQLite 备份

```bash
# 复制数据库文件
cp data/skillmap.db data/backup/skillmap-$(date +%Y%m%d).db
```

### 5.2 PostgreSQL 备份

```bash
# 使用 pg_dump
pg_dump -U postgres skillmap > backup-$(date +%Y%m%d).sql
```

## 6. 监控

### 6.1 进程监控

使用 PM2:
```bash
pm2 list
pm2 logs skillmap
pm2 restart skillmap
```

### 6.2 健康检查

```bash
curl http://localhost:3000/api/health
```

### 6.3 指标监控

```bash
curl http://localhost:3000/api/metrics
```

## 7. 扩展开发

### 7.1 添加新功能

- **前端组件**: 在 `src/components/` 目录中添加新组件
- **API 路由**: 在 `src/server/routes/` 目录中添加新路由
- **LLM 提供商**: 在 `src/server/llmProviders/` 目录中添加新提供商

### 7.2 添加新页面

1. 在 `src/pages/` 目录创建新页面组件
2. 在 `src/App.tsx` 中添加路由配置

### 7.3 添加新 API

1. 在对应的 Controller 中添加处理函数
2. 在 `src/server/routes/` 中添加路由配置
3. 更新 API 文档

## 8. 故障排查

### 8.1 构建失败

| 问题 | 解决方案 |
|------|----------|
| TypeScript 编译错误 | 运行 `npm run lint` 查看具体错误 |
| 依赖安装失败 | 删除 `node_modules` 和 `package-lock.json`，重新安装 |
| 内存不足 | 增加 Node.js 内存限制: `NODE_OPTIONS=--max-old-space-size=4096` |

### 8.3 数据库迁移相关

```bash
npm run db:migrate
npm run db:status
MIGRATE_DOWN_STEPS=1 npm run db:rollback
```

### 8.2 运行时问题

| 问题 | 解决方案 |
|------|----------|
| 服务启动失败 | 检查端口是否被占用，查看日志 |
| 数据库连接失败 | 检查 `DB_HOST` 配置和数据库服务状态 |
| 前端资源加载失败 | 检查 `dist` 目录是否正确生成，配置好静态文件服务 |
