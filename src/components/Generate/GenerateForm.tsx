import React, { useState } from 'react';
import { PlanMeta, PlanPath, UserInput } from '../../types/skillTree';
import { ChevronRight, ChevronLeft, Sparkles, Target, BookOpen, Clock, MessageSquare, Compass, Route, Zap, SkipForward } from 'lucide-react';
import { difyApi, PlanningPathsResponseData } from '../../services/difyApi';

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

const TOTAL_STEPS = 4;

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
  const [longTermGoal, setLongTermGoal] = useState('');
  const [planning, setPlanning] = useState<PlanningPathsResponseData | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<PlanPath | ''>('');

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

  const getPlanMeta = (): PlanMeta | undefined => {
    if (!planning) return undefined;
    const firstStageId = planning.stages?.[0]?.id;
    if (!firstStageId) return undefined;
    const chosenPathId = (selectedPathId || planning.recommendedPathId || planning.paths?.[0]?.id) as PlanPath | undefined;
    return {
      longTermGoal: planning.longTermGoal,
      stages: planning.stages,
      selectedStageId: firstStageId,
      paths: planning.paths,
      ...(chosenPathId ? { selectedPathId: chosenPathId } : {})
    };
  };

  const handleGeneratePlanning = async () => {
    setPlanningError(null);
    setPlanningLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const result = await difyApi.getPlanningPaths({
        ...formData,
        longTermGoal: longTermGoal || formData.career,
      }, controller.signal);
      clearTimeout(timeoutId);
      setPlanning(result);
      const initialSelected = (result.recommendedPathId || result.paths?.[0]?.id || '') as PlanPath | '';
      setSelectedPathId(initialSelected);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setPlanningError('请求超时，请稍后重试');
      } else {
        setPlanningError(e instanceof Error ? e.message : '生成路径建议失败');
      }
      setPlanning(null);
      setSelectedPathId('');
    } finally {
      setPlanningLoading(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({ ...formData, longTermGoal: longTermGoal || formData.career, planMeta: getPlanMeta() });
  };

  return (
    <div className="panel-card relative mx-auto max-w-2xl overflow-hidden rounded-[30px] p-4 sm:p-8">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-skill-core/10 blur-3xl" />
      <div className="absolute -bottom-20 left-0 h-40 w-40 rounded-full bg-skill-general/10 blur-3xl" />

      <div className="flex justify-between mb-6 sm:mb-10 relative z-10">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(i => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-500 ${
              step >= i ? 'bg-skill-core text-white shadow-lg shadow-skill-core/20' : 'bg-app-surface text-app-muted border border-[rgba(214,176,165,0.4)]'
            }`}>
              {i}
            </div>
            {i < TOTAL_STEPS && (
              <div className="flex-1 mx-2 sm:mx-4 h-1 bg-app-surface border border-[rgba(214,176,165,0.2)] rounded-full overflow-hidden">
                <div className={`h-full bg-skill-core transition-all duration-500 ${step > i ? 'w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in relative z-10">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-app-text flex items-center gap-3">
              <Target className="text-skill-core" />
              确立你的目标
            </h2>
            <p className="text-app-muted text-sm sm:text-base">选择一个大类，然后告诉我们你具体的职业愿景</p>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            {CAREER_CATEGORIES.map(cat => (
            <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`p-4 sm:p-5 rounded-2xl sm:rounded-[24px] border-2 text-left transition-all group ${
                  selectedCategory === cat.name 
                    ? 'bg-[rgba(255,250,240,0.9)] border-skill-core shadow-md shadow-skill-core/10 scale-[1.02]' 
                    : 'bg-[rgba(255,250,240,0.6)] border-[rgba(214,176,165,0.3)] hover:border-skill-core/50 hover:bg-[rgba(255,250,240,0.8)]'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 transform transition-transform group-hover:scale-110">{cat.icon}</div>
                <div className={`font-bold text-base sm:text-lg ${selectedCategory === cat.name ? 'text-skill-core' : 'text-app-text'}`}>{cat.name}</div>
                <div className="text-xs text-app-muted mt-1 opacity-80 group-hover:opacity-100 transition-opacity hidden sm:block">{cat.examples}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-app-muted mb-3">具体职业 / 学习方向</label>
              <input 
                type="text"
                value={formData.career}
                onChange={e => setFormData({...formData, career: e.target.value})}
                placeholder="例如：资深前端架构师、量化策略研究员..."
                className="w-full rounded-2xl border border-[rgba(214,176,165,0.4)] bg-[rgba(255,250,240,0.6)] p-3 sm:p-5 text-base sm:text-lg text-app-text outline-none transition-all focus:ring-2 focus:ring-skill-core/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-app-muted mb-3">你的专业背景 / 现状</label>
              <input 
                type="text"
                value={formData.major}
                onChange={e => setFormData({...formData, major: e.target.value})}
                placeholder="例如：计算机大三在读、3年传统行业财务..."
                className="w-full rounded-2xl border border-[rgba(214,176,165,0.4)] bg-[rgba(255,250,240,0.6)] p-3 sm:p-5 text-base sm:text-lg text-app-text outline-none transition-all focus:ring-2 focus:ring-skill-core/50 focus:bg-white"
              />
            </div>
          </div>

          <button 
            disabled={!formData.career || !selectedCategory}
            onClick={handleNext}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-black transition-all disabled:opacity-50 group"
          >
            继续下一步
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in relative z-10">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-app-text flex items-center gap-3">
              <BookOpen className="text-skill-core" />
              评估当前状态
            </h2>
            <p className="text-app-muted text-sm sm:text-base">诚实地评估起点，让我们为你规划最合适的难度</p>
          </div>

          <div className="space-y-3">
            {SKILL_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setFormData({...formData, level: level.id as any})}
                className={`w-full p-4 sm:p-5 rounded-2xl sm:rounded-[24px] border-2 transition-all flex items-center gap-3 sm:gap-5 text-left group ${
                  formData.level === level.id 
                    ? 'bg-[rgba(255,250,240,0.9)] border-skill-core shadow-md shadow-skill-core/10 scale-[1.01]' 
                    : 'bg-[rgba(255,250,240,0.6)] border-[rgba(214,176,165,0.3)] hover:border-skill-core/50 hover:bg-[rgba(255,250,240,0.8)]'
                }`}
              >
                <div className="text-3xl sm:text-4xl transform transition-transform group-hover:scale-110">{level.icon}</div>
                <div>
                  <div className={`font-bold text-base sm:text-lg mb-1 ${formData.level === level.id ? 'text-skill-core' : 'text-app-text'}`}>{level.name}</div>
                  <div className="text-sm text-app-muted opacity-80 hidden sm:block">{level.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-app-muted flex items-center gap-2">
                <Clock size={16} className="text-skill-core" />
                每周投入时长
              </label>
              <span className="text-lg sm:text-xl font-black text-skill-core">{formData.weeklyHours}h <span className="text-xs font-normal text-app-muted">/ week</span></span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setFormData({...formData, weeklyHours: preset.hours})}
                  className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${
                    formData.weeklyHours === preset.hours 
                      ? 'bg-skill-core text-white border-skill-core' 
                      : 'bg-app-surface text-app-muted border-[rgba(214,176,165,0.4)] hover:border-skill-core'
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
              className="w-full h-2 bg-app-surface border border-[rgba(214,176,165,0.4)] rounded-lg appearance-none cursor-pointer accent-skill-core"
            />
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button onClick={handlePrev} className="btn-secondary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-bold transition-all">
              <ChevronLeft size={20} />
              返回
            </button>
            <button onClick={handleNext} className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-black transition-all">
              继续
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in relative z-10">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-app-text flex items-center gap-3">
              <MessageSquare className="text-skill-core" />
              个性化补充
            </h2>
            <p className="text-app-muted text-sm sm:text-base">写下你的小偏好，让这份路径更贴合你的生活</p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-bold text-app-muted mb-3">学习偏好 / 特殊需求</label>
              <textarea 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="例如：我更喜欢视频教程而非文档；我希望在 3 个月内达到就业水平；我目前在职，只能利用碎片时间..."
                className="h-24 sm:h-32 w-full resize-none rounded-2xl border border-[rgba(214,176,165,0.4)] bg-[rgba(255,250,240,0.6)] p-3 sm:p-5 text-sm sm:text-base text-app-text outline-none transition-all focus:ring-2 focus:ring-skill-core/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-app-muted mb-3">长期目标（终点）</label>
              <textarea
                value={longTermGoal}
                onChange={e => setLongTermGoal(e.target.value)}
                placeholder="例如：成为资深前端架构师；转型为量化研究员；进入重点领域做算法工程师..."
                className="h-20 sm:h-24 w-full resize-none rounded-2xl border border-[rgba(214,176,165,0.4)] bg-[rgba(255,250,240,0.6)] p-3 sm:p-5 text-sm sm:text-base text-app-text outline-none transition-all focus:ring-2 focus:ring-skill-core/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-app-muted mb-3">已掌握技能 (按回车添加)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={addSkill}
                  placeholder="例如：Python, Git, 基础英语..."
                  className="w-full rounded-2xl border border-[rgba(214,176,165,0.4)] bg-[rgba(255,250,240,0.6)] p-3 sm:p-5 text-sm sm:text-base text-app-text outline-none transition-all focus:ring-2 focus:ring-skill-core/50 focus:bg-white"
                />
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs text-app-muted bg-white/50 px-2 py-1 rounded border border-[rgba(214,176,165,0.4)] shadow-sm font-mono hidden sm:block">Enter</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {formData.existingSkills?.map(skill => (
                  <span key={skill} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-skill-core/10 border border-skill-core/20 rounded-xl text-xs text-skill-core flex items-center font-bold animate-scale-in">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-2 hover:text-white transition-colors">✕</button>
                  </span>
                ))}
                {(!formData.existingSkills || formData.existingSkills.length === 0) && (
                  <div className="text-xs text-app-muted italic">暂无已掌握技能</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button onClick={handlePrev} className="btn-secondary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-bold transition-all">
              <ChevronLeft size={20} />
              返回
            </button>
            <button onClick={handleNext} className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-black transition-all">
              下一步
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in relative z-10">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-app-text flex items-center gap-3">
              <Compass className="text-skill-core" />
              规划你的路线
            </h2>
            <p className="text-app-muted text-sm sm:text-base">基于你填写的信息，AI 可以为你分析阶段拆分和路线选择</p>
          </div>

          {!planning && !planningLoading && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[rgba(214,176,165,0.35)] bg-[rgba(255,250,240,0.6)] p-4 sm:p-6 space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-skill-core/10 flex items-center justify-center flex-shrink-0">
                    <Route className="text-skill-core" size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-app-text text-base sm:text-lg">生成路线建议</div>
                    <div className="text-xs sm:text-sm text-app-muted mt-1 leading-relaxed">
                      AI 将根据你的背景和目标，为你拆分学习阶段（2-5个），并提供 3-5 条可选发展路线。
                      选择路线后，技能树将聚焦于第一阶段的目标。
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl bg-white/50 p-3 text-center">
                    <div className="text-xs text-app-muted">目标职业</div>
                    <div className="font-bold text-app-text mt-1 text-sm sm:text-base">{formData.career}</div>
                  </div>
                  <div className="rounded-xl bg-white/50 p-3 text-center">
                    <div className="text-xs text-app-muted">长期目标</div>
                    <div className="font-bold text-app-text mt-1 text-sm sm:text-base">{longTermGoal || formData.career}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleGeneratePlanning}
                  disabled={!formData.career || !formData.major}
                  className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-black transition-all disabled:opacity-50"
                >
                  <Zap size={20} />
                  生成路线建议
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="btn-secondary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-bold transition-all disabled:opacity-50"
                >
                  <SkipForward size={20} />
                  跳过
                </button>
              </div>

              {planningError && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-sm text-red-600">
                  {planningError}
                </div>
              )}
            </div>
          )}

          {planningLoading && (
            <div className="rounded-2xl border border-[rgba(214,176,165,0.35)] bg-[rgba(255,250,240,0.6)] p-6 sm:p-8 text-center space-y-4">
              <div className="w-12 h-12 border-3 border-skill-core/30 border-t-skill-core rounded-full animate-spin mx-auto" />
              <div className="font-bold text-app-text">正在分析你的职业路线...</div>
              <div className="text-sm text-app-muted">AI 正在根据你的背景拆分阶段、推荐路线</div>
            </div>
          )}

          {planning && (
            <div className="space-y-4 sm:space-y-5">
              <div className="rounded-2xl border border-[rgba(214,176,165,0.35)] bg-[rgba(255,250,240,0.6)] p-3 sm:p-4">
                <div className="text-sm font-black text-app-text mb-3">阶段拆分（先走第 1 阶段）</div>
                <div className="space-y-3">
                  {planning.stages.map((s, idx) => (
                    <div key={s.id} className="rounded-xl border border-[rgba(214,176,165,0.25)] bg-white/40 p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-skill-core/10 text-skill-core text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                        <span className="font-bold text-app-text text-sm sm:text-base">{s.title}</span>
                        {s.suggestedMonths && <span className="text-xs text-app-muted ml-auto">{s.suggestedMonths}个月</span>}
                      </div>
                      <div className="text-xs text-app-muted mt-1 ml-8">{s.objective}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(214,176,165,0.35)] bg-[rgba(255,250,240,0.6)] p-3 sm:p-4">
                <div className="text-sm font-black text-app-text mb-3">请选择你的路线</div>
                <div className="space-y-3">
                  {planning.paths.map((p) => {
                    const active = selectedPathId === p.id;
                    const isRecommended = p.id === planning.recommendedPathId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPathId(p.id)}
                        className={`w-full text-left rounded-2xl border-2 p-3 sm:p-4 transition-all ${
                          active
                            ? 'bg-[rgba(255,250,240,0.9)] border-skill-core shadow-md shadow-skill-core/10'
                            : 'bg-[rgba(255,250,240,0.6)] border-[rgba(214,176,165,0.3)] hover:border-skill-core/50 hover:bg-[rgba(255,250,240,0.8)]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className={`font-bold text-sm sm:text-base ${active ? 'text-skill-core' : 'text-app-text'}`}>
                            {p.name}
                            {isRecommended && <span className="ml-2 text-[10px] bg-skill-core/10 text-skill-core px-2 py-0.5 rounded-full font-bold">推荐</span>}
                          </div>
                          {typeof p.fitScore === 'number' && (
                            <div className="text-xs font-black text-app-muted">匹配度 {p.fitScore}%</div>
                          )}
                        </div>
                        <div className="text-xs text-app-muted mt-1.5">{p.description}</div>
                        {p.fitReason && <div className="text-[11px] text-skill-core/70 mt-1">{p.fitReason}</div>}
                        {p.stageRoadmap?.[0]?.route?.length ? (
                          <div className="text-[11px] text-app-muted mt-2">
                            第 1 阶段顺序：{p.stageRoadmap[0].route.join(' → ')}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => { setPlanning(null); setSelectedPathId(''); setPlanningError(null); }}
                className="text-xs text-app-muted hover:text-app-text transition-colors underline underline-offset-2"
              >
                重新生成路线建议
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button onClick={handlePrev} className="btn-secondary flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-bold transition-all">
              <ChevronLeft size={20} />
              返回
            </button>
            {planning ? (
              <button 
                onClick={handleSubmit}
                disabled={isLoading || !getPlanMeta()?.selectedPathId}
                className="btn-primary flex flex-[3] items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-black transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-app-border border-t-white rounded-full animate-spin" />
                    正在构建图谱...
                  </div>
                ) : (
                  <>
                    <Sparkles size={20} />
                    生成第 1 阶段技能树
                  </>
                )}
              </button>
            ) : !planningLoading ? (
              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary flex flex-[3] items-center justify-center gap-2 rounded-2xl py-4 sm:py-5 font-black transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-app-border border-t-white rounded-full animate-spin" />
                    正在构建图谱...
                  </div>
                ) : (
                  <>
                    <Sparkles size={20} />
                    开启我的进化之路
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateForm;
