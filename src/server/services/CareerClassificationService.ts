import { getDb } from '../database';
import { logger } from '../utils/logger';

interface CareerEntry {
  id: string;
  sn: string;
  name: string;
  description: string | null;
  gbmcode: string | null;
  level: number;
  parentSn: string | null;
  source: string;
}

interface CareerPath {
  category: string;
  subcategory: string;
  group: string;
  occupation: string;
}

export class CareerClassificationService {
  async searchCareers(query: string, limit: number = 20): Promise<CareerEntry[]> {
    const db = getDb();
    const likePattern = `%${query}%`;
    const result = await db.query(
      `SELECT * FROM career_classification
       WHERE name LIKE $1
         AND level = 4
       ORDER BY
         CASE WHEN name = $2 THEN 0
              WHEN name LIKE $3 THEN 1
              ELSE 2
         END,
         name
       LIMIT $4`,
      [likePattern, query, `${query}%`, limit]
    );
    return (result.rows || []).map(this.mapRow);
  }

  async getCareerBySn(sn: string): Promise<CareerEntry | null> {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM career_classification WHERE sn = $1',
      [sn]
    );
    if ((result.rows || []).length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getCareerByName(name: string): Promise<CareerEntry | null> {
    const db = getDb();
    const result = await db.query(
      `SELECT * FROM career_classification WHERE name = $1 AND level = 4 LIMIT 1`,
      [name]
    );
    if ((result.rows || []).length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getCareerPath(sn: string): Promise<CareerPath | null> {
    const parts = sn.split('-');
    if (parts.length < 4) return null;

    const parentSn3 = parts.slice(0, 3).join('-');
    const parentSn2 = parts.slice(0, 2).join('-');
    const parentSn1 = parts.slice(0, 1).join('-');

    const db = getDb();
    const [occupation, group, subcategory, category] = await Promise.all([
      db.query('SELECT name FROM career_classification WHERE sn = $1', [sn]),
      db.query('SELECT name FROM career_classification WHERE sn = $1', [parentSn3]),
      db.query('SELECT name FROM career_classification WHERE sn = $1', [parentSn2]),
      db.query('SELECT name FROM career_classification WHERE sn = $1', [parentSn1]),
    ]);

    return {
      occupation: occupation.rows?.[0]?.name || '',
      group: group.rows?.[0]?.name || '',
      subcategory: subcategory.rows?.[0]?.name || '',
      category: category.rows?.[0]?.name || '',
    };
  }

  async getCareersByIndustry(keywords: string[], limit: number = 30): Promise<CareerEntry[]> {
    const db = getDb();
    const conditions = keywords.map((_, i) => `(name LIKE $${i + 1} OR description LIKE $${i + 1})`);
    const params = keywords.map(k => `%${k}%`);
    params.push(String(limit));

    const result = await db.query(
      `SELECT * FROM career_classification
       WHERE level = 4 AND (${conditions.join(' OR ')})
       ORDER BY name
       LIMIT $${params.length}`,
      params
    );
    return (result.rows || []).map(this.mapRow);
  }

  async getCareerContext(careerName: string): Promise<{
    officialName: string | null;
    officialDescription: string | null;
    careerPath: CareerPath | null;
    demandInfo: string[];
  }> {
    const entry = await this.getCareerByName(careerName);
    if (!entry) {
      return { officialName: null, officialDescription: null, careerPath: null, demandInfo: [] };
    }

    const careerPath = await this.getCareerPath(entry.sn);
    const demandInfo = await this.getDemandInfo(entry.name);

    return {
      officialName: entry.name,
      officialDescription: entry.description,
      careerPath,
      demandInfo,
    };
  }

  private async getDemandInfo(occupation: string): Promise<string[]> {
    const db = getDb();
    const result = await db.query(
      `SELECT DISTINCT region, industry, shortage_level, source, publish_year
       FROM talent_demand
       WHERE occupation LIKE $1
       ORDER BY publish_year DESC, shortage_level
       LIMIT 5`,
      [`%${occupation}%`]
    );
    return (result.rows || []).map((r: any) =>
      `[${r.source}] ${r.region} ${r.industry}领域 · ${r.occupation} · 紧缺程度: ${r.shortage_level} (${r.publish_year})`
    );
  }

  async injectToPrompt(careerName: string): Promise<string> {
    try {
      const context = await this.getCareerContext(careerName);
      if (!context.officialName && !context.careerPath) {
        return '';
      }

      let block = '\n## 国家职业标准参考\n';
      if (context.careerPath) {
        block += `该职业在国家职业分类中的定位：\n`;
        block += `- 大类：${context.careerPath.category}\n`;
        if (context.careerPath.subcategory) {
          block += `- 中类：${context.careerPath.subcategory}\n`;
        }
        if (context.careerPath.group) {
          block += `- 小类：${context.careerPath.group}\n`;
        }
        block += `- 职业：${context.careerPath.occupation}\n`;
      }
      if (context.officialDescription) {
        block += `\n职业定义（国家职业分类大典）：\n${context.officialDescription}\n`;
      }
      if (context.demandInfo.length > 0) {
        block += `\n人才需求信息：\n`;
        context.demandInfo.forEach(info => {
          block += `- ${info}\n`;
        });
      }
      block += '\n请以上述国家职业标准为框架基础，在此基础上进行个性化扩展和细化。';

      return block;
    } catch {
      return '';
    }
  }

  private mapRow(row: any): CareerEntry {
    return {
      id: row.id,
      sn: row.sn,
      name: row.name,
      description: row.description || null,
      gbmcode: row.gbmcode || null,
      level: row.level,
      parentSn: row.parent_sn || null,
      source: row.source,
    };
  }
}

export const careerClassificationService = new CareerClassificationService();