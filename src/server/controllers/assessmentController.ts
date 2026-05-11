import { Request, Response } from 'express';
import { 
  CHINESE_ASSESSMENT_QUESTIONS, 
  ASSESSMENT_DIMENSIONS, 
  CAREER_PATHS, 
  calculateFitScore,
  getDimensionById,
  getPathById
} from '../prompts/theoryFramework';
import { logger } from '../utils/logger';
import { errors } from '../middleware/errorHandler';

export interface AssessmentQuestion {
  id: string;
  question: string;
  dimension: string;
  dimensionName: string;
  type: 'open' | 'scale' | 'multiple';
  options?: string[];
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string | number;
}

export interface AssessmentResult {
  dimensionScores: Record<string, number>;
  pathRecommendations: Array<{
    pathId: string;
    pathName: string;
    fitScore: number;
    dimensionWeights: Record<string, number>;
    nationalAlignment: string;
  }>;
  recommendedPath: string;
  dimensionInterpretations: Array<{
    dimensionId: string;
    dimensionName: string;
    score: number;
    interpretation: string;
  }>;
  insights: string[];
}

export const assessmentController = {
  async getQuestions(req: Request, res: Response) {
    try {
      const questions: AssessmentQuestion[] = CHINESE_ASSESSMENT_QUESTIONS.map(q => {
        const dimension = getDimensionById(q.dimension);
        return {
          id: q.id,
          question: q.question,
          dimension: q.dimension,
          dimensionName: dimension?.name || q.dimension,
          type: q.type,
          options: q.options
        };
      });

      res.json({
        success: true,
        data: {
          questions,
          dimensions: ASSESSMENT_DIMENSIONS.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description
          }))
        }
      });
    } catch (error) {
      logger.error('获取评估问题失败', error);
      res.status(500).json({ error: '获取评估问题失败' });
    }
  },

  async submitAnswers(req: Request, res: Response) {
    try {
      const answers: AssessmentAnswer[] = req.body.answers;
      if (!Array.isArray(answers) || answers.length === 0) {
        throw errors.validation('请至少提交一个答案');
      }

      const dimensionScores: Record<string, number> = {};
      ASSESSMENT_DIMENSIONS.forEach(d => {
        dimensionScores[d.id] = 50;
      });

      for (const answer of answers) {
        const question = CHINESE_ASSESSMENT_QUESTIONS.find(q => q.id === answer.questionId);
        if (!question) continue;

        let score = 50;
        
        if (typeof answer.answer === 'number') {
          score = Math.min(100, Math.max(0, answer.answer));
        } else if (typeof answer.answer === 'string') {
          const text = answer.answer.toLowerCase();
          if (text.includes('愿意') || text.includes('积极') || text.includes('贡献') || text.includes('国家') || text.includes('社会')) {
            score = Math.min(100, score + 30);
          }
          if (text.includes('责任') || text.includes('道德') || text.includes('修养')) {
            score = Math.min(100, score + 20);
          }
          if (text.includes('实践') || text.includes('基层')) {
            score = Math.min(100, score + 25);
          }
        }

        dimensionScores[question.dimension] = score;
      }

      const pathRecommendations = CAREER_PATHS.map(path => ({
        pathId: path.id,
        pathName: path.name,
        fitScore: calculateFitScore(path.id, dimensionScores),
        dimensionWeights: path.dimensionWeights,
        nationalAlignment: path.nationalAlignment
      })).sort((a, b) => b.fitScore - a.fitScore);

      const recommendedPath = pathRecommendations[0]?.pathId || 'tech';

      const dimensionInterpretations = ASSESSMENT_DIMENSIONS.map(dim => {
        const score = dimensionScores[dim.id] || 50;
        let interpretation = '';
        if (score >= 80) {
          interpretation = dim.interpretation.high;
        } else if (score >= 60) {
          interpretation = dim.interpretation.medium;
        } else {
          interpretation = dim.interpretation.low;
        }
        return {
          dimensionId: dim.id,
          dimensionName: dim.name,
          score,
          interpretation
        };
      });

      const insights: string[] = [];
      const highDimensions = dimensionInterpretations.filter(d => d.score >= 80);
      const lowDimensions = dimensionInterpretations.filter(d => d.score < 60);

      if (highDimensions.length > 0) {
        insights.push(`你的优势维度：${highDimensions.map(d => d.dimensionName).join('、')}`);
      }
      if (lowDimensions.length > 0) {
        insights.push(`可以提升的维度：${lowDimensions.map(d => d.dimensionName).join('、')}`);
      }

      const result: AssessmentResult = {
        dimensionScores,
        pathRecommendations,
        recommendedPath,
        dimensionInterpretations,
        insights
      };

      logger.info('评估完成', { 
        recommendedPath, 
        topScore: pathRecommendations[0]?.fitScore 
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('评估提交失败', error);
      res.status(500).json({ error: '评估提交失败，请稍后重试' });
    }
  },

  async getDimensions(req: Request, res: Response) {
    try {
      const dimensions = ASSESSMENT_DIMENSIONS.map(d => ({
        id: d.id,
        name: d.name,
        nameEn: d.nameEn,
        description: d.description,
        interpretation: d.interpretation,
        theorySource: d.theorySource
      }));

      res.json({
        success: true,
        data: dimensions
      });
    } catch (error) {
      logger.error('获取维度信息失败', error);
      res.status(500).json({ error: '获取维度信息失败' });
    }
  },

  async getCareerPaths(req: Request, res: Response) {
    try {
      const paths = CAREER_PATHS.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        corePrinciples: p.corePrinciples,
        nationalAlignment: p.nationalAlignment,
        dimensionWeights: p.dimensionWeights
      }));

      res.json({
        success: true,
        data: paths
      });
    } catch (error) {
      logger.error('获取职业路径失败', error);
      res.status(500).json({ error: '获取职业路径失败' });
    }
  }
};