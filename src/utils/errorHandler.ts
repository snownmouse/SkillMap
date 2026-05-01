export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTH = 'auth',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  details?: any;
}

export function createError(message: string, type: ErrorType = ErrorType.UNKNOWN, details?: any): AppError {
  return {
    message,
    type,
    details
  };
}

export function handleApiError(error: any): AppError {
  if (error instanceof Error) {
    // 网络错误
    if (error.message.includes('Network') || error.message.includes('网络')) {
      return createError('网络连接异常，请检查网络后重试', ErrorType.NETWORK);
    }
    // 认证错误
    if (error.message.includes('登录') || error.message.includes('未授权')) {
      return createError(error.message, ErrorType.AUTH);
    }
    // 验证错误
    if (error.message.includes('验证') || error.message.includes('参数')) {
      return createError(error.message, ErrorType.VALIDATION);
    }
    // 其他错误
    return createError(error.message, ErrorType.UNKNOWN);
  }
  
  if (error?.error) {
    return createError(error.error, ErrorType.UNKNOWN);
  }
  
  return createError('操作失败，请稍后重试', ErrorType.UNKNOWN);
}

export function showErrorToast(error: AppError | string) {
  const errorObj = typeof error === 'string' ? createError(error) : error;
  
  // 这里可以集成第三方 toast 库
  // 暂时使用 console.error 作为示例
  console.error('Error:', errorObj.message);
  
  // 未来可以替换为：
  // toast.error(errorObj.message, {
  //   position: 'top-right',
  //   autoClose: 3000
  // });
}

export function handleError(error: any, fallbackMessage = '操作失败') {
  const appError = handleApiError(error);
  showErrorToast(appError);
  return appError;
}
