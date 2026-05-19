import { generateDesignInstructions, formatInstructionsForPrompt, selectAncientQuote, DesignInstructions, ChineseDimensionScore } from './designInstructions';

export interface OrchestratorInput {
  profession: string;
  careerGoal: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  dimensions: ChineseDimensionScore[];
  selectedPath?: { id: string; name: string; description: string; nationalAlignment?: string };
}

export interface OrchestratorOutput {
  designInstructions: DesignInstructions;
  designInstructionsText: string;
  ancientQuote: string;
  nationalAlignmentSummary: string;
  narrativeSummary: string;
}

export class OrchestratorAgent {
  execute(input: OrchestratorInput): OrchestratorOutput {
    const designInstructions = generateDesignInstructions(input.dimensions, input.selectedPath);
    const designInstructionsText = formatInstructionsForPrompt(designInstructions);
    const ancientQuote = selectAncientQuote(input.dimensions);

    const hasNational = input.dimensions.some(d =>
      d.dimensionId === 'jia_guo_qing_huai' && d.score >= 60
    );
    const nationalAlignmentSummary = hasNational
      ? `你的技能发展方向与${(designInstructions.nationalAlignment || ['行业高质量发展']).join('、')}国家战略高度契合`
      : '';

    const narrativeSummary = designInstructions.narrativeTheme.length > 0
      ? `成长主题：${designInstructions.narrativeTheme.join('、')}`
      : '脚踏实地，持续精进';

    return {
      designInstructions,
      designInstructionsText,
      ancientQuote,
      nationalAlignmentSummary,
      narrativeSummary,
    };
  }
}

export const orchestratorAgent = new OrchestratorAgent();