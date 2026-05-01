import { AbilityRepository } from '../repositories';
import { v4 as uuidv4 } from 'uuid';

interface ExtractedAbility {
  skill: string;
  confidence: 'high' | 'medium' | 'low';
  nodeId: string;
}

export class AbilityService {
  constructor(private abilityRepo: AbilityRepository) {}

  async recordAbilities(treeId: string, abilities: ExtractedAbility[]) {
    const results: any[] = [];

    for (const ability of abilities) {
      try {
        const existing = await this.abilityRepo.findExistingAbility(treeId, ability.skill);

        if (existing) {
          const existingConfidence = this.confidenceToNumber(existing.confidence);
          const newConfidence = this.confidenceToNumber(ability.confidence);

          if (newConfidence > existingConfidence) {
            await this.abilityRepo.updateAbility(existing.id, ability.confidence, ability.nodeId);
            results.push({ skill: ability.skill, action: 'updated', confidence: ability.confidence });
          } else {
            results.push({ skill: ability.skill, action: 'unchanged', confidence: existing.confidence });
          }
        } else {
          await this.abilityRepo.insertAbility({
            id: uuidv4(),
            treeId,
            skill: ability.skill,
            confidence: ability.confidence,
            nodeId: ability.nodeId,
          });
          results.push({ skill: ability.skill, action: 'added', confidence: ability.confidence });
        }
      } catch (error) {
        console.error(`[AbilityService] Error recording ability ${ability.skill}:`, error);
        results.push({ skill: ability.skill, action: 'error', error: String(error) });
      }
    }

    return results;
  }

  private confidenceToNumber(confidence: string): number {
    switch (confidence) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }
}
