/**
 * 本地存储封装
 */
const STORAGE_KEY = 'skillmap_state';
const LAST_TREE_ID_KEY = 'skillmap_last_tree_id';
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
      const { isGenerating, isChatLoading, error, ...persistentState } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentState));
      if (persistentState.skillTree?.id) {
        localStorage.setItem(LAST_TREE_ID_KEY, persistentState.skillTree.id);
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
    localStorage.removeItem(LAST_TREE_ID_KEY);
    localStorage.removeItem(PENDING_TASK_KEY);
  },

  saveLastTreeId(treeId: string) {
    try {
      localStorage.setItem(LAST_TREE_ID_KEY, treeId);
    } catch (e) {
      console.warn('无法保存最近技能树 ID:', e);
    }
  },

  loadLastTreeId() {
    try {
      return localStorage.getItem(LAST_TREE_ID_KEY);
    } catch (e) {
      console.warn('无法加载最近技能树 ID:', e);
      return null;
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
