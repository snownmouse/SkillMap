import React, { useState } from 'react';
import { UserInput } from '../../types/skillTree';
import { ChevronRight, ChevronLeft, Sparkles, Target, BookOpen, Clock, MessageSquare } from 'lucide-react';

interface GenerateFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
}

const CAREER_CATEGORIES = [
  { id: 'tech', name: '互联网/科技', icon: '💻', examples: '前端开发, AI 工程师, 产品经理' },
  { id: 'finance', name: '金融/财务', icon: '💰', examples: '量化分析, 财务审计, 投资银行' },
  { id: 'design', name: '设计/创意', icon: '🎨', examples: 'UI/UX 设计, 视觉传达, 工业设计' },
  { id: 'edu', name: '教育/培训', icon: '🎓', examples: '英语老师, 课程设计, 企业培训' },
  { id: 'media', name: '媒体/传播', icon: '📢', examples: '新媒体运营, 视频剪辑, 公关' },
  { id: 'other', name: '其他领域', icon: '✨', examples: '自由职业, 跨界探索' },
];

const SKILL_LEVELS = [
  { id: 'zero', name: '零基础', desc: '刚接触这个领域，完全没有相关经验', icon: '🌱' },
  { id: 'basic', name: '初学者', desc: '了解基本概念，能做简单的练习', icon: '🌿' },
  { id: 'intermediate', name: '进阶者', desc: '有一定的实战经验，能独立解决常见问题', icon: '🌳' },
  { id: 'advanced', name: '专业人士', desc: '在该领域有深厚积累，追求卓越', icon: '🌲' },
];

const TIME_PRESETS = [
  { label: '兴趣探索', hours: 5 },
  { label: '系统学习', hours: 15 },
  { label: '职业转型', hours: 30 },
  { label: '全职冲刺', hours: 50 },
];

/**
 * 技能树生成表单（分步优化版）
 */
