import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { SkillNode, SkillTreeData } from '../types/skillTree';

/**
 * 技能树状态管理 Hook
 */
export function useSkillTree() {
  const { state, dispatch } = useAppContext();

  const setSkillTree = useCallback((data: SkillTreeData) => {
    dispatch({ type: 'SET_SKILL_TREE', payload: data });
  }, [dispatch]);

  const updateNodeProgress = useCallback((nodeId: string, progress: number) => {
    dispatch({ type: 'UPDATE_NODE_PROGRESS', payload: { nodeId, progress } });
  }, [dispatch]);

  const updateNodeData = useCallback((nodeId: string, nodeData: Partial<SkillNode>) => {
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { nodeId, nodeData } });
  }, [dispatch]);

  const setActiveNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_NODE', payload: nodeId });
  }, [dispatch]);

  const addTimelineEvent = useCallback((event: any) => {
    dispatch({ type: 'ADD_TIMELINE_EVENT', payload: event });
  }, [dispatch]);

  const activeNode = state.activeNodeId ? state.skillTree?.nodes[state.activeNodeId] : null;

  return {
    skillTree: state.skillTree,
    activeNode,
    activeNodeId: state.activeNodeId,
    isGenerating: state.isGenerating,
    error: state.error,
    setSkillTree,
    updateNodeProgress,
    updateNodeData,
    setActiveNode,
    addTimelineEvent,
    setGenerating: useCallback((val: boolean) => dispatch({ type: 'SET_GENERATING', payload: val }), [dispatch]),
    setError: useCallback((val: string | null) => dispatch({ type: 'SET_ERROR', payload: val }), [dispatch]),
  };
}
