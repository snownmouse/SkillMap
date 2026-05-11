export interface Theory {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  origin: string;
  keyPrinciples: string[];
  applicationAreas: string[];
}

export interface DimensionDefinition {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  theorySource: string;
  scale: [number, number];
  interpretation: {
    low: string;
    medium: string;
    high: string;
  };
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  dimension: string;
  type: 'open' | 'scale' | 'multiple';
  options?: string[];
}

export interface CareerPathDefinition {
  id: string;
  name: string;
  description: string;
  corePrinciples: string[];
  nationalAlignment: string;
  dimensionWeights: Record<string, number>;
}

export const WESTERN_THEORIES: Theory[] = [
  {
    id: 'holland',
    name: '霍兰德职业兴趣理论',
    nameEn: 'Holland Code',
    description: '将人格分为六种类型，匹配职业环境',
    origin: 'John Holland, 1973',
    keyPrinciples: ['现实型(R)', '研究型(I)', '艺术型(A)', '社会型(S)', '企业型(E)', '常规型(C)'],
    applicationAreas: ['职业匹配', '兴趣评估', '路径推荐']
  },
  {
    id: 'career_anchors',
    name: '职业锚理论',
    nameEn: 'Career Anchors',
    description: '识别个人职业发展的核心价值观',
    origin: 'Edgar Schein, 1978',
    keyPrinciples: ['技术/职能', '管理', '自主/独立', '安全稳定', '创业精神', '服务/使命', '生活平衡', '纯粹挑战'],
    applicationAreas: ['职业定位', '价值匹配', '职业决策']
  },
  {
    id: 'smart',
    name: 'SMART目标设定',
    nameEn: 'SMART Goals',
    description: '目标设定的五项原则',
    origin: 'George Doran, 1981',
    keyPrinciples: ['具体(Specific)', '可测量(Measurable)', '可达成(Achievable)', '相关(Relevant)', '有时限(Time-bound)'],
    applicationAreas: ['目标制定', '计划执行', '进度跟踪']
  },
  {
    id: 'bloom',
    name: '布鲁姆认知分类法',
    nameEn: "Bloom's Taxonomy",
    description: '认知能力的六个层级',
    origin: 'Benjamin Bloom, 1956',
    keyPrinciples: ['记忆(Remember)', '理解(Understand)', '应用(Apply)', '分析(Analyze)', '评价(Evaluate)', '创造(Create)'],
    applicationAreas: ['学习路径设计', '能力评估', '课程规划']
  },
  {
    id: 'deliberate_practice',
    name: '刻意练习',
    nameEn: 'Deliberate Practice',
    description: '有目的的专注练习方法',
    origin: 'Anders Ericsson, 2006',
    keyPrinciples: ['专注目标', '即时反馈', '调整改进', '边界挑战'],
    applicationAreas: ['技能训练', '学习方法', '能力提升']
  },
  {
    id: 'zpd',
    name: '最近发展区',
    nameEn: 'Zone of Proximal Development',
    description: '现有水平与潜在水平之间的差距',
    origin: 'Lev Vygotsky, 1978',
    keyPrinciples: ['适度挑战', '脚手架支持', '同伴协作'],
    applicationAreas: ['学习难度设计', '任务推荐', '教学指导']
  }
];

export const CHINESE_THEORIES: Theory[] = [
  {
    id: 'marxist_development',
    name: '马克思主义人的全面发展理论',
    nameEn: "Marxist Theory of Human Development",
    description: '人的本质是社会关系的总和，教育与生产劳动相结合',
    origin: '马克思主义经典著作',
    keyPrinciples: ['人的本质是社会关系的总和', '人的自由而全面的发展', '教育与生产劳动相结合', '实践是认识的源泉'],
    applicationAreas: ['生涯价值观', '社会贡献', '实践导向']
  },
  {
    id: 'chinese_traditional',
    name: '中华优秀传统文化精华',
    nameEn: 'Chinese Traditional Culture',
    description: '修齐治平、厚德载物等传统智慧',
    origin: '中华五千年文明',
    keyPrinciples: ['修齐治平、兴亡有责的家国情怀', '富民厚生、义利兼顾的经济伦理', '厚德载物、明德弘道的精神追求', '自强不息、精益求精的奋斗精神'],
    applicationAreas: ['职业道德', '价值取向', '人生哲学']
  },
  {
    id: 'socialist_education',
    name: '中国特色社会主义教育理论',
    nameEn: 'Socialist Education Theory',
    description: '立德树人、为党育人、为国育才',
    origin: '中国特色社会主义理论体系',
    keyPrinciples: ['立德树人', '为党育人、为国育才', '理论联系实际', '德智体美劳全面发展'],
    applicationAreas: ['教育目标', '人才培养', '国家战略']
  }
];

