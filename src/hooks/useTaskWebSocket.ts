import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

export interface TaskUpdate {
  type?: 'task_update';
  taskId: string;
  status: 'pending' | 'in_progress' | 'streaming' | 'skeleton_ready' | 'node_filled' | 'completed' | 'failed';
  progress?: number;
  phase?: string;
  stage?: number; // 1: 准备, 2: 生成骨架, 3: 填充节点, 4: 完善保存, 5: 完成
  preview?: string;
  treeId?: string;
  error?: string;
  attempts?: number;
  maxAttempts?: number;
  nextRetryAt?: string;
  nodeId?: string;
  nodeData?: any;
  nodeCount?: number;
}

export function useTaskWebSocket(
  taskId: string | null,
  onUpdate: (update: TaskUpdate) => void
) {
  const taskIdRef = useRef<string | null>(taskId);
  taskIdRef.current = taskId;

  const { isConnected, subscribeTask, unsubscribeTask } = useWebSocket({
    onConnected: () => {
      if (taskIdRef.current) {
        subscribeTask(taskIdRef.current);
      }
    },
    onTaskUpdate: (message) => {
      if (!taskIdRef.current) return;
      if (message?.taskId !== taskIdRef.current) return;
      onUpdate(message as TaskUpdate);
    }
  });

  useEffect(() => {
    if (!taskId) return;
    if (isConnected) {
      subscribeTask(taskId);
    }
    return () => {
      unsubscribeTask(taskId);
    };
  }, [taskId, isConnected, subscribeTask, unsubscribeTask]);
}
