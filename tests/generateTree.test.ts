import { describe, expect, test } from 'vitest';
import { getGenerateTreePrompt } from '../src/server/prompts/generateTree';
import type { GenerateTreeRequest } from '../src/types/backend';

describe('getGenerateTreePrompt', () => {
  test('should generate prompt with all required fields', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '前端工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: '希望快速成长',
      existingSkills: ['HTML', 'CSS', 'JavaScript基础']
    };

    const { system, user } = getGenerateTreePrompt(inputs);

    expect(system).toBeDefined();
    expect(user).toBeDefined();
    expect(typeof system).toBe('string');
    expect(typeof user).toBe('string');
  });

  test('should include user information in system prompt', () => {
    const inputs: GenerateTreeRequest = {
      major: '软件工程',
      career: '全栈工程师',
      level: 'intermediate',
      weeklyHours: 15,
      notes: '有后端经验',
      existingSkills: ['Node.js', 'Python', 'SQL']
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('软件工程');
    expect(system).toContain('全栈工程师');
    expect(system).toContain('intermediate');
    expect(system).toContain('15');
    expect(system).toContain('有后端经验');
    expect(system).toContain('Node.js, Python, SQL');
  });

  test('should handle missing optional fields', () => {
    const inputs: GenerateTreeRequest = {
      major: '数学',
      career: '数据分析师',
      level: 'zero',
      weeklyHours: 10,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('数学');
    expect(system).toContain('数据分析师');
    expect(system).toContain('zero');
    expect(system).toContain('无');
  });

  test('should include theoretical framework in system prompt', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '软件工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain("Bloom's Taxonomy");
    expect(system).toContain('Constructivism');
    expect(system).toContain('Connectivism');
    expect(system).toContain('Cognitive Load Theory');
    expect(system).toContain('OKR');
    expect(system).toContain('Deliberate Practice');
    expect(system).toContain('Mastery Learning');
  });

  test('should include career education concepts', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '产品经理',
      level: 'intermediate',
      weeklyHours: 25,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('实践导向');
    expect(system).toContain('自强不息');
    expect(system).toContain('厚德载物');
    expect(system).toContain('精益求精');
  });

  test('should specify JSON output format', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: 'AI工程师',
      level: 'advanced',
      weeklyHours: 30,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('严格输出 JSON');
    expect(system).toContain('nodes');
    expect(system).toContain('edges');
    expect(system).toContain('categories');
  });

  test('should include design rules', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: 'DevOps工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('节点数量：25-40个');
    expect(system).toContain('estimatedHours 在 10-100 之间');
    expect(system).toContain('dependencies 必须引用已存在的 node id');
  });

  test('should handle edge cases with empty existingSkills', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '测试工程师',
      level: 'zero',
      weeklyHours: 10,
      notes: '',
      existingSkills: []
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('已掌握技能：无');
  });

  test('should handle edge cases with undefined existingSkills', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '测试工程师',
      level: 'zero',
      weeklyHours: 10,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('已掌握技能：无');
  });

  test('should validate prompt structure completeness', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '架构师',
      level: 'advanced',
      weeklyHours: 25,
      notes: '希望成为技术专家'
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('用户信息');
    expect(system).toContain('理论框架');
    expect(system).toContain('输出要求');
    expect(system).toContain('JSON格式');
    expect(system).toContain('设计规则');
  });

  test('should include all required node fields in JSON schema', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '后端工程师',
      level: 'intermediate',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    const requiredFields = [
      'id', 'name', 'description', 'whyItMatters', 'category',
      'difficulty', 'bloomLevel', 'status', 'progress', 'dependencies',
      'learningObjectives', 'deliverables', 'resources', 'milestone',
      'estimatedHours', 'practiceTips', 'steps', 'tools',
      'commonProblems', 'pitfalls', 'microMilestones',
      'masteryCriteria', 'unlockThreshold'
    ];

    requiredFields.forEach(field => {
      expect(system).toContain(field);
    });
  });

  test('should include all required top-level fields in JSON schema', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '前端架构师',
      level: 'advanced',
      weeklyHours: 30,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('"career"');
    expect(system).toContain('"summary"');
    expect(system).toContain('"version"');
    expect(system).toContain('"estimatedMonths"');
    expect(system).toContain('"overallObjective"');
    expect(system).toContain('"overallKeyResults"');
    expect(system).toContain('"nodes"');
    expect(system).toContain('"edges"');
    expect(system).toContain('"categories"');
    expect(system).toContain('"timeline"');
  });

  test('should handle special characters in notes', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '安全工程师',
      level: 'intermediate',
      weeklyHours: 20,
      notes: '特殊字符测试：\n换行\t制表符"引号\'单引号'
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('特殊字符测试');
    expect(system).toContain('换行');
    expect(system).toContain('制表符');
  });

  test('should handle very long notes', () => {
    const longNotes = 'A'.repeat(1000);
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: longNotes
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain(longNotes);
  });

  test('should handle all level values', () => {
    const levels: Array<'zero' | 'basic' | 'intermediate' | 'advanced'> =
      ['zero', 'basic', 'intermediate', 'advanced'];

    levels.forEach(level => {
      const inputs: GenerateTreeRequest = {
        major: '计算机科学',
        career: '工程师',
        level,
        weeklyHours: 20,
        notes: ''
      };

      const { system } = getGenerateTreePrompt(inputs);
      expect(system).toContain(level);
    });
  });

  test('should handle minimum weekly hours', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 1,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('每周投入：1小时');
  });

  test('should handle maximum weekly hours', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 168,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('每周投入：168小时');
  });

  test('should include mastery criteria levels', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('minimum');
    expect(system).toContain('proficient');
    expect(system).toContain('mastery');
  });

  test('should include bloom levels', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('remember');
    expect(system).toContain('understand');
    expect(system).toContain('apply');
    expect(system).toContain('analyze');
    expect(system).toContain('evaluate');
    expect(system).toContain('create');
  });

  test('should include category types', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('core');
    expect(system).toContain('specialization');
    expect(system).toContain('general');
  });

  test('should include difficulty levels', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('beginner');
    expect(system).toContain('intermediate');
    expect(system).toContain('advanced');
  });

  test('should include resource types', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { system } = getGenerateTreePrompt(inputs);

    expect(system).toContain('course');
    expect(system).toContain('book');
    expect(system).toContain('practice');
    expect(system).toContain('tool');
  });

  test('should verify user prompt is simple and clear', () => {
    const inputs: GenerateTreeRequest = {
      major: '计算机科学',
      career: '工程师',
      level: 'basic',
      weeklyHours: 20,
      notes: ''
    };

    const { user } = getGenerateTreePrompt(inputs);

    expect(user).toContain('职业技能树');
    expect(user).toContain('个人发展');
    expect(user).toContain('职业成长');
  });
});