import {
  WESTERN_THEORIES,
  CHINESE_THEORIES,
  ASSESSMENT_DIMENSIONS,
  CAREER_PATHS,
  CHINESE_ASSESSMENT_QUESTIONS,
  Theory,
  DimensionDefinition,
  CareerPathDefinition
} from './theoryFramework';

export interface TemplateContext {
  userInfo?: Record<string, string>;
  theories?: Array<Theory>;
  dimensions?: Array<DimensionDefinition>;
  paths?: Array<CareerPathDefinition>;
  questions?: Array<{ id: string; question: string; dimension: string }>;
  customContent?: string;
  outputFormat?: string;
}

export const CORE_PRINCIPLES = [
  { name: '中体西用', desc: '以中国特色理论为主体框架，融合西方科学方法' },
  { name: '知行合一', desc: '理论指导与实践锻炼并重' },
  { name: '家国同构', desc: '个人发展与国家命运紧密相连' },
  { name: '义利兼顾', desc: '正当利益追求与社会责任统一' },
];

export function formatTheoriesBrief(theories: Theory[]): string {
  return theories.map(t => `${t.name}：${t.keyPrinciples.slice(0, 3).join('、')}`).join('；');
}

export function formatPathsBrief(paths: CareerPathDefinition[]): string {
  return paths.map(p => `${p.id}: ${p.name} - ${p.description}（${p.nationalAlignment}）`).join('\n');
}

export function buildCareerPlanContext(userInfo: Record<string, string>): TemplateContext {
  return {
    userInfo,
    theories: [...WESTERN_THEORIES, ...CHINESE_THEORIES],
    dimensions: ASSESSMENT_DIMENSIONS,
    paths: CAREER_PATHS,
    questions: CHINESE_ASSESSMENT_QUESTIONS.map(q => ({ id: q.id, question: q.question, dimension: q.dimension }))
  };
}

export function buildPlanningPathsContext(userInfo: Record<string, string>): TemplateContext {
  return {
    userInfo,
    theories: CHINESE_THEORIES,
    paths: CAREER_PATHS
  };
}

export function buildLearningSuggestionContext(userInfo: Record<string, string>): TemplateContext {
  return {
    userInfo,
    theories: WESTERN_THEORIES.filter(t =>
      ['bloom', 'deliberate_practice', 'zpd', 'smart'].includes(t.id)
    )
  };
}
