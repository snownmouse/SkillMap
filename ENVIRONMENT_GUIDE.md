# SkillMap 配置与环境规范文档

## 1. 环境变量配置 (.env)

项目使用 `.env` 文件管理敏感信息和环境配置。请参考 `.env.example` 创建你的 `.env` 文件。

### 核心配置项说明：

| 变量名 | 描述 | 可选值 | 默认值 |
|---|---|---|---|
| `LLM_PROVIDER` | 当前使用的 AI 供应商 | `gemini`, `deepseek`, `siliconflow`, `qwen`, `dummy` | `dummy` |
| `PORT` | 服务器运行端口 | 数字 (如 3000) | `3000` |
| `DB_PATH` | SQLite 数据库存储路径 | 文件路径 | `./data/skillmap.db` |

### 供应商特定配置：

- **Gemini**: 需要 `GEMINI_API_KEY`。
- **DeepSeek**: 需要 `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`。
- **硅基流动 (SiliconFlow)**: 需要 `SILICONFLOW_API_KEY` 等。
- **模拟模式 (Dummy)**: 无需任何 Key，适合本地快速测试 UI 流程。

## 2. 数据库规范 (SQLite)

项目采用 SQLite 作为持久化层，无需安装额外的数据库服务。

- **初始化**: 服务器启动时会自动在 `data/` 目录下创建数据库文件并初始化表结构。
- **备份**: 直接复制 `data/skillmap.db` 文件即可完成备份。
- **清理**: 删除 `data/` 目录将重置所有用户数据。

## 3. API 调用规范

- **前缀**: 所有 API 请求均以 `/api` 开头。
- **技能树生成**: `POST /api/trees/generate`
- **对话接口**: `POST /api/trees/:treeId/chat`

## 4. 开发建议

- **本地测试**: 建议初始开发阶段将 `LLM_PROVIDER` 设为 `dummy`，以节省 API 额度并加快响应速度。
- **生产部署**: 确保 `NODE_ENV` 设为 `production`，并配置好真实的 API Key。
