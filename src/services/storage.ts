/**
 * 本地存储封装
 */
const STORAGE_KEY_PREFIX = 'skillmap_state:';
const LEGACY_STORAGE_KEY = 'skillmap_state';
const LEGACY_LAST_TREE_ID_KEY = 'skillmap_last_tree_id';
const LAST_TREE_ID_PREFIX = 'skillmap_last_tree_id:';
const PENDING_TASK_KEY_PREFIX = 'skillmap_pending_task:';

interface PendingTaskState {
  taskId: string;
  career?: string;
  createdAt: string;
}

export const storage = {
  // 获取当前用户 ID 的辅助方法（用于键生成）
  _getCurrentUserIdFromState(state: any): string | null {
    return state?.auth?.user?.id || null;
  },

  getStorageKey(userId?: string | null): string {
    const resolvedUserId = userId || this.getCurrentUserId();
    return resolvedUserId ? `${STORAGE_KEY_PREFIX}${resolvedUserId}` : LEGACY_STORAGE_KEY;
  },

  getPendingTaskKey(userId?: string | null): string {
    const resolvedUserId = userId || this.getCurrentUserId();
    return resolvedUserId ? `${PENDING_TASK_KEY_PREFIX}${resolvedUserId}` : 'skillmap_pending_task';
  },

  save(state: any) {
    try {
      // 排除临时状态
      const { isGenerating, isChatLoading, error, authHydrated, ...persistentState } = state;
      const userId = this._getCurrentUserIdFromState(persistentState);
      const storageKey = this.getStorageKey(userId);
      
      localStorage.setItem(storageKey, JSON.stringify(persistentState));
      
      if (persistentState.skillTree?.id) {
        this.saveLastTreeId(persistentState.skillTree.id, userId);
      }
    } catch (e) {
      console.warn('无法保存到 localStorage:', e);
    }
  },

  load(userId?: string | null) {
    try {
      const storageKey = this.getStorageKey(userId);
      let data = localStorage.getItem(storageKey);
      
      // 如果新键没有数据，尝试从旧键迁移
      if (!data && !userId) {
        data = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (data) {
          const parsedData = JSON.parse(data);
          const migratedUserId = this._getCurrentUserIdFromState(parsedData);
          if (migratedUserId) {
            // 迁移数据到用户专属键
            localStorage.setItem(this.getStorageKey(migratedUserId), data);
          }
        }
      }
      
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('无法从 localStorage 加载:', e);
      return null;
    }
  },

  clear(userId?: string | null) {
    try {
      const storageKey = this.getStorageKey(userId);
      const pendingTaskKey = this.getPendingTaskKey(userId);
      
      localStorage.removeItem(storageKey);
      localStorage.removeItem(LEGACY_LAST_TREE_ID_KEY);
      localStorage.removeItem(pendingTaskKey);
      
      // 清除该用户的 last_tree_id
      this.clearLastTreeId(userId);
      
      // 如果没有指定用户，清除所有旧数据
      if (!userId) {
        try {
          Object.keys(localStorage)
            .filter((key) => key.startsWith(LAST_TREE_ID_PREFIX) || key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(PENDING_TASK_KEY_PREFIX))
            .forEach((key) => localStorage.removeItem(key));
        } catch (e) {
          console.warn('无法清除全部缓存:', e);
        }
      }
    } catch (e) {
      console.warn('无法清除存储:', e);
    }
  },

  getCurrentUserId() {
    try {
      // 先尝试从旧键获取（这是最常见的场景）
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        if (state?.auth?.user?.id) {
          return state.auth.user.id;
        }
      }
      
      // 如果旧键没有，尝试从新键获取
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const state = JSON.parse(stored);
            if (state?.auth?.user?.id) {
              return state.auth.user.id;
            }
          }
        }
      }
      
      return null;
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

  savePendingTask(task: PendingTaskState, userId?: string | null) {
    try {
      const pendingTaskKey = this.getPendingTaskKey(userId);
      localStorage.setItem(pendingTaskKey, JSON.stringify(task));
    } catch (e) {
      console.warn('无法保存待处理任务:', e);
    }
  },

  loadPendingTask(userId?: string | null): PendingTaskState | null {
    try {
      const pendingTaskKey = this.getPendingTaskKey(userId);
      const data = localStorage.getItem(pendingTaskKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('无法加载待处理任务:', e);
      return null;
    }
  },

  clearPendingTask(userId?: string | null) {
    try {
      const pendingTaskKey = this.getPendingTaskKey(userId);
      localStorage.removeItem(pendingTaskKey);
    } catch (e) {
      console.warn('无法清除待处理任务:', e);
    }
  }
};
