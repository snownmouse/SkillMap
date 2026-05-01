export const validate = {
  required: (value: any, message: string = '此项为必填项'): string | null => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  },

  minLength: (value: string, min: number, message: string = `长度不能少于${min}个字符`): string | null => {
    if (!value || value.length < min) {
      return message;
    }
    return null;
  },

  maxLength: (value: string, max: number, message: string = `长度不能超过${max}个字符`): string | null => {
    if (value && value.length > max) {
      return message;
    }
    return null;
  },

  email: (value: string, message: string = '请输入有效的邮箱地址'): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || !emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  password: (value: string, minLength: number = 6, message?: string): string | null => {
    if (!value) {
      return '请输入密码';
    }
    if (value.length < minLength) {
      return message || `密码长度不能少于${minLength}个字符`;
    }
    return null;
  },

  passwordComplexity: (value: string, message: string = '密码必须包含大小写字母和数字'): string | null => {
    if (!value) return null;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return message;
    }
    return null;
  },

  number: (value: any, message: string = '请输入数字'): string | null => {
    if (value === null || value === undefined) return null;
    if (isNaN(Number(value))) {
      return message;
    }
    return null;
  },

  min: (value: number, min: number, message: string = `不能小于${min}`): string | null => {
    if (value < min) {
      return message;
    }
    return null;
  },

  max: (value: number, max: number, message: string = `不能大于${max}`): string | null => {
    if (value > max) {
      return message;
    }
    return null;
  },

  pattern: (value: string, pattern: RegExp, message: string): string | null => {
    if (!value || !pattern.test(value)) {
      return message;
    }
    return null;
  }
};

export function validateFields<T extends Record<string, any>>(fields: T, validations: Record<keyof T, ((value: any) => string | null)[]>): Record<keyof T, string | null> {
  const errors: Record<keyof T, string | null> = {} as Record<keyof T, string | null>;
  
  Object.entries(validations).forEach(([field, fieldValidations]) => {
    const value = fields[field as keyof T];
    for (const validation of fieldValidations) {
      const error = validation(value);
      if (error) {
        errors[field as keyof T] = error;
        break;
      }
    }
  });
  
  return errors;
}

export function isFormValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every(error => error === null);
}
