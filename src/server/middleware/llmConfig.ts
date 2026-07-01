import { Request, Response, NextFunction } from 'express';
import type { RequestLlmConfig } from '../utils/llmConfigFactory';
import type { LLMProvider } from '../../types/backend';

const HEADER_NAME = 'x-llm-config';
const ALLOWED_PROVIDERS: LLMProvider[] = ['gemini', 'deepseek', 'siliconflow', 'qwen', 'ark', 'custom', 'dummy'];

function decodeBase64Json(raw: string): unknown | null {
  try {
    const jsonStr = Buffer.from(raw, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function sanitizeConfig(input: unknown): RequestLlmConfig | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const provider = String(raw.provider || '').toLowerCase() as LLMProvider;
  if (!ALLOWED_PROVIDERS.includes(provider)) return undefined;

  const out: RequestLlmConfig = { provider };

  if (typeof raw.apiKey === 'string' && raw.apiKey.trim()) {
    out.apiKey = raw.apiKey.trim().slice(0, 512);
  }
  if (typeof raw.baseUrl === 'string' && raw.baseUrl.trim()) {
    const url = raw.baseUrl.trim();
    if (/^https?:\/\//i.test(url)) {
      out.baseUrl = url.slice(0, 1024);
    }
  }
  if (typeof raw.model === 'string' && raw.model.trim()) {
    out.model = raw.model.trim().slice(0, 128);
  }

  return out;
}

export function parseLlmConfig(req: Request, _res: Response, next: NextFunction) {
  const header = req.header(HEADER_NAME);
  if (!header) {
    next();
    return;
  }

  const decoded = decodeBase64Json(header);
  const sanitized = sanitizeConfig(decoded);
  if (sanitized) {
    (req as any).llmConfig = sanitized;
  }
  next();
}

declare module 'express' {
  interface Request {
    llmConfig?: RequestLlmConfig;
  }
}
