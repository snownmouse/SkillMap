const fetch = require('node-fetch');
const dotenv = require('dotenv');

// 加载 .env 文件中的环境变量
dotenv.config();

// 获取 API 密钥和配置
const apiKey = process.env.CUSTOM_LLM_API_KEY;
const baseUrl = process.env.CUSTOM_LLM_BASE_URL;
const model = process.env.CUSTOM_LLM_MODEL;

console.log(`API Key: ${apiKey}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Model: ${model}`);

// 测试 /chat/completions 端点
async function testChatCompletions() {
  console.log('\n测试 /chat/completions 端点...');
  const chatUrl = `${baseUrl}/chat/completions`;
  const chatPayload = {
    model: model,
    messages: [
      {
        role: "user",
        content: "hello"
      }
    ],
    temperature: 0.3
  };

  const chatHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  try {
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: chatHeaders,
      body: JSON.stringify(chatPayload)
    });
    
    console.log(`状态码: ${response.status}`);
    console.log(`响应: ${await response.text()}`);
  } catch (error) {
    console.error(`错误: ${error}`);
  }
}

// 运行测试
testChatCompletions();
