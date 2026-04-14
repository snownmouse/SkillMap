import { useAppContext } from '../context/AppContext';
import { SkillTreeData, SkillNode } from '../types/skillTree';

/**
 * 技能树状态管理 Hook
 */
export function useSkillTree() {
  const { state, dispatch } = useAppContext();

  const setSkillTree = (data: SkillTreeData) => {
    dispatch({ type: 'SET_SKILL_TREE', payload: data });
  };

  const updateNodeProgress = (nodeId: string, progress: number) => {
    dispatch({ type: 'UPDATE_NODE_PROGRESS', payload: { nodeId, progress } });
  };

  const setActiveNode = (nodeId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_NODE', payload: nodeId });
  };

  const addTimelineEvent = (event: any) => {
    dispatch({ type: 'ADD_TIMELINE_EVENT', payload: event });
  };

  const activeNode = state.activeNodeId ? state.skillTree?.nodes[state.activeNodeId] : null;

  return {
    skillTree: state.skillTree,
    activeNode,
    activeNodeId: state.activeNodeId,
    isGenerating: state.isGenerating,
    error: state.error,
    setSkillTree,
    updateNodeProgress,
    setActiveNode,
    addTimelineEvent,
    setGenerating: (val: boolean) => dispatch({ type: 'SET_GENERATING', payload: val }),
    setError: (val: string | null) => dispatch({ type: 'SET_ERROR', payload: val }),
  };
}
