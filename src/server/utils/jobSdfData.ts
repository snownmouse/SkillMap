// 基于Job-SDF数据的技能数据
export const skillsData = {
  // 前端开发技能
  frontend: [
    { id: 'html_css', name: 'HTML/CSS', category: 'core', demand: 95 },
    { id: 'javascript', name: 'JavaScript', category: 'core', demand: 90 },
    { id: 'react', name: 'React', category: 'core', demand: 85 },
    { id: 'typescript', name: 'TypeScript', category: 'core', demand: 80 },
    { id: 'responsive_design', name: '响应式设计', category: 'core', demand: 85 },
    { id: 'nodejs', name: 'Node.js', category: 'core', demand: 80 },
    { id: 'restful_api', name: 'RESTful API', category: 'core', demand: 75 },
    { id: 'vue', name: 'Vue.js', category: 'specialization', demand: 75 },
    { id: 'angular', name: 'Angular', category: 'specialization', demand: 65 },
    { id: 'css_frameworks', name: 'CSS框架', category: 'specialization', demand: 70 },
    { id: 'state_management', name: '状态管理', category: 'specialization', demand: 75 },
    { id: 'build_tools', name: '构建工具', category: 'general', demand: 65 },
    { id: 'performance_optimization', name: '性能优化', category: 'specialization', demand: 60 },
    { id: 'testing', name: '前端测试', category: 'general', demand: 55 },
    { id: 'pwa', name: '渐进式Web应用', category: 'specialization', demand: 50 },
    { id: 'accessibility', name: '无障碍设计', category: 'general', demand: 45 },
    { id: 'graphql', name: 'GraphQL', category: 'specialization', demand: 40 },
    { id: 'security', name: '前端安全', category: 'general', demand: 65 },
    { id: 'animation', name: '前端动画', category: 'specialization', demand: 45 },
    { id: 'seo', name: 'SEO优化', category: 'general', demand: 50 }
  ],
  
  // 后端开发技能
  backend: [
    { id: 'java', name: 'Java', category: 'core', demand: 85 },
    { id: 'python', name: 'Python', category: 'core', demand: 90 },
    { id: 'database', name: '数据库', category: 'core', demand: 95 },
    { id: 'restful_api', name: 'RESTful API', category: 'core', demand: 85 },
    { id: 'nodejs', name: 'Node.js', category: 'core', demand: 80 },
    { id: 'authentication', name: '身份认证', category: 'core', demand: 80 },
    { id: 'security', name: '后端安全', category: 'core', demand: 85 },
    { id: 'microservices', name: '微服务', category: 'specialization', demand: 70 },
    { id: 'cloud', name: '云服务', category: 'specialization', demand: 75 },
    { id: 'devops', name: 'DevOps', category: 'specialization', demand: 70 },
    { id: 'containerization', name: '容器化', category: 'specialization', demand: 65 },
    { id: 'scalability', name: '可扩展性', category: 'specialization', demand: 60 },
    { id: 'monitoring', name: '监控', category: 'general', demand: 55 },
    { id: 'csharp', name: 'C#', category: 'specialization', demand: 70 },
    { id: 'php', name: 'PHP', category: 'specialization', demand: 60 },
    { id: 'go', name: 'Go', category: 'specialization', demand: 65 },
    { id: 'ruby', name: 'Ruby', category: 'specialization', demand: 45 },
    { id: 'nosql', name: 'NoSQL数据库', category: 'specialization', demand: 65 },
    { id: 'message_queue', name: '消息队列', category: 'specialization', demand: 60 },
    { id: 'caching', name: '缓存技术', category: 'general', demand: 70 }
  ],
  
  // 数据科学技能
  data_science: [
    { id: 'python', name: 'Python', category: 'core', demand: 95 },
    { id: 'statistics', name: '统计学', category: 'core', demand: 85 },
    { id: 'machine_learning', name: '机器学习', category: 'core', demand: 90 },
    { id: 'data_analysis', name: '数据分析', category: 'core', demand: 85 },
    { id: 'sql', name: 'SQL', category: 'core', demand: 85 },
    { id: 'data_visualization', name: '数据可视化', category: 'core', demand: 80 },
    { id: 'deep_learning', name: '深度学习', category: 'specialization', demand: 75 },
    { id: 'big_data', name: '大数据', category: 'specialization', demand: 70 },
    { id: 'nlp', name: '自然语言处理', category: 'specialization', demand: 65 },
    { id: 'computer_vision', name: '计算机视觉', category: 'specialization', demand: 60 },
    { id: 'model_deployment', name: '模型部署', category: 'specialization', demand: 55 },
    { id: 'feature_engineering', name: '特征工程', category: 'specialization', demand: 70 },
    { id: 'experimentation', name: '实验设计', category: 'general', demand: 50 },
    { id: 'domain_knowledge', name: '领域知识', category: 'general', demand: 65 },
    { id: 'cloud_computing', name: '云计算', category: 'general', demand: 60 },
    { id: 'time_series', name: '时间序列分析', category: 'specialization', demand: 65 },
    { id: 'reinforcement_learning', name: '强化学习', category: 'specialization', demand: 55 },
    { id: 'dimensionality_reduction', name: '降维技术', category: 'specialization', demand: 50 },
    { id: 'ensemble_methods', name: '集成方法', category: 'specialization', demand: 60 },
    { id: 'model_evaluation', name: '模型评估', category: 'general', demand: 75 }
  ]
};

