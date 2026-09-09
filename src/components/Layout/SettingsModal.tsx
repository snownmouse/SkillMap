import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Trash2, Info, ExternalLink, User, LogOut, Key, Check, AlertCircle, Loader2, Zap } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { storage } from '../../services/storage';
import { llmConfigService, type LlmConfig } from '../../services/llmConfig';
import type { LLMProvider } from '../../types/backend';

const PROVIDER_OPTIONS: { value: LLMProvider; label: string; hint: string }[] = [
  { value: 'dummy', label: 'Dummy（无需配置，用于演示）', hint: '不调用真实 LLM，仅返回占位内容' },
  { value: 'gemini', label: 'Google Gemini', hint: '需要 Gemini API Key' },
  { value: 'deepseek', label: 'DeepSeek', hint: '需要 DeepSeek API Key' },
  { value: 'siliconflow', label: 'SiliconFlow', hint: '需要 SiliconFlow API Key' },
  { value: 'qwen', label: '通义千问 Qwen', hint: '需要 DashScope API Key' },
  { value: 'ark', label: '火山方舟 Ark', hint: '需要 Ark API Key' },
  { value: 'custom', label: '自定义（OpenAI 兼容）', hint: '需要 Base URL + API Key + 模型名' },
];

const PROVIDER_NEEDS_API_KEY: LLMProvider[] = ['gemini', 'deepseek', 'siliconflow', 'qwen', 'ark', 'custom'];
const PROVIDER_NEEDS_BASE_URL: LLMProvider[] = ['custom'];
const PROVIDER_NEEDS_MODEL: LLMProvider[] = ['custom', 'siliconflow', 'qwen', 'ark'];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const isLoggedIn = !!state.auth?.token && !!state.auth?.user;
  const userDisplayName = state.auth?.user?.displayName || state.auth?.user?.username || '';

  // ===== AI 模型配置状态 =====
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('dummy');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [llmSaved, setLlmSaved] = useState(false);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ success: boolean; message: string; preview?: string } | null>(null);
  const [llmDirty, setLlmDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const cfg = llmConfigService.get();
    if (cfg) {
      setLlmProvider(cfg.provider);
      setLlmApiKey(cfg.apiKey || '');
      setLlmBaseUrl(cfg.baseUrl || '');
      setLlmModel(cfg.model || '');
      setLlmSaved(true);
    } else {
      setLlmProvider('dummy');
      setLlmApiKey('');
      setLlmBaseUrl('');
      setLlmModel('');
      setLlmSaved(false);
    }
    setLlmDirty(false);
    setLlmTestResult(null);
  }, [isOpen]);

  const handleLlmFieldChange = () => {
    setLlmDirty(true);
    setLlmTestResult(null);
  };

  const buildCurrentConfig = (): LlmConfig => {
    const cfg: LlmConfig = { provider: llmProvider };
    if (PROVIDER_NEEDS_API_KEY.includes(llmProvider) && llmApiKey.trim()) cfg.apiKey = llmApiKey.trim();
    if (PROVIDER_NEEDS_BASE_URL.includes(llmProvider) && llmBaseUrl.trim()) cfg.baseUrl = llmBaseUrl.trim();
    if (PROVIDER_NEEDS_MODEL.includes(llmProvider) && llmModel.trim()) cfg.model = llmModel.trim();
    return cfg;
  };

  const handleLlmSave = () => {
    const cfg = buildCurrentConfig();
    llmConfigService.save(cfg);
    setLlmSaved(true);
    setLlmDirty(false);
    setLlmTestResult(null);
  };

  const handleLlmClear = () => {
    llmConfigService.clear();
    setLlmProvider('dummy');
    setLlmApiKey('');
    setLlmBaseUrl('');
    setLlmModel('');
    setLlmSaved(false);
    setLlmDirty(false);
    setLlmTestResult(null);
  };

  const handleLlmTest = async () => {
    setLlmTesting(true);
    setLlmTestResult(null);
    try {
      const cfg = buildCurrentConfig();
      const result = await llmConfigService.testConnection(cfg);
      setLlmTestResult(result);
    } finally {
      setLlmTesting(false);
    }
  };

  const needsApiKey = PROVIDER_NEEDS_API_KEY.includes(llmProvider);
  const needsBaseUrl = PROVIDER_NEEDS_BASE_URL.includes(llmProvider);
  const needsModel = PROVIDER_NEEDS_MODEL.includes(llmProvider);
  const providerHint = PROVIDER_OPTIONS.find(p => p.value === llmProvider)?.hint || '';

  const handleLogout = async () => {
    // 获取当前用户ID
    const currentUserId = state.auth?.user?.id;
    
    try {
      const token = state.auth?.token;
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
    } catch {
    } finally {
      // 清除所有可能的存储键（包括旧格式和新格式）
      try {
        // 清除旧键
        localStorage.removeItem('skillmap_state');
        // 清除新键
        if (currentUserId) {
          localStorage.removeItem(`skillmap_state:${currentUserId}`);
          localStorage.removeItem(`skillmap_pending_task:${currentUserId}`);
          localStorage.removeItem(`skillmap_last_tree_id:${currentUserId}`);
        }
        // 清除旧格式的待处理任务和最后技能树ID
        localStorage.removeItem('skillmap_pending_task');
        localStorage.removeItem('skillmap_last_tree_id');
      } catch (e) {
        console.warn('清除存储失败:', e);
      }
      
      // 强制刷新页面，确保 AppContext 重新初始化
      window.location.href = '/';
    }
  };

  const handleClearData = () => {
    if (window.confirm('确定要清除所有本地数据吗？这将删除所有生成的技能树和对话记录。')) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="min-h-full p-4 sm:p-6 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative my-8 w-full max-w-sm max-h-[85vh] bg-app-bg border border-[rgba(214,176,165,0.4)] rounded-[24px] shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-[rgba(214,176,165,0.2)] flex justify-between items-center">
                <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
                  设置
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-[rgba(214,176,165,0.15)] rounded-full text-app-muted transition-colors hover:text-app-text hover:rotate-90">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* 账号管理 */}
                <div className="space-y-2">
                  <div className="text-app-muted text-xs font-bold uppercase tracking-wider mb-2">账号</div>
                  
                  {isLoggedIn ? (
                    <>
                      {/* 已登录状态 */}
                      <div className="p-4 bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.3)] rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skill-core/10 text-skill-core">
                            <User size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-app-text truncate">{userDisplayName}</div>
                            <div className="text-xs text-app-muted">已登录</div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleLogout();
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.3)] rounded-xl text-app-text hover:bg-[rgba(232,159,110,0.05)] hover:border-skill-core transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <LogOut size={16} className="text-app-muted group-hover:text-skill-core transition-colors" />
                          <span className="text-sm font-medium">退出登录</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* 未登录状态 */}
                      <div className="p-4 bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.3)] rounded-xl text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-surface/50 text-app-muted mx-auto mb-3">
                          <User size={24} />
                        </div>
                        <p className="text-sm text-app-muted mb-3">登录后可以同步和保存你的技能树数据</p>
                      </div>
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/login');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-skill-core text-black border border-skill-core/20 rounded-xl hover:bg-skill-core/90 transition-colors group font-bold"
                  >
                    <User size={16} />
                    <span className="text-sm font-medium">登录账号</span>
                  </button>
                </>
                  )}
                </div>

                {/* 数据管理 */}
                <div className="space-y-2">
                  <div className="text-app-muted text-xs font-bold uppercase tracking-wider mb-2">数据管理</div>
                  <button
                    onClick={handleClearData}
                    className="w-full flex items-center justify-between p-3 bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.3)] rounded-xl text-app-text hover:bg-[rgba(232,159,110,0.05)] hover:border-skill-core transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 size={16} className="text-app-muted group-hover:text-skill-core transition-colors" />
                      <span className="text-sm font-medium">清除所有本地数据</span>
                    </div>
                  </button>
                </div>

                {/* AI 模型配置 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-app-muted text-xs font-bold uppercase tracking-wider">AI 模型配置</div>
                    {llmSaved && !llmDirty ? (
                      <span className="flex items-center gap-1 text-[10px] text-[#9CB4B3] font-medium">
                        <Check size={10} />
                        已启用浏览器配置
                      </span>
                    ) : (
                      <span className="text-[10px] text-app-muted/70">使用服务端默认</span>
                    )}
                  </div>

                  <div className="p-4 bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.3)] rounded-xl space-y-3">
                    <div className="flex items-start gap-2 text-[11px] text-app-muted leading-relaxed">
                      <Info size={12} className="mt-0.5 flex-shrink-0" />
                      <span>在此填写 API 配置后，前端会通过 <code className="px-1 py-0.5 bg-app-surface/60 rounded text-[10px]">X-LLM-Config</code> 请求头覆盖服务端默认配置，仅对当前浏览器生效，无需改 .env 或代码。</span>
                    </div>

                    {/* Provider 选择 */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-app-text">Provider</label>
                      <select
                        value={llmProvider}
                        onChange={(e) => {
                          setLlmProvider(e.target.value as LLMProvider);
                          handleLlmFieldChange();
                        }}
                        className="w-full px-3 py-2 text-sm bg-app-bg border border-[rgba(214,176,165,0.4)] rounded-lg text-app-text focus:outline-none focus:border-skill-core focus:ring-1 focus:ring-skill-core/30"
                      >
                        {PROVIDER_OPTIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-app-muted/80">{providerHint}</p>
                    </div>

                    {/* API Key */}
                    {needsApiKey && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-app-text flex items-center gap-1">
                          <Key size={11} />
                          API Key
                        </label>
                        <input
                          type="password"
                          value={llmApiKey}
                          onChange={(e) => { setLlmApiKey(e.target.value); handleLlmFieldChange(); }}
                          placeholder="sk-..."
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full px-3 py-2 text-sm bg-app-bg border border-[rgba(214,176,165,0.4)] rounded-lg text-app-text placeholder:text-app-muted/50 focus:outline-none focus:border-skill-core focus:ring-1 focus:ring-skill-core/30 font-mono"
                        />
                      </div>
                    )}

                    {/* Base URL */}
                    {needsBaseUrl && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-app-text">Base URL</label>
                        <input
                          type="url"
                          value={llmBaseUrl}
                          onChange={(e) => { setLlmBaseUrl(e.target.value); handleLlmFieldChange(); }}
                          placeholder="https://api.example.com/v1"
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full px-3 py-2 text-sm bg-app-bg border border-[rgba(214,176,165,0.4)] rounded-lg text-app-text placeholder:text-app-muted/50 focus:outline-none focus:border-skill-core focus:ring-1 focus:ring-skill-core/30 font-mono"
                        />
                      </div>
                    )}

                    {/* Model */}
                    {needsModel && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-app-text">模型名</label>
                        <input
                          type="text"
                          value={llmModel}
                          onChange={(e) => { setLlmModel(e.target.value); handleLlmFieldChange(); }}
                          placeholder="deepseek-chat / gpt-4o-mini / ..."
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full px-3 py-2 text-sm bg-app-bg border border-[rgba(214,176,165,0.4)] rounded-lg text-app-text placeholder:text-app-muted/50 focus:outline-none focus:border-skill-core focus:ring-1 focus:ring-skill-core/30 font-mono"
                        />
                      </div>
                    )}

                    {/* 测试结果 */}
                    {llmTestResult && (
                      <div className={`p-2.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-2 ${llmTestResult.success ? 'bg-[#9CB4B3]/10 text-[#9CB4B3] border border-[#9CB4B3]/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
                        {llmTestResult.success ? <Check size={12} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{llmTestResult.message}</div>
                          {llmTestResult.preview && (
                            <div className="mt-1 text-app-muted truncate italic">「{llmTestResult.preview}」</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 按钮组 */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleLlmSave}
                        disabled={!llmDirty}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-skill-core text-black rounded-lg hover:bg-skill-core/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Check size={12} />
                        {llmSaved && !llmDirty ? '已保存' : '保存'}
                      </button>
                      <button
                        onClick={handleLlmTest}
                        disabled={llmTesting}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-[rgba(214,176,165,0.2)] text-app-text rounded-lg hover:bg-[rgba(214,176,165,0.35)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {llmTesting ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                        测试连接
                      </button>
                      {llmSaved && (
                        <button
                          onClick={handleLlmClear}
                          className="flex items-center justify-center px-3 py-2 text-xs font-bold bg-transparent text-app-muted border border-[rgba(214,176,165,0.3)] rounded-lg hover:text-skill-core hover:border-skill-core transition-colors"
                          title="清除浏览器中保存的配置，恢复服务端默认"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 关于 */}
                <div className="space-y-2">
                  <div className="text-app-muted text-xs font-bold uppercase tracking-wider mb-2">关于 栖舟寻志</div>
                  <div className="p-4 bg-[rgba(255,250,240,0.6)] rounded-xl border border-[rgba(214,176,165,0.3)] space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-app-muted">版本</span>
                      <span className="text-app-text font-medium font-mono">v1.0.0-beta</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-app-muted">后端状态</span>
                      <span className="text-[#9CB4B3] flex items-center gap-1.5 font-medium">
                        <div className="w-1.5 h-1.5 bg-[#9CB4B3] rounded-full animate-pulse" />
                        已连接
                      </span>
                    </div>
                    <a
                      href="https://github.com/snownmouse/SkillMap-"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-skill-core hover:underline pt-3 mt-1 border-t border-[rgba(214,176,165,0.2)] font-medium"
                    >
                      <ExternalLink size={14} />
                      访问 GitHub 项目
                    </a>
                  </div>
                </div>
              </div>

              <div className="py-4 text-center text-[10px] text-app-muted/60 uppercase tracking-widest font-medium">
                栖舟寻志 © 2024
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  , document.body);
};

export default SettingsModal;
