/**
 * 本地存储封装
 */
const STORAGE_KEY = 'skillmap_state';

export const storage = {
  save(state: any) {
    try {
      // 排除临时状态
      const { isGenerating, isChatLoading, error, ...persistentState } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentState));
    } catch (e) {
      console.warn('无法保存到 localStorage:', e);
    }
  },

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('无法从 localStorage 加载:', e);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