export const ASSESSMENT_DIMENSIONS: DimensionDefinition[] = [
  {
    id: 'holland_match',
    name: '霍兰德匹配度',
    nameEn: 'Holland Match',
    description: '职业兴趣与目标职业的匹配程度',
    theorySource: 'holland',
    scale: [0, 100],
    interpretation: {
      low: '兴趣匹配度较低，建议探索其他方向',
      medium: '兴趣有一定匹配，可进一步发展',
      high: '兴趣高度匹配，适合深入发展'
    }
  },
  {
    id: 'career_anchor_match',
    name: '职业锚匹配度',
    nameEn: 'Career Anchor Match',
    description: '职业价值观与路径的契合程度',
    theorySource: 'career_anchors',
    scale: [0, 100],
    interpretation: {
      low: '价值观匹配度较低',
      medium: '价值观有一定契合',
      high: '价值观高度契合'
    }
  },
  {
    id: 'jia_guo_qing_huai',
    name: '家国情怀',
    nameEn: 'Patriotism & Family Feeling',
    description: '服务国家战略、民族复兴的意愿',
    theorySource: 'chinese_traditional',
    scale: [0, 100],
    interpretation: {
      low: '较少考虑国家发展需求',
      medium: '关注个人发展的同时考虑国家需求',
      high: '积极响应国家号召，投身国家建设'
    }
  },
  {
    id: 'yi_li_jian_gu',
    name: '义利兼顾',
    nameEn: 'Righteousness & Benefit Balance',
    description: '正当利益与社会责任的平衡观',
    theorySource: 'chinese_traditional',
    scale: [0, 100],
    interpretation: {
      low: '更关注个人利益',
      medium: '兼顾个人利益与社会责任',
      high: '重视社会责任，追求义利统一'
    }
  },
  {
    id: 'ming_de_hong_dao',
    name: '明德弘道',
    nameEn: 'Virtue & Principle',
    description: '职业道德与精神追求',
    theorySource: 'chinese_traditional',
    scale: [0, 100],
    interpretation: {
      low: '对职业操守要求一般',
      medium: '重视职业道德修养',
      high: '追求高尚的职业精神和道德境界'
    }
  },
  {
    id: 'shi_jian_zhi_xiang',
    name: '实践志向',
    nameEn: 'Practice Orientation',
    description: '基层锻炼、理论联系实际的意愿',
    theorySource: 'marxist_development',
    scale: [0, 100],
    interpretation: {
      low: '偏好理论研究，较少参与实践',
      medium: '理论与实践并重',
      high: '积极投身基层实践，知行合一'
    }
  },
  {
    id: 'national_demand',
    name: '国家战略需求',
    nameEn: 'National Strategy Demand',
    description: '职业选择与国家战略的契合程度',
    theorySource: 'socialist_education',
    scale: [0, 100],
    interpretation: {
      low: '与国家战略关联度较低',
      medium: '一定程度契合国家发展方向',
      high: '高度契合国家战略需求'
    }
  },
  {
    id: 'social_contribution',
    name: '社会贡献预期',
    nameEn: 'Social Contribution',
    description: '对社会发展的潜在贡献价值',
    theorySource: 'marxist_development',
    scale: [0, 100],
    interpretation: {
      low: '社会贡献有限',
      medium: '能够做出一定社会贡献',
      high: '能够做出显著社会贡献'
    }
  }
];

export const CHINESE_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'grassroot_willingness',
    question: '你愿意到基层去锻炼吗？为什么？',
    dimension: 'shi_jian_zhi_xiang',
    type: 'open'
  },
  {
    id: 'social_value',
    question: '你如何看待个人利益与社会责任的关系？',
    dimension: 'yi_li_jian_gu',
    type: 'open'
  },
  {
    id: 'national_alignment',
    question: '你的职业选择如何与国家发展同频共振？',
    dimension: 'jia_guo_qing_huai',
    type: 'open'
  },
  {
    id: 'ethical_standards',
    question: '在职业发展中，你认为最重要的职业道德是什么？',
    dimension: 'ming_de_hong_dao',
    type: 'open'
  },
  {
    id: 'practice_importance',
    question: '理论学习与实践锻炼，你更看重哪一个？',
    dimension: 'shi_jian_zhi_xiang',
    type: 'multiple',
    options: ['理论学习更重要', '实践锻炼更重要', '两者同等重要']
  },
  {
    id: 'social_impact',
    question: '你希望通过职业为社会做出怎样的贡献？',
    dimension: 'social_contribution',
    type: 'open'
  }
];

