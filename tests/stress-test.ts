const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

interface RequestResult {
  status: number;
  duration: number;
  ok: boolean;
  error?: string;
}

async function request(url: string, options?: RequestInit): Promise<RequestResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const duration = Date.now() - start;
    return { status: res.status, duration, ok: res.ok };
  } catch (error) {
    const duration = Date.now() - start;
    return { status: 0, duration, ok: false, error: String(error) };
  }
}

async function runScenario(name: string, fn: () => Promise<RequestResult>, concurrency: number, durationSec: number) {
  console.log(`\n=== ${name} ===`);
  console.log(`并发: ${concurrency}, 持续: ${durationSec}s`);

  let success = 0;
  let fail = 0;
  const durations: number[] = [];
  const endTime = Date.now() + durationSec * 1000;

  const workers = Array(concurrency).fill(null).map(async () => {
    while (Date.now() < endTime) {
      const result = await fn();
      if (result.ok) success++;
      else fail++;
      durations.push(result.duration);
    }
  });

  await Promise.all(workers);

  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
  const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  console.log(`成功: ${success}, 失败: ${fail}`);
  console.log(`响应时间 - 平均: ${avg}ms, P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
  console.log(`成功率: ${((success / (success + fail)) * 100).toFixed(1)}%`);

  return { name, success, fail, p50, p95, p99, avg };
}

async function main() {
  console.log('SkillMap 压力测试');
  console.log(`目标: ${BASE_URL}`);
  console.log(`开始时间: ${new Date().toISOString()}\n`);

  const results: any[] = [];

  results.push(await runScenario(
    '场景1: 健康检查',
    () => request(`${BASE_URL}/api/health`),
    50,
    30
  ));

  results.push(await runScenario(
    '场景2: 注册',
    () => {
      const username = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return request(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'Test123456!' }),
      });
    },
    20,
    30
  ));

  results.push(await runScenario(
    '场景3: 登录',
    () => request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'test' }),
    }),
    20,
    30
  ));

  results.push(await runScenario(
    '场景4: 职业列表',
    () => request(`${BASE_URL}/api/careers/list`),
    30,
    30
  ));

  results.push(await runScenario(
    '场景5: 技能树生成（无LLM调用）',
    () => request(`${BASE_URL}/api/trees/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ major: '计算机科学', targetJob: '前端工程师', level: '初级' }),
    }),
    10,
    30
  ));

  results.push(await runScenario(
    '场景6: 混合场景',
    () => {
      const rand = Math.random();
      if (rand < 0.3) return request(`${BASE_URL}/api/health`);
      if (rand < 0.5) return request(`${BASE_URL}/api/careers/list`);
      if (rand < 0.7) return request(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test' }),
      });
      return request(`${BASE_URL}/api/trees/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ major: '计算机科学', targetJob: '前端工程师', level: '初级' }),
      });
    },
    100,
    60
  ));

  console.log('\n========== 压测总结 ==========\n');
  console.log('场景 | 成功率 | P50 | P95 | P99');
  console.log('------|--------|-----|-----|-----');
  for (const r of results) {
    const rate = ((r.success / (r.success + r.fail)) * 100).toFixed(1);
    console.log(`${r.name} | ${rate}% | ${r.p50}ms | ${r.p95}ms | ${r.p99}ms`);
  }
}

main().catch(console.error);
