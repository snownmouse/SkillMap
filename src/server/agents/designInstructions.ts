export interface ChineseDimensionScore {
  dimensionId: string;
  score: number;
}

interface CareerPath {
  id: string;
  name: string;
  category?: 'western' | 'chinese';
}

export interface DesignInstructions {
  nodeStructure: string[];
  practiceDesign: string[];
  narrativeTheme: string[];
  ancientWisdom: string[];
  nationalAlignment: string[];
  careerPathModifier: string;
}

function normalize(score: number): number {
  return Math.min(100, Math.max(0, score));
}

export function generateDesignInstructions(
  dimensions: ChineseDimensionScore[],
  selectedPath?: CareerPath
): DesignInstructions {
  const dimMap: Record<string, number> = {};
  for (const d of dimensions) {
    dimMap[d.dimensionId] = normalize(d.score);
  }

  const jiaGuo = dimMap['jia_guo_qing_huai'] ?? 50;
  const yiLi = dimMap['yi_li_jian_gu'] ?? 50;
  const mingDe = dimMap['ming_de_hong_dao'] ?? 50;
  const shiJian = dimMap['shi_jian_zhi_xiang'] ?? 50;

  const instructions: DesignInstructions = {
    nodeStructure: [],
    practiceDesign: [],
    narrativeTheme: [],
    ancientWisdom: [],
    nationalAlignment: [],
    careerPathModifier: '',
  };

  if (jiaGuo >= 80) {
    instructions.nodeStructure.push('专精节点whyItMatters中强调对国家战略领域的贡献');
    instructions.nodeStructure.push('每3-5个专精节点设置一个"国家战略关联"标签');
    instructions.nationalAlignment.push('科技自立自强/制造强国/数字中国/乡村振兴');
    instructions.ancientWisdom.push('天下兴亡匹夫有责');
  } else if (jiaGuo >= 60) {
    instructions.nodeStructure.push('专精节点whyItMatters中适当关联社会价值');
    instructions.nationalAlignment.push('行业高质量发展');
  }

  if (yiLi >= 80) {
    instructions.practiceDesign.push('通用技能节点中融入社会责任与职业道德维度');
    instructions.practiceDesign.push('节点deliverables中包含对社会/团队的影响说明');
    instructions.ancientWisdom.push('义利兼顾以义为先');
    instructions.narrativeTheme.push('技术伦理与社会责任');
  } else if (yiLi >= 60) {
    instructions.practiceDesign.push('通用技能节点中适当体现职业操守');
  }

  if (mingDe >= 80) {
    instructions.practiceDesign.push('milestone和masteryCriteria中添加德行修养要求');
    instructions.practiceDesign.push('学习过程中强调品格成长与能力成长并重');
    instructions.narrativeTheme.push('修身齐家与专业精进');
    instructions.ancientWisdom.push('天行健君子以自强不息');
  } else if (mingDe >= 60) {
    instructions.narrativeTheme.push('持续学习与自我完善');
  }

  if (shiJian >= 80) {
    instructions.nodeStructure.push('实践类节点（含项目产出）占比≥40%，减少纯理论节点');
    instructions.nodeStructure.push('每阶段末尾设置综合实践节点');
    instructions.practiceDesign.push('resources中强调hands-on学习方式');
    instructions.practiceDesign.push('deliverables要求可展示的实际作品或成果');
    instructions.narrativeTheme.push('知行合一');
    instructions.ancientWisdom.push('纸上得来终觉浅绝知此事要躬行');
  } else if (shiJian >= 60) {
    instructions.nodeStructure.push('实践类节点占比≥25%');
    instructions.narrativeTheme.push('学以致用');
  }

  if (selectedPath) {
    instructions.careerPathModifier = getPathModifier(selectedPath);
  }

  return instructions;
}

function getPathModifier(path: CareerPath): string {
  const modifiers: Record<string, string> = {
    'technical': '技术深耕路径：节点深度优先，单领域纵向深挖',
    'management': '管理发展路径：增加团队协作/项目管理/领导力节点',
    'composite': '复合发展路径：跨域连接节点增多，通用技能权重提升',
    'grassroots': '基层路线：增加群众工作/基层调研/项目落地节点',
    'national_strategy': '国家战略路径：节点与国家战略（科技/制造/数字/能源）强关联',
    'entrepreneurship': '创新创业路径：增加商业思维/市场分析/产品设计节点',
    'stable': '稳定发展路径：节点强调扎实基础/持续积累/规范操作',
  };
  return modifiers[path.id] || '';
}

export function formatInstructionsForPrompt(di: DesignInstructions): string {
  const lines: string[] = [];

  if (di.nodeStructure.length > 0) {
    lines.push('### 节点结构指令');
    for (const ins of di.nodeStructure) lines.push(`- ${ins}`);
  }

  if (di.practiceDesign.length > 0) {
    lines.push('### 练习与评估指令');
    for (const ins of di.practiceDesign) lines.push(`- ${ins}`);
  }

  if (di.careerPathModifier) {
    lines.push('### 路径专属指令');
    lines.push(`- ${di.careerPathModifier}`);
  }

  if (di.nationalAlignment.length > 0) {
    lines.push('### 国家战略对齐');
    lines.push(di.nationalAlignment.map(s => `"${s}"`).join('/'));
  }

  if (di.narrativeTheme.length > 0) {
    lines.push('### 成长叙事主题');
    lines.push(di.narrativeTheme.map(s => `"${s}"`).join('/'));
  }

  if (di.ancientWisdom.length > 0) {
    lines.push('### 经典引用');
    lines.push(di.ancientWisdom.map(s => `"${s}"`).join('/'));
  }

  return lines.join('\n');
}

export function selectAncientQuote(dimensions: ChineseDimensionScore[]): string {
  const dimMap: Record<string, number> = {};
  for (const d of dimensions) {
    dimMap[d.dimensionId] = normalize(d.score);
  }

  const jiaGuo = dimMap['jia_guo_qing_huai'] ?? 50;
  const shiJian = dimMap['shi_jian_zhi_xiang'] ?? 50;
  const mingDe = dimMap['ming_de_hong_dao'] ?? 50;
  const yiLi = dimMap['yi_li_jian_gu'] ?? 50;

  if (jiaGuo >= 80) return '天下兴亡，匹夫有责';
  if (shiJian >= 80) return '纸上得来终觉浅，绝知此事要躬行';
  if (mingDe >= 80) return '天行健，君子以自强不息';
  if (yiLi >= 80) return '君子爱财，取之有道';
  if (jiaGuo >= 60) return '修身、齐家、治国、平天下';
  if (shiJian >= 60) return '知行合一';
  return '不积跬步，无以至千里';
}