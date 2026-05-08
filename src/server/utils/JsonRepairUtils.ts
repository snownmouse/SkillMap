import type { SkillTreeData } from '../../types/skillTree';
import { validateSkillTreeData } from '../../utils/jsonValidator';

export class JsonRepairUtils {
  static validateSkillTreeData(data: any): SkillTreeData {
    return validateSkillTreeData(data);
  }

  static tryParse(text: string): any {
    let cleanText = text.trim();
    
    cleanText = cleanText.replace(/^```(?:json)?\s*|\s*```$/g, '');
    
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      const fixedText = this.applyRepairStrategies(cleanText);
      
      try {
        return JSON.parse(fixedText);
      } catch (e2) {
        return this.extractAndParse(fixedText);
      }
    }
  }

  static tryParseWithSchema<T>(text: string, schema: JsonSchema, maxRetries = 0): { data: T | null; errors: string[]; partial: boolean } {
    const errors: string[] = [];
    
    try {
      const parsed = this.tryParse(text);
      
      if (parsed === null || parsed === undefined) {
        errors.push('解析结果为空');
        return { data: null, errors, partial: false };
      }

      const validation = this.validateSchema(parsed, schema);
      
      if (validation.valid) {
        return { data: parsed as T, errors: [], partial: false };
      }

      errors.push(...validation.errors);

      const repaired = this.repairWithSchema(parsed, schema);
      const reValidation = this.validateSchema(repaired, schema);

      if (reValidation.valid) {
        return { data: repaired as T, errors: [], partial: false };
      }

      if (reValidation.errors.length < validation.errors.length) {
        return { data: repaired as T, errors: reValidation.errors, partial: true };
      }

      return { data: parsed as T, errors: validation.errors, partial: true };
    } catch (e) {
      errors.push(`JSON解析失败: ${(e as Error).message}`);
      return { data: null, errors, partial: false };
    }
  }

  static validateSchema(data: any, schema: JsonSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (schema.type === 'object' && schema.properties) {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push(`期望类型为object，实际为${typeof data}`);
        return { valid: false, errors };
      }

      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (propSchema.required && (data[key] === undefined || data[key] === null)) {
          if (propSchema.defaultValue !== undefined) {
            data[key] = propSchema.defaultValue;
          } else {
            errors.push(`缺少必需字段: ${key}`);
          }
        }

        if (data[key] !== undefined && data[key] !== null) {
          const propError = this.validateProperty(data[key], key, propSchema);
          if (propError) errors.push(propError);
        }
      }
    }

    if (schema.type === 'array' && schema.items) {
      if (!Array.isArray(data)) {
        errors.push(`期望类型为array，实际为${typeof data}`);
        return { valid: false, errors };
      }

      data.forEach((item: any, index: number) => {
        const itemResult = this.validateSchema(item, schema.items!);
        if (!itemResult.valid) {
          errors.push(`数组项[${index}]: ${itemResult.errors.join(', ')}`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  private static validateProperty(value: any, key: string, schema: JsonProperty): string | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (schema.type && actualType !== schema.type) {
      if (schema.type === 'number' && typeof value === 'string') {
        const num = Number(value);
        if (!isNaN(num)) return null;
      }
      return `字段${key}期望类型为${schema.type}，实际为${actualType}`;
    }

    if (schema.enum && !schema.enum.includes(value)) {
      return `字段${key}的值"${value}"不在允许的枚举值中: ${schema.enum.join(', ')}`;
    }

    if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) {
      return `字段${key}长度不足，最小${schema.minLength}个字符`;
    }

    if (schema.minItems && Array.isArray(value) && value.length < schema.minItems) {
      return `字段${key}数组长度不足，最少${schema.minItems}项`;
    }

    return null;
  }

  private static repairWithSchema(data: any, schema: JsonSchema): any {
    if (schema.type === 'object' && schema.properties) {
      const repaired: any = {};

      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (data[key] !== undefined && data[key] !== null) {
          repaired[key] = this.repairProperty(data[key], propSchema);
        } else if (propSchema.defaultValue !== undefined) {
          repaired[key] = propSchema.defaultValue;
        }
      }

      for (const [key, value] of Object.entries(data)) {
        if (!(key in repaired)) {
          repaired[key] = value;
        }
      }

      return repaired;
    }

    return data;
  }

  private static repairProperty(value: any, schema: JsonProperty): any {
    if (schema.type === 'number' && typeof value === 'string') {
      const num = Number(value);
      if (!isNaN(num)) return num;
    }

    if (schema.type === 'string' && typeof value !== 'string') {
      return String(value);
    }

    if (schema.type === 'boolean' && typeof value !== 'boolean') {
      if (value === 'true' || value === 1) return true;
      if (value === 'false' || value === 0) return false;
    }

    if (schema.type === 'array' && !Array.isArray(value)) {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
      return [value];
    }

    if (schema.enum && !schema.enum.includes(value) && schema.enum.length > 0) {
      return schema.defaultValue !== undefined ? schema.defaultValue : schema.enum[0];
    }

    return value;
  }

  private static applyRepairStrategies(text: string): string {
    let fixed = text;
    
    fixed = this.fixControlCharacters(fixed);
    fixed = this.decodeHtmlEntities(fixed);
    fixed = this.fixUnescapedQuotes(fixed);
    fixed = this.fixTrailingCommas(fixed);
    fixed = this.fixTruncatedJson(fixed);
    fixed = this.fixSingleQuotes(fixed);
    fixed = this.fixMissingQuotes(fixed);
    fixed = this.fixUnicodeEscapes(fixed);
    
    return fixed;
  }

  private static fixSingleQuotes(text: string): string {
    let result = '';
    let inDoubleQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '"' && (i === 0 || text[i - 1] !== '\\')) {
        inDoubleQuote = !inDoubleQuote;
        result += char;
      } else if (char === "'" && !inDoubleQuote) {
        result += '"';
      } else {
        result += char;
      }
    }
    
    return result;
  }

  private static fixMissingQuotes(text: string): string {
    return text.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  }

  private static fixUnicodeEscapes(text: string): string {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  }
  
  private static decodeHtmlEntities(text: string): string {
    let result = text;
    result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return result;
  }
  
  private static fixUnescapedQuotes(text: string): string {
    const result: string[] = [];
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (escapeNext) {
        result.push(char);
        escapeNext = false;
      } else if (char === '\\') {
        result.push(char);
        escapeNext = true;
      } else if (char === '"') {
        if (inString) {
          if (this.isStringEnd(text, i)) {
            result.push(char);
            inString = false;
          } else {
            result.push('\\"');
          }
        } else {
          result.push(char);
          inString = true;
        }
      } else {
        result.push(char);
      }
    }
    
    return result.join('');
  }
  
  private static isStringEnd(text: string, index: number): boolean {
    const prevChar = index > 0 ? text[index - 1] : '';
    if (prevChar === '\\') return false;
    
    let j = index + 1;
    while (j < text.length && /\s/.test(text[j])) {
      j++;
    }
    const nextChar = j < text.length ? text[j] : '';
    
    return nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === '';
  }
  
  private static fixControlCharacters(text: string): string {
    return text
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
  
  private static fixTrailingCommas(text: string): string {
    let fixed = text;
    fixed = fixed.replace(/,\s*\}/g, '}');
    fixed = fixed.replace(/,\s*\]/g, ']');
    fixed = fixed.replace(/,\s*$/, '');
    return fixed;
  }
  
  private static fixTruncatedJson(text: string): string {
    let fixed = text;
    
    const stack: string[] = [];
    let inString = false;
    let escapeNext = false;
    
    for (const char of fixed) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
    
    if (inString) fixed += '"';
    fixed += stack.reverse().join('');
    
    return fixed;
  }
  
  private static extractAndParse(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        const simplified = this.simplifyJson(jsonMatch[0]);
        try {
          return JSON.parse(simplified);
        } catch (e2) {
          const allJsonMatches = text.match(/\{[\s\S]*\}/g);
          if (allJsonMatches) {
            allJsonMatches.sort((a, b) => b.length - a.length);
            
            for (const match of allJsonMatches) {
              try {
                return JSON.parse(match);
              } catch (e3) {
              }
            }
          }
          throw e2;
        }
      }
    }
    throw new Error('无法提取有效的JSON结构');
  }
  
  private static simplifyJson(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, JsonProperty>;
  items?: JsonSchema;
}

export interface JsonProperty {
  type: string;
  required?: boolean;
  defaultValue?: any;
  enum?: any[];
  minLength?: number;
  minItems?: number;
  properties?: Record<string, JsonProperty>;
  items?: JsonSchema;
}
