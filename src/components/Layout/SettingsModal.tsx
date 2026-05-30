import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Trash2, Info, Github } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();

  const handleLogout = async () => {
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
      dispatch({ type: 'CLEAR_AUTH' });
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
                {/* 外观设置已移除，因为只有浅色模式 */}

                {/* 数据管理 */}
                <div className="space-y-2">
                  <div className="text-app-muted text-xs font-bold uppercase tracking-wider mb-2">数据管理</div>
                  {state.auth?.token && (
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between p-3 bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.3)] rounded-xl text-app-text hover:bg-[rgba(232,159,110,0.05)] hover:border-skill-core transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Info size={16} className="text-app-muted group-hover:text-skill-core transition-colors" />
                        <span className="text-sm font-medium">退出登录</span>
                      </div>
                    </button>
                  )}
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
                      <Github size={14} />
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
