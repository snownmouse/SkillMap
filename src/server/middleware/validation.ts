import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

interface ValidationRule<T> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message?: string;
}

type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export function validateBody<T extends Record<string, unknown>>(
  schema: ValidationSchema<T>
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const body = req.body as Record<string, unknown>;
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema) as [string, ValidationRule<unknown>][]) {
      const value = body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(rules.message || `${field} 是必填项`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(rules.message || `${field} 类型应为 ${rules.type}`);
          continue;
        }
      }

      if (rules.type === 'string' && typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(rules.message || `${field} 最少 ${rules.minLength} 个字符`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(rules.message || `${field} 最多 ${rules.maxLength} 个字符`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(rules.message || `${field} 格式不正确`);
        }
      }

      if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(rules.message || `${field} 最小值为 ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(rules.message || `${field} 最大值为 ${rules.max}`);
        }
      }
    }

    if (errors.length > 0) {
      next(new ValidationError(errors[0], { errors }));
      return;
    }

    next();
  };
}