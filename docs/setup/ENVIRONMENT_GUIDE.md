# SkillMap 环境配置指南

## 1. 环境变量配置 (.env)

项目使用 `.env` 文件管理敏感信息和环境配置。请参考 `.env.example` 创建你的 `.env` 文件。

### 核心配置项说明

| 变量名 | 描述 | 可选值 | 默认值 |
|--------|------|--------|--------|
| `LLM_PROVIDER` | 当前使用的 AI 供应商 | `gemini`, `deepseek`, `siliconflow`, `qwen`, `ark`, `custom`, `dummy` | `dummy` |
| `PORT` | 服务器运行端口 | 数字 (如 3000) | `3000` |
| `NODE_ENV` | 运行环境 | `development`, `production` | `development` |
| `LLM_TEMPERATURE` | LLM 生成温度参数 | 0.0-2.0 | `0.3` |
| `LLM_MAX_TOKENS` | LLM 最大生成 token 数 | 数字 | `65536` |

### 数据库配置

| 变量名 | 描述 | 可选值 | 默认值 |
|--------|------|--------|--------|
| `DB_PATH` | SQLite 数据库路径 | 文件路径 | `./data/skillmap.db` |
| `DB_HOST` | PostgreSQL 主机 | 主机地址 | 未设置则使用 SQLite |
| `DB_PORT` | PostgreSQL 端口 | 数字 | `5432` |
| `DB_NAME` | PostgreSQL 数据库名 | 字符串 | `skillmap` |
| `DB_USER` | PostgreSQL 用户名 | 字符串 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 密码 | 字符串 | - |
| `DB_MAX_CONNECTIONS` | 最大连接数 | 数字 | `20` |
| `REDIS_URL` | Redis 连接字符串（用于缓存） | 如 `redis://localhost:6379` | 未设置则降级为内存缓存 |
| `SSR` | 生产环境是否启用 SSR | `true` / `false` | `false` |
| `ALLOW_LEGACY_DEFAULT_USER` | 是否允许临时用户读取历史 `user_id=default` 数据 | `true` / `false` | `false` |

### 数据库切换逻辑

```
NODE_ENV=staging|production -> 强制 PostgreSQL（必须配置 DB_HOST 等参数）
其他环境：
  DB_HOST 未设置或为空 -> SQLite
  DB_HOST=localhost      -> SQLite
  DB_HOST 为其他主机名   -> PostgreSQL
```

## 2. LLM 供应商配置

### Ark (火山引擎) - 默认主提供商

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `ARK_API_KEY` | Ark API Key | `your-ark-api-key` |
| `ARK_BASE_URL` | Ark API 地址 | `https://ark.cn-beijing.volces.com/api/v3` |
| `ARK_MODEL` | 模型名称 | `doubao-seed-2-0-lite-260215` |

### SiliconFlow (硅基流动) - 默认备用提供商

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `SILICONFLOW_API_KEY` | SiliconFlow API Key | `your-sf-api-key` |
| `SILICONFLOW_BASE_URL` | API 地址 | `https://api.siliconflow.cn/v1` |
| `SILICONFLOW_MODEL` | 模型名称 | `deepseek-ai/DeepSeek-V3` |

### DeepSeek

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `your-deepseek-api-key` |
| `DEEPSEEK_BASE_URL` | API 地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名称 | `deepseek-chat` |

### Qwen (通义千问)

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `QWEN_API_KEY` | Qwen API Key | `your-qwen-api-key` |
| `QWEN_BASE_URL` | API 地址 | `https://dashscope.aliyuncs.com/compatible-mode` |
| `QWEN_MODEL` | 模型名称 | `qwen-plus` |

### Gemini

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API Key | `your-gemini-api-key` |

### Custom (自定义 OpenAI 兼容接口)

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `CUSTOM_LLM_API_KEY` | API Key | `your-custom-api-key` |
| `CUSTOM_LLM_BASE_URL` | API 地址 | `https://your-custom-api.com` |
| `CUSTOM_LLM_MODEL` | 模型名称 | `your-model` |

### Dummy (模拟模式)

不需要任何 API Key，提供固定的模拟响应，适合本地快速测试 UI 流程。在生产环境中不应使用。

## 3. LLM 通用参数

- `LLM_TEMPERATURE`: 控制生成的随机性，较低的值使输出更确定性，较高值使输出更随机。默认 `0.3`
- `LLM_MAX_TOKENS`: 生成内容的最大 token 数量。默认 `65536`

## 4. 数据库规范

### 4.1 SQLite

项目采用 SQLite 作为默认持久化层：

- **初始化**: 服务器启动时会自动在 `data/` 目录下创建数据库文件并初始化表结构
- **备份**: 直接复制 `data/skillmap.db` 文件即可完成备份
- **清理**: 删除 `data/` 目录将重置所有用户数据
- **迁移**: 启动时自动执行版本化迁移（schema_migrations）；也可使用 `npm run db:migrate` 手动执行

### 4.2 PostgreSQL

适合高并发和生产环境：

- 需要预先创建数据库
- 支持连接池
- 需要配置连接参数
- **迁移**: 启动时自动执行版本化迁移；也可使用 `npm run db:migrate` / `npm run db:rollback`

## 5. 开发建议

### 5.1 本地开发
- 建议初始开发阶段将 `LLM_PROVIDER` 设为 `dummy`，以节省 API 额度并加快响应速度
- 使用 SQLite 数据库配置更简单

### 5.2 前端运行时配置（无需改 .env）

如果只是想让单个浏览器使用自己的 API Key，不必修改 `.env` 或重启服务：

1. 在网页右上角点击「设置」打开设置弹窗
2. 找到「AI 模型配置」区块，选择供应商（gemini / deepseek / siliconflow / qwen / ark / custom / dummy）
3. 填入 API Key、Base URL（可选）、Model（可选），点击「保存」
4. 点击「测试连接」可验证配置是否可用

配置仅保存在当前浏览器的 `localStorage` 中，每次请求通过 `X-LLM-Config` HTTP 头传给后端，**优先级高于 `.env` 中的默认值**，且只对当前浏览器生效。清除浏览器数据或点击设置中的「清除配置」即可恢复默认。

### 5.3 生产部署
- 确保 `NODE_ENV` 设为 `production`
- 配置好真实的 API Key
- `production/staging` 会强制使用 PostgreSQL
- 如果配置了 `REDIS_URL`，缓存会落到 Redis；未配置时会自动降级为内存缓存

### 5.4 代码风格
- 遵循 TypeScript 最佳实践
- 使用 TypeScript compiler 进行类型检查 (`npm run lint`)

## 6. 故障排查

### 6.1 常见问题

| 问题 | 解决方案 |
|------|----------|
| API Key 错误 | 检查 `.env` 文件中的 API Key 是否正确配置 |
| 数据库连接失败 | 确保 `data/` 目录存在且有写入权限（SQLite）或 PostgreSQL 服务运行正常 |
| 端口占用 | 检查 `PORT` 配置是否与其他服务冲突 |
| LLM 响应超时 | 检查网络连接或切换到备用 Provider |
| 模型失败 | 切换 `LLM_PROVIDER`，如从 `ark` 切换到 `deepseek` |

### 6.2 日志查看
- 服务器日志会输出到控制台
- 可根据需要配置更详细的日志记录

### 6.3 快速回滚配置
如果配置出错导致服务不可用：

1. 切换 LLM Provider（`LLM_PROVIDER=dummy`）
2. 恢复 `.env` 到可信版本
3. 重启服务 (`npm run dev`)