// 技能共现关系
export const skillCooccurrence = {
  // 前端技能共现
  frontend: [
    { skill1: 'html_css', skill2: 'javascript', frequency: 95 },
    { skill1: 'javascript', skill2: 'react', frequency: 90 },
    { skill1: 'react', skill2: 'typescript', frequency: 85 },
    { skill1: 'javascript', skill2: 'vue', frequency: 75 },
    { skill1: 'html_css', skill2: 'responsive_design', frequency: 80 },
    { skill1: 'react', skill2: 'state_management', frequency: 85 },
    { skill1: 'javascript', skill2: 'build_tools', frequency: 70 },
    { skill1: 'react', skill2: 'performance_optimization', frequency: 65 },
    { skill1: 'typescript', skill2: 'testing', frequency: 60 },
    { skill1: 'vue', skill2: 'state_management', frequency: 75 },
    { skill1: 'javascript', skill2: 'nodejs', frequency: 85 },
    { skill1: 'nodejs', skill2: 'restful_api', frequency: 80 },
    { skill1: 'react', skill2: 'graphql', frequency: 60 },
    { skill1: 'html_css', skill2: 'css_frameworks', frequency: 85 },
    { skill1: 'javascript', skill2: 'security', frequency: 70 },
    { skill1: 'react', skill2: 'seo', frequency: 55 },
    { skill1: 'typescript', skill2: 'build_tools', frequency: 75 },
    { skill1: 'vue', skill2: 'responsive_design', frequency: 70 },
    { skill1: 'react', skill2: 'pwa', frequency: 50 },
    { skill1: 'javascript', skill2: 'animation', frequency: 65 }
  ],
  
  // 后端技能共现
  backend: [
    { skill1: 'nodejs', skill2: 'restful_api', frequency: 90 },
    { skill1: 'python', skill2: 'database', frequency: 85 },
    { skill1: 'java', skill2: 'microservices', frequency: 80 },
    { skill1: 'nodejs', skill2: 'authentication', frequency: 85 },
    { skill1: 'database', skill2: 'restful_api', frequency: 95 },
    { skill1: 'microservices', skill2: 'cloud', frequency: 75 },
    { skill1: 'nodejs', skill2: 'devops', frequency: 70 },
    { skill1: 'java', skill2: 'security', frequency: 80 },
    { skill1: 'python', skill2: 'cloud', frequency: 75 },
    { skill1: 'devops', skill2: 'containerization', frequency: 85 },
    { skill1: 'java', skill2: 'database', frequency: 90 },
    { skill1: 'python', skill2: 'authentication', frequency: 75 },
    { skill1: 'microservices', skill2: 'message_queue', frequency: 80 },
    { skill1: 'cloud', skill2: 'devops', frequency: 85 },
    { skill1: 'database', skill2: 'nosql', frequency: 75 },
    { skill1: 'java', skill2: 'scalability', frequency: 70 },
    { skill1: 'python', skill2: 'security', frequency: 75 },
    { skill1: 'devops', skill2: 'monitoring', frequency: 80 },
    { skill1: 'nodejs', skill2: 'caching', frequency: 70 },
    { skill1: 'java', skill2: 'csharp', frequency: 65 }
  ],
  
  // 数据科学技能共现
  data_science: [
    { skill1: 'python', skill2: 'machine_learning', frequency: 95 },
    { skill1: 'python', skill2: 'data_analysis', frequency: 90 },
    { skill1: 'statistics', skill2: 'machine_learning', frequency: 85 },
    { skill1: 'machine_learning', skill2: 'deep_learning', frequency: 80 },
    { skill1: 'data_analysis', skill2: 'data_visualization', frequency: 90 },
    { skill1: 'python', skill2: 'sql', frequency: 85 },
    { skill1: 'machine_learning', skill2: 'nlp', frequency: 70 },
    { skill1: 'machine_learning', skill2: 'computer_vision', frequency: 65 },
    { skill1: 'deep_learning', skill2: 'model_deployment', frequency: 75 },
    { skill1: 'data_analysis', skill2: 'feature_engineering', frequency: 80 },
    { skill1: 'python', skill2: 'data_visualization', frequency: 85 },
    { skill1: 'statistics', skill2: 'data_analysis', frequency: 90 },
    { skill1: 'machine_learning', skill2: 'model_evaluation', frequency: 85 },
    { skill1: 'deep_learning', skill2: 'nlp', frequency: 75 },
    { skill1: 'big_data', skill2: 'cloud_computing', frequency: 80 },
    { skill1: 'machine_learning', skill2: 'time_series', frequency: 70 },
    { skill1: 'python', skill2: 'feature_engineering', frequency: 80 },
    { skill1: 'deep_learning', skill2: 'computer_vision', frequency: 85 },
    { skill1: 'machine_learning', skill2: 'ensemble_methods', frequency: 75 },
    { skill1: 'data_analysis', skill2: 'domain_knowledge', frequency: 70 }
  ]
};

