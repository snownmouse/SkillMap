import { Router } from 'express';
import { llmService } from '../llmService';
import { getGenerateTreePrompt } from '../prompts/generateTree';

export const benchmarkRouter = Router();

benchmarkRouter.post('/skills/prerequisites', async (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill) {
      return res.status(400).json({ success: false, error: '技能名称是必填项' });
    }

    const systemPrompt = `你是一个专业的职业技能分析师。`;
    const userPrompt = `任务：预测技能"${skill}"需要哪些前置技能。

请根据以下原则进行预测：
1. 前置技能应该是学习"${skill}"必须先掌握的基础技能
2. 只列出直接的、必不可少的前置技能
3. 不要列出太基础的通用技能（如"阅读理解"）
4. 按照重要性排序，列出最重要的5-10个前置技能

请以JSON格式输出，格式如下：
{
  "skill": "${skill}",
  "prerequisites": ["技能1", "技能2", ...]
}

只输出JSON，不要有其他内容。`;

    const result = await llmService.chatJSON(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || '处理失败' });
  }
});

benchmarkRouter.post('/careers/plan', async (req, res) => {
  try {
    const { currentPosition, targetPosition, yearsOfExperience } = req.body;
    if (!currentPosition || !targetPosition) {
      return res.status(400).json({ success: false, error: '当前职位和目标职位是必填项' });
    }

    const systemPrompt = `你是一个专业的职业发展顾问。`;
    const userPrompt = `任务：为从"${currentPosition}"到"${targetPosition}"的职业发展规划路径。

已知信息：
- 当前职位：${currentPosition}
- 目标职位：${targetPosition}
- 工作年限：${yearsOfExperience || 0}年

请根据职业发展规律，规划合理的晋升路径：
1. 路径应该包含3-6个阶段
2. 每个阶段应该是合理的职位晋升
3. 考虑行业标准的发展路径
4. 给出每个阶段预计的时间

请以JSON格式输出，格式如下：
{
  "path": [
    {"position": "职位1", "years": 2},
    {"position": "职位2", "years": 3},
    ...
  ]
}

只输出JSON，不要有其他内容。`;

    const result = await llmService.chatJSON(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || '处理失败' });
  }
});

benchmarkRouter.post('/skills/tree', async (req, res) => {
  try {
    const { career, major = '计算机科学', level = 'beginner', weeklyHours = 10 } = req.body;
    if (!career) {
      return res.status(400).json({ success: false, error: '职业名称是必填项' });
    }

    const inputs = {
      career,
      major,
      level,
      weeklyHours,
      existingSkills: [],
      notes: '',
    };

    const { system, user } = await getGenerateTreePrompt(inputs as any);
    
    const result = await llmService.chatJSON(system, user);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || '处理失败' });
  }
});
