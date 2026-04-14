import React, { useState, useEffect } from 'react';

interface GenerateAnimationProps {
  career: string;
  onComplete: () => void;
}

/**
 * 技能树生成动画组件
 */
const GenerateAnimation: React.FC<GenerateAnimationProps> = ({ career, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('正在构建核心节点...');

  useEffect(() => {
    const totalSteps = 20;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 1000);
          return 100;
        }
        return p + (100 / totalSteps);
      });
    }, 400);

    const statusInterval = setInterval(() => {
      const statuses = [
        '正在分析职业路径...',
        '正在构建核心节点...',
        '正在关联前置技能...',
        '正在生成学习资源...',
        '正在优化布局结构...',
        '即将完成...'
      ];
      setStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      {/* 中心发光点 */}
      <div className="relative">
        <div className="w-16 h-16 bg-skill-core rounded-full animate-pulse-glow flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
        {/* 扩散光圈 */}
        <div className="absolute inset-0 border-2 border-skill-core rounded-full animate-ping opacity-20" />
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-dark-text">
          正在为你定制 <span className="text-skill-core">{career}</span> 成长之路
        </h2>
        <p className="text-dark-muted animate-pulse">{status}</p>
      </div>

      {/* 进度条 */}
      <div className="w-64">
        <div className="flex justify-between text-xs text-dark-muted mb-2">
          <span>构建进度</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-dark-surface rounded-full overflow-hidden">
          <div 
            className="h-full bg-skill-core transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default GenerateAnimation;
