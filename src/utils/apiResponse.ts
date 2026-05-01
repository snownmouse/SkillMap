export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export function successResponse<T = any>(data?: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

export function errorResponse(error: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    code
  };
}

export function paginatedResponse<T = any>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  return {
    success: true,
    data: {
      items: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  };
}