// 职业分类映射
export const careerMapping = {
  '前端开发工程师': 'frontend',
  '前端工程师': 'frontend',
  'Web前端开发': 'frontend',
  '前端开发': 'frontend',
  '后端开发工程师': 'backend',
  '后端工程师': 'backend',
  '服务器开发': 'backend',
  '后端开发': 'backend',
  '数据科学家': 'data_science',
  '数据分析师': 'data_science',
  '机器学习工程师': 'data_science',
  'AI工程师': 'data_science'
};

// 获取职业对应的技能
export function getSkillsByCareer(career: string): Array<{ id: string; name: string; category: string; demand: number }> {
  const category = careerMapping[career] || 'frontend';
  return skillsData[category as keyof typeof skillsData] || skillsData.frontend;
}

// 获取技能共现关系
export function getSkillCooccurrence(career: string): Array<{ skill1: string; skill2: string; frequency: number }> {
  const category = careerMapping[career] || 'frontend';
  return skillCooccurrence[category as keyof typeof skillCooccurrence] || skillCooccurrence.frontend;
}

// 获取技能依赖关系
export function getSkillDependencies(career: string): Record<string, string[]> {
  const cooccurrence = getSkillCooccurrence(career);
  const dependencies: Record<string, string[]> = {};
  
  cooccurrence.forEach(({ skill1, skill2, frequency }) => {
    if (frequency >= 75) {
      if (!dependencies[skill2]) {
        dependencies[skill2] = [];
      }
      dependencies[skill2].push(skill1);
    }
  });
  
  return dependencies;
}
