/**
 * 本地存储封装
 */
const STORAGE_KEY = 'skillmap_state';
const LEGACY_LAST_TREE_ID_KEY = 'skillmap_last_tree_id';
const LAST_TREE_ID_PREFIX = 'skillmap_last_tree_id:';
const PENDING_TASK_KEY = 'skillmap_pending_task';

interface PendingTaskState {
  taskId: string;
  career?: string;
  createdAt: string;
}

export const storage = {
  save(state: any) {
    try {
      // 排除临时状态
      const { isGenerating, isChatLoading, error, authHydrated, ...persistentState } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentState));
      if (persistentState.skillTree?.id) {
        const userId = persistentState.auth?.user?.id || null;
        this.saveLastTreeId(persistentState.skillTree.id, userId);
      }
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
    localStorage.removeItem(LEGACY_LAST_TREE_ID_KEY);
    localStorage.removeItem(PENDING_TASK_KEY);
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(LAST_TREE_ID_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch (e) {
      console.warn('无法清除最近技能树缓存:', e);
    }
  },

  getCurrentUserId() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const state = JSON.parse(stored);
      return state?.auth?.user?.id || null;
    } catch {
      return null;
    }
  },

  getLastTreeIdKey(userId?: string | null) {
    const resolvedUserId = userId ?? this.getCurrentUserId();
    return resolvedUserId ? `${LAST_TREE_ID_PREFIX}${resolvedUserId}` : null;
  },

  saveLastTreeId(treeId: string, userId?: string | null) {
    try {
      const scopedKey = this.getLastTreeIdKey(userId);
      if (scopedKey) {
        localStorage.setItem(scopedKey, treeId);
        return;
      }
      localStorage.setItem(LEGACY_LAST_TREE_ID_KEY, treeId);
    } catch (e) {
      console.warn('无法保存最近技能树 ID:', e);
    }
  },

  loadLastTreeId(userId?: string | null) {
    try {
      const scopedKey = this.getLastTreeIdKey(userId);
      if (scopedKey) {
        return localStorage.getItem(scopedKey);
      }
      return localStorage.getItem(LEGACY_LAST_TREE_ID_KEY);
    } catch (e) {
      console.warn('无法加载最近技能树 ID:', e);
      return null;
    }
  },

  clearLastTreeId(userId?: string | null) {
    try {
      const scopedKey = this.getLastTreeIdKey(userId);
      if (scopedKey) {
        localStorage.removeItem(scopedKey);
        return;
      }
      localStorage.removeItem(LEGACY_LAST_TREE_ID_KEY);
    } catch (e) {
      console.warn('无法清除最近技能树 ID:', e);
    }
  },

  savePendingTask(task: PendingTaskState) {
    try {
      localStorage.setItem(PENDING_TASK_KEY, JSON.stringify(task));
    } catch (e) {
      console.warn('无法保存待处理任务:', e);
    }
  },

  loadPendingTask(): PendingTaskState | null {
    try {
      const data = localStorage.getItem(PENDING_TASK_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('无法加载待处理任务:', e);
      return null;
    }
  },

  clearPendingTask() {
    try {
      localStorage.removeItem(PENDING_TASK_KEY);
    } catch (e) {
      console.warn('无法清除待处理任务:', e);
    }
  }
};