const GenerateForm: React.FC<GenerateFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserInput>({
    major: '',
    career: '',
    level: 'zero',
    weeklyHours: 15,
    notes: '',
    existingSkills: []
  });

  const [selectedCategory, setSelectedCategory] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.existingSkills?.includes(skillInput.trim())) {
        setFormData({
          ...formData,
          existingSkills: [...(formData.existingSkills || []), skillInput.trim()]
        });
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      existingSkills: formData.existingSkills?.filter(s => s !== skill)
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-dark-surface p-8 rounded-3xl border border-dark-border shadow-2xl relative overflow-hidden">
      {/* 装饰背景 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-skill-core/5 blur-3xl rounded-full -mr-16 -mt-16" />
      
      {/* 进度指示器 */}
      <div className="flex justify-between mb-10 relative z-10">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-500 ${
              step >= i ? 'bg-skill-core text-white shadow-lg shadow-skill-core/20' : 'bg-dark-bg text-dark-muted border border-dark-border'
            }`}>
              {i}
            </div>
            {i < 3 && (
              <div className="flex-1 mx-4 h-1 bg-dark-bg rounded-full overflow-hidden">
                <div className={`h-full bg-skill-core transition-all duration-500 ${step > i ? 'w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: 职业意向 */}
      {step === 1 && (
        <div className="space-y-8 animate-fade-in relative z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-dark-text flex items-center gap-3">
              <Target className="text-skill-core" />
              确立你的目标
            </h2>
            <p className="text-dark-muted">选择一个大类，然后告诉我们你具体的职业愿景</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CAREER_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`p-4 rounded-2xl border text-left transition-all group ${
                  selectedCategory === cat.name 
                    ? 'bg-skill-core/10 border-skill-core' 
                    : 'bg-dark-bg border-dark-border hover:border-dark-muted'
                }`}
              >
                <div className="text-2xl mb-2">{cat.icon}</div>
                <div className={`font-bold ${selectedCategory === cat.name ? 'text-skill-core' : 'text-dark-text'}`}>{cat.name}</div>
                <div className="text-[10px] text-dark-muted mt-1 group-hover:text-dark-text transition-colors">{cat.examples}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-dark-muted mb-2">具体职业 / 学习方向</label>
              <input 
                type="text"
                value={formData.career}
                onChange={e => setFormData({...formData, career: e.target.value})}
                placeholder="例如：资深前端架构师、量化策略研究员..."
                className="w-full bg-dark-bg border border-dark-border rounded-2xl p-4 text-dark-text focus:ring-2 focus:ring-skill-core/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-dark-muted mb-2">你的专业背景 / 现状</label>
              <input 
                type="text"
                value={formData.major}
                onChange={e => setFormData({...formData, major: e.target.value})}
                placeholder="例如：计算机大三在读、3年传统行业财务..."
                className="w-full bg-dark-bg border border-dark-border rounded-2xl p-4 text-dark-text focus:ring-2 focus:ring-skill-core/50 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            disabled={!formData.career || !selectedCategory}
            onClick={handleNext}
            className="w-full py-5 bg-skill-core text-white rounded-2xl font-black hover:bg-skill-core/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group"
          >
            继续下一步
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* Step 2: 水平与时间 */}
      {step === 2 && (
        <div className="space-y-8 animate-fade-in relative z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-dark-text flex items-center gap-3">
              <BookOpen className="text-skill-core" />
              评估当前状态
            </h2>
            <p className="text-dark-muted">诚实地评估你的起点，以便 AI 为你匹配难度</p>
          </div>

          <div className="space-y-3">
            {SKILL_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setFormData({...formData, level: level.id as any})}
                className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left ${
                  formData.level === level.id 
                    ? 'bg-skill-core/10 border-skill-core' 
                    : 'bg-dark-bg border-dark-border hover:border-dark-muted'
                }`}
              >
                <div className="text-3xl">{level.icon}</div>
                <div>
                  <div className={`font-bold ${formData.level === level.id ? 'text-skill-core' : 'text-dark-text'}`}>{level.name}</div>
                  <div className="text-xs text-dark-muted">{level.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-dark-muted flex items-center gap-2">
                <Clock size={16} className="text-skill-core" />
                每周投入时长
              </label>
              <span className="text-xl font-black text-skill-core">{formData.weeklyHours}h <span className="text-xs font-normal text-dark-muted">/ week</span></span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {TIME_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setFormData({...formData, weeklyHours: preset.hours})}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    formData.weeklyHours === preset.hours 
                      ? 'bg-skill-core text-white border-skill-core' 
                      : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input 
              type="range" 
              min="1" 
              max="60" 
              value={formData.weeklyHours}
              onChange={e => setFormData({...formData, weeklyHours: parseInt(e.target.value)})}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-skill-core"
            />
          </div>

          <div className="flex space-x-4">
            <button onClick={handlePrev} className="flex-1 py-5 bg-dark-bg text-dark-text rounded-2xl font-bold border border-dark-border hover:bg-dark-border transition-all flex items-center justify-center gap-2">
              <ChevronLeft size={20} />
              返回
            </button>
            <button onClick={handleNext} className="flex-1 py-5 bg-skill-core text-white rounded-2xl font-black hover:bg-skill-core/80 transition-all flex items-center justify-center gap-2">
              继续
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 补充说明 */}
      {step === 3 && (
        <div className="space-y-8 animate-fade-in relative z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-dark-text flex items-center gap-3">
              <MessageSquare className="text-skill-core" />
              个性化补充
            </h2>
            <p className="text-dark-muted">添加细节，让 AI 生成的路径更贴合你的实际情况</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-dark-muted mb-2">学习偏好 / 特殊需求</label>
              <textarea 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="例如：我更喜欢视频教程而非文档；我希望在 3 个月内达到就业水平；我目前在职，只能利用碎片时间..."
                className="w-full bg-dark-bg border border-dark-border rounded-2xl p-4 text-dark-text focus:ring-2 focus:ring-skill-core/50 outline-none h-32 resize-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-dark-muted mb-2">已掌握技能 (按回车添加)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={addSkill}
                  placeholder="例如：Python, Git, 基础英语..."
                  className="w-full bg-dark-bg border border-dark-border rounded-2xl p-4 text-dark-text focus:ring-2 focus:ring-skill-core/50 outline-none transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-dark-muted bg-dark-surface px-2 py-1 rounded border border-dark-border">Enter</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {formData.existingSkills?.map(skill => (
                  <span key={skill} className="px-4 py-2 bg-skill-core/10 border border-skill-core/20 rounded-xl text-xs text-skill-core flex items-center font-bold animate-scale-in">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-2 hover:text-white transition-colors">✕</button>
                  </span>
                ))}
                {(!formData.existingSkills || formData.existingSkills.length === 0) && (
                  <div className="text-xs text-dark-muted italic">暂无已掌握技能</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button onClick={handlePrev} className="flex-1 py-5 bg-dark-bg text-dark-text rounded-2xl font-bold border border-dark-border hover:bg-dark-border transition-all flex items-center justify-center gap-2">
              <ChevronLeft size={20} />
              返回
            </button>
            <button 
              onClick={() => onSubmit(formData)}
              disabled={isLoading}
              className="flex-3 py-5 bg-skill-core text-white rounded-2xl font-black hover:bg-skill-core/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-skill-core/20"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  正在构建图谱...
                </div>
              ) : (
                <>
                  <Sparkles size={20} />
                  开启我的进化之路
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateForm;
