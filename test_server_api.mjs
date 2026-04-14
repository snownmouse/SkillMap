import fetch from 'node-fetch';
import dotenv from 'dotenv';

// 加载 .env 文件中的环境变量
dotenv.config();

// 获取 API 密钥和配置
const apiKey = process.env.CUSTOM_LLM_API_KEY;
const baseUrl = process.env.CUSTOM_LLM_BASE_URL;
const model = process.env.CUSTOM_LLM_MODEL;

console.log(`API Key: ${apiKey}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Model: ${model}`);

// 模拟服务器中的 API 调用过程
async function testServerApi() {
  console.log('\n模拟服务器 API 调用...');
  
  // 构建请求体，与服务器中的格式一致
  const messages = [
    {
      role: "system",
      content: `你是一个专业技能树设计师。根据用户信息，生成一个个性化的技能树。\n\n## 用户信息\n专业：生物工程\n目标职业：研究员\n当前水平：zero\n每周投入：15小时\n补充说明：无\n已掌握技能：无\n\n## 输出要求\n严格输出JSON，不要输出任何其他文本。\n\n## JSON格式\n{\n  "career": "职业名称",\n  "summary": "一句话总结学习目标",\n  "estimated_months": 6,\n  "nodes": {\n    "node_id": {\n      "id": "唯一标识符（snake_case）",\n      "name": "技能名称（中文）",\n      "description": "一句话描述",\n      "category": "core|specialization|general",\n      "difficulty": "beginner|intermediate|advanced",\n      "status": "locked|available",\n      "progress": 0,\n      "dependencies": ["前置技能ID列表"],\n      "resources": [\n        {"name": "资源名称", "type": "course|book|practice|tool", "url": "可访问URL"}\n      ],\n      "subSkills": [],\n      "conversations": [],\n      "aiPendingMessage": null,\n      "lastActive": null,\n      "milestone": "完成这个技能后你能做到的事",\n      "estimatedHours": 40\n    }\n  },\n  "edges": [\n    {"from": "node_id_1", "to": "node_id_2", "type": "prerequisite"}\n  ],\n  "categories": [\n    {"id": "core", "name": "核心技能", "description": "入行必须掌握", "color": "#4A90D9", "order": 1},\n    {"id": "specialization", "name": "专业方向", "description": "深入领域", "color": "#E67E22", "order": 2},\n    {"id": "general", "name": "通用技能", "description": "跨领域能力", "color": "#9B59B6", "order": 3}\n  ],\n  "timeline": []\n}\n\n## 设计规则\n1. 节点数量：15-25个\n2. 每个节点estimatedHours在10-100之间\n3. dependencies必须引用已存在的node id，不能形成循环依赖\n4. 如果用户已有技能，把对应节点标记为status:"completed", progress:100\n5. 核心技能3-8个，专业方向5-10个，通用技能2-5个\n6. 没有前置依赖的节点status为"available"，有前置依赖的为"locked"`
    },
    {
      role: "user",
      content: "请为我生成技能树。"
    }
  ];

  const requestBody = {
    model: model,
    messages: messages,
    temperature: 0.3
  };

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  try {
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    const endTime = Date.now();
    
    console.log(`状态码: ${response.status}`);
    console.log(`API 调用耗时: ${endTime - startTime} ms`);
    
    const responseText = await response.text();
    console.log(`响应: ${responseText}`);
    
    // 尝试解析响应为 JSON
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n解析响应成功！');
      console.log(`模型: ${responseJson.model}`);
      console.log(`生成内容: ${responseJson.choices[0].message.content}`);
      console.log(`思考内容: ${responseJson.choices[0].message.reasoning_content}`);
      console.log(`Token 使用: ${responseJson.usage.total_tokens} (prompt: ${responseJson.usage.prompt_tokens}, completion: ${responseJson.usage.completion_tokens})`);
    } catch (error) {
      console.error('解析响应失败:', error);
    }
  } catch (error) {
    console.error(`API 调用失败: ${error}`);
  }
}

// 运行测试
testServerApi();
