export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
  return {
    success: true,
    data,
    error: null,
    ...(meta ? { meta } : {}),
  };
}

export function errorResponse(message: string, statusCode: number = 500) {
  return {
    success: false,
    data: null,
    error: message,
  };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    success: true,
    data,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
