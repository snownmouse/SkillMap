import { useState, useEffect } from 'react';

export interface DimensionScore {
  id: string;
  name: string;
  nameEn: string;
  score: number;
  description: string;
  interpretation: {
    low: string;
    medium: string;
    high: string;
  };
}

interface ChineseDimensionChartProps {
  dimensions: DimensionScore[];
  title?: string;
}

const CHINESE_DIMENSIONS = [
  { key: 'jiaGuoQingHuai', label: '家国情怀', color: '#E74C3C' },
  { key: 'yiLiJianGu', label: '义利兼顾', color: '#3498DB' },
  { key: 'mingDeHongDao', label: '明德弘道', color: '#2ECC71' },
  { key: 'shiJianZhiXiang', label: '实践志向', color: '#9B59B6' },
];

export function ChineseDimensionChart({ dimensions, title = '中国特色维度评估' }: ChineseDimensionChartProps) {
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const newScores: Record<string, number> = {};
    dimensions.forEach(dim => {
      newScores[dim.id] = 0;
    });
    setAnimatedScores(newScores);

    dimensions.forEach((dim, index) => {
      setTimeout(() => {
        setAnimatedScores(prev => ({ ...prev, [dim.id]: dim.score }));
      }, index * 200);
    });
  }, [dimensions]);

  const getInterpretation = (dimension: DimensionScore): string => {
    if (dimension.score >= 80) return dimension.interpretation.high;
    if (dimension.score >= 60) return dimension.interpretation.medium;
    return dimension.interpretation.low;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBarColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getBarGradient = (dimensionKey: string): string => {
    const dim = CHINESE_DIMENSIONS.find(d => d.key === dimensionKey);
    return dim?.color || '#3498DB';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">{title}</h2>
      
      <div className="space-y-6">
        {dimensions.map((dimension) => {
          const animatedScore = animatedScores[dimension.id] || 0;
          const barColor = getBarGradient(dimension.id);
          
          return (
            <div key={dimension.id} className="relative">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: barColor }}
                  />
                  <span className="font-medium text-gray-700">{dimension.name}</span>
                  <span className="text-sm text-gray-500">({dimension.nameEn})</span>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(dimension.score)}`}>
                  {Math.round(animatedScore)}
                </span>
              </div>
              
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${animatedScore}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 0 10px ${barColor}40`
                  }}
                />
              </div>
              
              <p className="mt-2 text-sm text-gray-600 italic">
                {getInterpretation(dimension)}
              </p>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">优秀 (80-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">良好 (60-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">待提升 (0-59)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface RadialDimensionProps {
  dimensions: DimensionScore[];
}

export function RadialDimensionChart({ dimensions }: RadialDimensionProps) {
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  const angleStep = (2 * Math.PI) / dimensions.length;

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  const polygonPoints = dimensions
    .map((dim, i) => {
      const point = getPoint(i, dim.score);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  const gridPoints = [30, 60, 90].map(r => {
    return Array.from({ length: dimensions.length }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
    }).join(' ');
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">维度雷达图</h3>
      <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
        {gridPoints.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}
        
        {dimensions.map((dim, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const endX = centerX + radius * Math.cos(angle);
          const endY = centerY + radius * Math.sin(angle);
          return (
            <line
              key={dim.id}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          );
        })}
        
        <polygon
          points={polygonPoints}
          fill="rgba(52, 152, 219, 0.2)"
          stroke="#3498DB"
          strokeWidth="2"
        />
        
        {dimensions.map((dim, i) => {
          const point = getPoint(i, dim.score);
          return (
            <circle
              key={dim.id}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3498DB"
            />
          );
        })}
        
        {dimensions.map((dim, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = radius + 20;
          const labelX = centerX + labelRadius * Math.cos(angle);
          const labelY = centerY + labelRadius * Math.sin(angle);
          const anchor = Math.cos(angle) > 0 ? 'start' : 'end';
          
          return (
            <text
              key={dim.id}
              x={labelX}
              y={labelY}
              textAnchor={anchor as 'start' | 'end'}
              dominantBaseline="middle"
              className="text-xs fill-gray-600"
              style={{ fontSize: '12px' }}
            >
              {dim.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}