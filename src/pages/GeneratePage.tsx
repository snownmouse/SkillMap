import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GenerateForm from '../components/Generate/GenerateForm';
import GenerateAnimation from '../components/Generate/GenerateAnimation';
import { useSkillTree } from '../hooks/useSkillTree';
import { difyApi, TaskStatus } from '../services/difyApi';
import { UserInput } from '../types/skillTree';

/**
 * 生成页
 */
const GeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const { setSkillTree, setGenerating, isGenerating, setError } = useSkillTree();
  const [showAnimation, setShowAnimation] = useState(false);
  const [career, setCareer] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);

  const pollTaskStatus = async (id: string) => {
    try {
      const status: TaskStatus = await difyApi.getTaskStatus(id);
      
      switch (status.status) {
        case 'completed':
          if (status.result) {
            setSkillTree(status.result.data);
            setShowAnimation(true);
          }
          break;
        case 'failed':
          setError(status.error || '生成失败，请稍后重试');
          setGenerating(false);
          break;
        case 'pending':
        case 'in_progress':
          // 继续轮询
          setTimeout(() => pollTaskStatus(id), 2000);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('获取任务状态失败:', e);
      setError('获取任务状态失败，请稍后重试');
      setGenerating(false);
    }
  };

  const handleGenerate = async (input: UserInput) => {
    setGenerating(true);
    setCareer(input.career);
    try {
      // 转换字段名以匹配后端接口
      const formattedInput = {
        major: input.major,
        career: input.career,
        level: input.level,
        weeklyHours: input.weeklyHours,
        notes: input.notes || '',
        existingSkills: input.existingSkills || []
      };
      const response = await difyApi.generateSkillTree(formattedInput);
      const id = response.taskId;
      setTaskId(id);
      // 开始轮询任务状态
      pollTaskStatus(id);
    } catch (e) {
      console.error(e);
      setError('生成失败，请稍后重试');
      setGenerating(false);
    }
  };

  const handleAnimationComplete = () => {
    setGenerating(false);
    navigate('/tree');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      {!showAnimation ? (
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-dark-text mb-4">规划你的未来</h1>
            <p className="text-dark-muted">填写以下信息，AI 将为你构建专属的技能图谱</p>
          </div>
          <GenerateForm onSubmit={handleGenerate} isLoading={isGenerating} />
        </div>
      ) : (
        <GenerateAnimation career={career} onComplete={handleAnimationComplete} />
      )}
    </div>
  );
};

export default GeneratePage;
