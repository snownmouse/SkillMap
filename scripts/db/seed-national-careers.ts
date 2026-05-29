import { initDatabase, getPool } from '../../src/server/database';
import { v4 as uuidv4 } from 'uuid';

const GITHUB_URL = 'https://raw.githubusercontent.com/leo4stone/ZHONGHUARENMINGONGHEGUOZHIYEFENLEIDADIAN/main/03_%E8%81%8C%E4%B8%9A%E5%88%86%E7%B1%BB%E5%A4%A7%E5%85%B82022_flattened.json';
const BATCH_SIZE = 100;

interface RawEntry {
  sn: string;
  name: string;
  desc?: string;
  gbmcode?: string;
}

function inferLevel(sn: string): number {
  const parts = sn.split('-');
  return parts.length;
}

async function downloadJson(): Promise<RawEntry[]> {
  const https = await import('https');
  return new Promise((resolve, reject) => {
    https.get(GITHUB_URL, { timeout: 60000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败，HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
          resolve(Array.isArray(data) ? data : [data]);
        } catch (e) {
          reject(new Error(`JSON 解析失败: ${(e as Error).message}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function seedCareerClassification() {
  console.log('正在从 GitHub 下载国家职业分类大典数据...');
  const entries = await downloadJson();
  console.log(`下载完成，共 ${entries.length} 条数据`);

  const db = getPool();
  let inserted = 0;
  let skipped = 0;

  const existingAll = await db.query('SELECT sn FROM career_classification');
  const existingSet = new Set((existingAll.rows || []).map((r: any) => r.sn));

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    for (const entry of batch) {
      if (!entry.sn || !entry.name) {
        skipped++;
        continue;
      }
      if (existingSet.has(entry.sn)) {
        skipped++;
        continue;
      }

      const level = inferLevel(entry.sn);
      const parentSn = entry.sn.split('-').length > 1
        ? entry.sn.split('-').slice(0, -1).join('-')
        : null;

      await db.query(
        `INSERT INTO career_classification (id, sn, name, description, gbmcode, level, parent_sn, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'national_occupation_classification')`,
        [
          uuidv4(),
          entry.sn,
          entry.name,
          entry.desc || null,
          entry.gbmcode || null,
          level,
          parentSn,
        ]
      );
      inserted++;
    }

    console.log(`  进度: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length} (已插入 ${inserted}, 跳过 ${skipped})`);
  }

  console.log(`\n职业分类数据导入完成:`);
  console.log(`  - 总计: ${entries.length}`);
  console.log(`  - 插入: ${inserted}`);
  console.log(`  - 跳过: ${skipped}`);
  return { inserted, skipped };
}

interface TalentDemandEntry {
  region: string;
  industry: string;
  occupation: string;
  shortageLevel: string;
  source: string;
  publishYear: number;
  details: string;
}

async function seedTalentDemand() {
  const demandData: TalentDemandEntry[] = [
    { region: '全国', industry: '人工智能', occupation: '人工智能算法工程师', shortageLevel: '非常紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '国家战略紧缺岗位，覆盖机器学习、深度学习、自然语言处理等方向' },
    { region: '全国', industry: '人工智能', occupation: 'AI训练师', shortageLevel: '比较紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '新职业，需求快速增长' },
    { region: '北京', industry: '新一代信息技术', occupation: '大模型算法工程师', shortageLevel: '非常紧缺', source: '北京市新质生产力人力资源目录', publishYear: 2024, details: '大模型研发岗位，纳入北京重点产业急需紧缺人才目录' },
    { region: '北京', industry: '新一代信息技术', occupation: '数据工程师', shortageLevel: '非常紧缺', source: '北京市新质生产力人力资源目录', publishYear: 2024, details: '大数据架构、数据治理方向' },
    { region: '北京', industry: '医药健康', occupation: '生物医药研究员', shortageLevel: '非常紧缺', source: '北京市新质生产力人力资源目录', publishYear: 2024, details: '创新药研发、基因治疗等方向' },
    { region: '粤港澳大湾区', industry: '新一代信息技术', occupation: '芯片设计工程师', shortageLevel: '非常紧缺', source: '粤港澳大湾区人才需求目录', publishYear: 2024, details: '集成电路设计、EDA工具开发' },
    { region: '粤港澳大湾区', industry: '智能装备', occupation: '工业机器人系统运维员', shortageLevel: '比较紧缺', source: '粤港澳大湾区人才需求目录', publishYear: 2024, details: '智能制造产线运维' },
    { region: '粤港澳大湾区', industry: '新能源', occupation: '新能源汽车工程师', shortageLevel: '比较紧缺', source: '粤港澳大湾区人才需求目录', publishYear: 2024, details: '电池技术、电控系统方向' },
    { region: '全国', industry: '网络安全', occupation: '网络安全工程师', shortageLevel: '非常紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '信息安全分析、渗透测试、安全架构' },
    { region: '全国', industry: '集成电路', occupation: '半导体工艺工程师', shortageLevel: '非常紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '芯片制造工艺、封测技术' },
    { region: '全国', industry: '智能制造', occupation: '自动化工程师', shortageLevel: '比较紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '工业自动化、PLC编程、产线数字化' },
    { region: '全国', industry: '数据科学', occupation: '数据分析师', shortageLevel: '比较紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '商业分析、数据可视化、统计建模' },
    { region: '全国', industry: '数字经济', occupation: '数字产品经理', shortageLevel: '比较紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '数字化转型、产品设计与管理' },
    { region: '北京', industry: '人工智能', occupation: 'AI产品经理', shortageLevel: '比较紧缺', source: '北京市新质生产力人力资源目录', publishYear: 2024, details: 'AI产品规划与落地' },
    { region: '北京', industry: '智能制造', occupation: '工业软件工程师', shortageLevel: '非常紧缺', source: '北京市新质生产力人力资源目录', publishYear: 2024, details: 'CAD/CAE/CAM研发、工业互联网平台' },
    { region: '全国', industry: '软件工程', occupation: '全栈工程师', shortageLevel: '比较紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '前后端开发、云原生架构' },
    { region: '全国', industry: '软件工程', occupation: '前端开发工程师', shortageLevel: '一般紧缺', source: '人社部人才需求目录', publishYear: 2024, details: 'Web前端、移动端开发' },
    { region: '全国', industry: '软件工程', occupation: '后端开发工程师', shortageLevel: '一般紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '服务器端开发、微服务架构' },
    { region: '全国', industry: '人工智能', occupation: '计算机视觉工程师', shortageLevel: '非常紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '图像识别、目标检测、视频分析' },
    { region: '全国', industry: '人工智能', occupation: 'NLP算法工程师', shortageLevel: '非常紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '自然语言处理、大语言模型应用' },
    { region: '粤港澳大湾区', industry: '金融科技', occupation: '区块链工程师', shortageLevel: '比较紧缺', source: '粤港澳大湾区人才需求目录', publishYear: 2024, details: '分布式账本、智能合约开发' },
    { region: '粤港澳大湾区', industry: '人工智能', occupation: '机器人算法工程师', shortageLevel: '非常紧缺', source: '粤港澳大湾区人才需求目录', publishYear: 2024, details: 'SLAM、运动规划、传感器融合' },
    { region: '北京', industry: '航天科技', occupation: '卫星通信工程师', shortageLevel: '比较紧缺', source: '北京市新质生产力人力资源目录', publishYear: 2024, details: '卫星互联网、通信协议' },
    { region: '全国', industry: '绿色低碳', occupation: '碳排放管理员', shortageLevel: '比较紧缺', source: '人社部人才需求目录', publishYear: 2024, details: '碳核算、碳交易、碳中和规划' },
  ];

  const db = getPool();
  let inserted = 0;

  for (const entry of demandData) {
    const existing = await db.query(
      `SELECT id FROM talent_demand WHERE occupation = $1 AND region = $2 AND industry = $3`,
      [entry.occupation, entry.region, entry.industry]
    );
    if ((existing.rows || []).length > 0) {
      continue;
    }

    await db.query(
      `INSERT INTO talent_demand (id, region, industry, occupation, shortage_level, source, publish_year, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), entry.region, entry.industry, entry.occupation, entry.shortageLevel, entry.source, entry.publishYear, entry.details]
    );
    inserted++;
  }

  console.log(`人才需求数据导入完成: 共 ${demandData.length} 条，新增 ${inserted} 条`);
  return { total: demandData.length, inserted };
}

async function main() {
  console.log('=== 国家职业数据库种子脚本 ===\n');

  try {
    await initDatabase();
    console.log('数据库连接成功\n');

    const careerResult = await seedCareerClassification();
    const demandResult = await seedTalentDemand();

    console.log('\n=== 导入汇总 ===');
    console.log(`职业分类: ${careerResult.inserted} 条新数据，${careerResult.skipped} 条跳过`);
    console.log(`人才需求: ${demandResult.inserted} 条新数据（共 ${demandResult.total} 条）`);
    console.log('\n种子数据导入完成！');

    process.exit(0);
  } catch (error) {
    console.error('\n导入失败:', error);
    process.exit(1);
  }
}

main();