export const CAREER_PATHS: CareerPathDefinition[] = [
  {
    id: 'tech',
    name: '技术深耕路线',
    description: '追求专业深度和技术专家地位',
    corePrinciples: ['专业精进', '技术创新', '持续学习'],
    nationalAlignment: '科技自立自强、创新驱动发展',
    dimensionWeights: {
      holland_match: 80,
      career_anchor_match: 75,
      jia_guo_qing_huai: 60,
      yi_li_jian_gu: 70,
      ming_de_hong_dao: 75,
      shi_jian_zhi_xiang: 65,
      national_demand: 70,
      social_contribution: 60
    }
  },
  {
    id: 'management',
    name: '管理发展路线',
    description: '追求领导权力和团队管理',
    corePrinciples: ['团队协作', '战略规划', '资源整合'],
    nationalAlignment: '高素质管理人才培养',
    dimensionWeights: {
      holland_match: 70,
      career_anchor_match: 85,
      jia_guo_qing_huai: 75,
      yi_li_jian_gu: 80,
      ming_de_hong_dao: 85,
      shi_jian_zhi_xiang: 70,
      national_demand: 65,
      social_contribution: 75
    }
  },
  {
    id: 'slash',
    name: '复合发展路线',
    description: '技术+管理双轨发展',
    corePrinciples: ['跨界融合', '多元能力', '灵活适应'],
    nationalAlignment: '复合型人才培养',
    dimensionWeights: {
      holland_match: 75,
      career_anchor_match: 70,
      jia_guo_qing_huai: 70,
      yi_li_jian_gu: 75,
      ming_de_hong_dao: 75,
      shi_jian_zhi_xiang: 75,
      national_demand: 75,
      social_contribution: 70
    }
  },
  {
    id: 'grassroot',
    name: '基层锻炼路线',
    description: '到基层去、到西部去、到祖国最需要的地方去',
    corePrinciples: ['扎根基层', '服务群众', '实践成长'],
    nationalAlignment: '乡村振兴、西部大开发、基层治理',
    dimensionWeights: {
      holland_match: 50,
      career_anchor_match: 60,
      jia_guo_qing_huai: 95,
      yi_li_jian_gu: 90,
      ming_de_hong_dao: 85,
      shi_jian_zhi_xiang: 100,
      national_demand: 85,
      social_contribution: 95
    }
  },
  {
    id: 'national_strategy',
    name: '国家战略路线',
    description: '人工智能、芯片、新能源等国家重点领域',
    corePrinciples: ['战略聚焦', '科技攻关', '自主创新'],
    nationalAlignment: '科技自立自强、制造强国、数字中国',
    dimensionWeights: {
      holland_match: 75,
      career_anchor_match: 70,
      jia_guo_qing_huai: 90,
      yi_li_jian_gu: 85,
      ming_de_hong_dao: 80,
      shi_jian_zhi_xiang: 85,
      national_demand: 100,
      social_contribution: 90
    }
  },
  {
    id: 'startup',
    name: '创新创业路线',
    description: '追求创新创造，开创事业',
    corePrinciples: ['创新思维', '风险承担', '市场洞察'],
    nationalAlignment: '大众创业、万众创新',
    dimensionWeights: {
      holland_match: 70,
      career_anchor_match: 80,
      jia_guo_qing_huai: 75,
      yi_li_jian_gu: 70,
      ming_de_hong_dao: 70,
      shi_jian_zhi_xiang: 80,
      national_demand: 70,
      social_contribution: 75
    }
  },
  {
    id: 'stable',
    name: '稳定发展路线',
    description: '求稳务实，服务民生需求',
    corePrinciples: ['稳健可靠', '服务民生', '持续发展'],
    nationalAlignment: '公共服务、民生保障',
    dimensionWeights: {
      holland_match: 65,
      career_anchor_match: 75,
      jia_guo_qing_huai: 65,
      yi_li_jian_gu: 75,
      ming_de_hong_dao: 80,
      shi_jian_zhi_xiang: 60,
      national_demand: 60,
      social_contribution: 80
    }
  }
];

export function getTheoryById(id: string): Theory | undefined {
  return [...WESTERN_THEORIES, ...CHINESE_THEORIES].find(t => t.id === id);
}

export function getDimensionById(id: string): DimensionDefinition | undefined {
  return ASSESSMENT_DIMENSIONS.find(d => d.id === id);
}

export function getPathById(id: string): CareerPathDefinition | undefined {
  return CAREER_PATHS.find(p => p.id === id);
}

export function calculateFitScore(
  pathId: string,
  dimensionScores: Record<string, number>
): number {
  const path = getPathById(pathId);
  if (!path) return 0;
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const [dimId, weight] of Object.entries(path.dimensionWeights)) {
    const score = dimensionScores[dimId] || 50;
    weightedScore += score * weight;
    totalWeight += weight;
  }
  
  return Math.round(weightedScore / totalWeight);
}