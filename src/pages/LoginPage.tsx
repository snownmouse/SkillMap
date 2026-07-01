import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CONFIG } from '../config';
import { storage } from '../services/storage';

interface LoginPageProps {
  onLogin?: (token: string, user: { id: string; username: string; displayName: string }) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { dispatch } = useAppContext();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { username, password, displayName: displayName || username }
        : { username, password };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
          credentials: 'include',
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || '操作失败');
          return;
        }

        if (onLogin) {
          onLogin(data.token, data.user);
        } else {
          const authState = {
            token: data.token,
            refreshToken: data.refreshToken,
            user: data.user
          };
          
          // 保存到新存储位置（使用用户ID）
          storage.save({
            auth: authState,
            skillTree: null,
            chatSessions: {},
            activeNodeId: null,
            nodeDetailsCache: {}
          });
          
          dispatch({ type: 'SET_AUTH', payload: authState });
        }
        navigate(isRegister ? '/generate' : '/tree');
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          setError('请求超时，请检查网络后重试');
        } else {
          setError('网络错误，请稍后重试');
        }
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center bg-skill-core/10 rounded-2xl border border-skill-core/20 mb-4 shadow-sm">
            <span className="text-3xl">🗺️</span>
          </div>
          <h1 className="text-4xl font-black text-app-text tracking-tight">
            Skill<span className="text-skill-core">Map</span>
          </h1>
          <p className="mt-2 text-app-muted">
            {isRegister ? '创建账号，保存你的成长数据' : '登录账号，继续你的成长之旅'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-app-text mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-app-surface border border-app-border rounded-xl text-app-text placeholder-app-muted/50 focus:outline-none focus:border-skill-core/50 focus:ring-1 focus:ring-skill-core/30 transition-all shadow-sm"
              placeholder="输入用户名"
              required
              minLength={2}
              maxLength={20}
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-app-text mb-2">显示名称</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-app-surface border border-app-border rounded-xl text-app-text placeholder-app-muted/50 focus:outline-none focus:border-skill-core/50 focus:ring-1 focus:ring-skill-core/30 transition-all shadow-sm"
                placeholder="你希望怎么被称呼（可选）"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-app-text mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-app-surface border border-app-border rounded-xl text-app-text placeholder-app-muted/50 focus:outline-none focus:border-skill-core/50 focus:ring-1 focus:ring-skill-core/30 transition-all shadow-sm"
              placeholder={isRegister ? `至少${CONFIG.SECURITY.PASSWORD_MIN_LENGTH}位密码` : '输入密码'}
              required
              minLength={CONFIG.SECURITY.PASSWORD_MIN_LENGTH}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-skill-core text-black rounded-xl font-bold text-lg hover:bg-skill-core/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: 'inset 0px 0px 0px 0px rgba(0, 0, 0, 0.25), inset 0px 0px 0px 0px rgba(0, 0, 0, 0.25), inset 0px 0px 0px 0px rgba(0, 0, 0, 0.25), 0px 0px 0px 0px rgba(0, 0, 0, 0.25), 0px 10px 15px -3px rgba(0, 0, 0, 0.25), inset 0px 4px 6px -4px rgba(0, 0, 0, 0.25)' }}
          >
            {loading ? '请稍候...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="w-full text-app-muted hover:text-skill-core transition-colors text-sm"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
