import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Clock, Zap, AlertCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

interface LLMLogEntry {
  id: string;
  provider: string;
  model: string;
  apiType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface LLMStats {
  total: number;
  successes: number;
  failures: number;
  avgLatency: number;
  totalTokens: number;
}

interface DevToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DevToolsPanel: React.FC<DevToolsPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LLMLogEntry[]>([]);
  const [stats, setStats] = useState<LLMStats | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/debug/llm-logs?limit=50');
      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('[DevTools] 获取日志失败:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchLogs();
  }, [isOpen, fetchLogs]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchLogs]);

  if (!isOpen) return null;

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col" style={{ height: '360px' }}>
      <div className="flex-1 bg-[#1a1a2e] border-t border-dark-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-dark-surface border-b border-dark-border shrink-0">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-skill-core" />
            <span className="text-sm font-bold text-dark-text">API 调用监控</span>
            {stats && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-dark-muted">
                  调用 <span className="text-dark-text font-mono">{stats.total}</span>
                </span>
                <span className="text-green-400">
                  ✓ {stats.successes}
                </span>
                {stats.failures > 0 && (
                  <span className="text-red-400">
                    ✗ {stats.failures}
                  </span>
                )}
                <span className="text-dark-muted">
                  平均 <span className="text-dark-text font-mono">{formatLatency(stats.avgLatency)}</span>
                </span>
                <span className="text-dark-muted">
                  Tokens <span className="text-dark-text font-mono">{stats.totalTokens.toLocaleString()}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                autoRefresh ? 'text-skill-core bg-skill-core/10' : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
              自动
            </button>
            <button onClick={fetchLogs} className="p-1.5 text-dark-muted hover:text-dark-text transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 text-dark-muted hover:text-dark-text transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-dark-surface text-dark-muted">
              <tr>
                <th className="text-left px-3 py-1.5 font-medium">时间</th>
                <th className="text-left px-3 py-1.5 font-medium">供应商</th>
                <th className="text-left px-3 py-1.5 font-medium">模型</th>
                <th className="text-left px-3 py-1.5 font-medium">API</th>
                <th className="text-right px-3 py-1.5 font-medium">延迟</th>
                <th className="text-right px-3 py-1.5 font-medium">输入</th>
                <th className="text-right px-3 py-1.5 font-medium">输出</th>
                <th className="text-right px-3 py-1.5 font-medium">总Tokens</th>
                <th className="text-center px-3 py-1.5 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-dark-muted">
                    暂无 API 调用记录，发起对话后将在此显示
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-b border-dark-border/50 cursor-pointer hover:bg-dark-surface/50 ${
                        !log.success ? 'bg-red-500/5' : ''
                      }`}
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <td className="px-3 py-1.5 text-dark-muted font-mono">
                        <span className="inline-flex items-center gap-1">
                          {expandedLog === log.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          {formatTime(log.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-dark-text">{log.provider}</td>
                      <td className="px-3 py-1.5 text-dark-text font-mono max-w-[180px] truncate" title={log.model}>
                        {log.model}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.apiType === 'responses' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.apiType}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        <span className={log.latencyMs > 10000 ? 'text-yellow-400' : log.latencyMs > 30000 ? 'text-red-400' : 'text-dark-text'}>
                          {formatLatency(log.latencyMs)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-dark-muted">{log.promptTokens}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-dark-muted">{log.completionTokens}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-dark-text">{log.totalTokens}</td>
                      <td className="px-3 py-1.5 text-center">
                        {log.success ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-red-400" title={log.errorMessage || undefined}>✗</span>
                        )}
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr>
                        <td colSpan={9} className="px-3 py-2 bg-dark-bg/50">
                          <div className="space-y-1">
                            <div className="flex gap-4 text-[11px]">
                              <span className="text-dark-muted">ID: <span className="text-dark-text font-mono">{log.id}</span></span>
                              <span className="text-dark-muted">创建时间: <span className="text-dark-text">{new Date(log.createdAt).toLocaleString('zh-CN')}</span></span>
                            </div>
                            {log.errorMessage && (
                              <div className="text-[11px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                                <AlertCircle size={12} className="inline mr-1" />
                                {log.errorMessage}
                              </div>
                            )}
                            <div className="flex gap-4 text-[11px]">
                              <span className="text-dark-muted">输入 Tokens: <span className="text-dark-text font-mono">{log.promptTokens}</span></span>
                              <span className="text-dark-muted">输出 Tokens: <span className="text-dark-text font-mono">{log.completionTokens}</span></span>
                              <span className="text-dark-muted">延迟: <span className="text-dark-text font-mono">{formatLatency(log.latencyMs)}</span></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DevToolsPanel;
