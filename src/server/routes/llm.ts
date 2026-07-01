import { Router, Request, Response } from 'express';
import { createProviderFromConfig, type RequestLlmConfig } from '../utils/llmConfigFactory';
import { optionalAuth } from '../controllers/authController';
import { config } from '../config';
import type { LLMProvider } from '../../types/backend';

export const llmRouter = Router();

const ALLOWED_PROVIDERS: LLMProvider[] = ['gemini', 'deepseek', 'siliconflow', 'qwen', 'ark', 'custom', 'dummy'];

function sanitizeBody(body: any): RequestLlmConfig | null {
  if (!body || typeof body !== 'object') return null;
  const provider = String(body.provider || '').toLowerCase() as LLMProvider;
  if (!ALLOWED_PROVIDERS.includes(provider)) return null;
  const out: RequestLlmConfig = { provider };
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    out.apiKey = body.apiKey.trim().slice(0, 512);
  }
  if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
    const url = body.baseUrl.trim();
    if (/^https?:\/\//i.test(url)) out.baseUrl = url.slice(0, 1024);
  }
  if (typeof body.model === 'string' && body.model.trim()) {
    out.model = body.model.trim().slice(0, 128);
  }
  return out;
}

llmRouter.post('/test', optionalAuth, async (req: Request, res: Response) => {
  try {
    const cfg = sanitizeBody(req.body);
    if (!cfg) {
      return res.status(400).json({ success: false, error: '无效的 LLM 配置' });
    }

    if (cfg.provider === 'dummy') {
      return res.json({
        success: true,
        provider: 'dummy',
        message: 'Dummy provider 无需测试，始终可用',
      });
    }

    const provider = createProviderFromConfig(cfg);
    const probeMessages = [
      { role: 'system', content: '你是测试助手，请用一句话回复确认可用。' },
      { role: 'user', content: 'ping' },
    ];

    try {
      const response = await Promise.race([
        provider.chat(probeMessages as any),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('测试请求超时（15s）')), 15000);
        }),
      ]);
      const content = (response?.content || '').slice(0, 200);
      return res.json({
        success: true,
        provider: provider.getName(),
        model: response?.model || cfg.model || '',
        preview: content,
      });
    } catch (e) {
      return res.status(200).json({
        success: false,
        provider: provider.getName(),
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '测试失败',
    });
  }
});

llmRouter.get('/providers', (_req: Request, res: Response) => {
  res.json({
    providers: ALLOWED_PROVIDERS,
    defaults: {
      provider: config.llm.provider,
    },
  });
});
