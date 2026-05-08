import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

export interface TaskUpdate {
  type?: 'task_update';
  taskId: string;
  status: 'pending' | 'in_progress' | 'streaming' | 'skeleton_ready' | 'node_filled' | 'completed' | 'failed';
  progress?: number;
  phase?: string;
  preview?: string;
  treeId?: string;
  error?: string;
  nodeId?: string;
  nodeData?: any;
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

