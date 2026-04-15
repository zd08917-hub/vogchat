/**
 * Утилиты для обработки ошибок
 */

import { toast } from "sonner";

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Классифицирует ошибку и возвращает понятное сообщение
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    if (apiError.message) {
      return apiError.message;
    }
  }
  
  return 'Произошла неизвестная ошибка';
}

/**
 * Обрабатывает ошибку API с показом уведомления
 */
export function handleApiError(error: unknown, context: string = ''): void {
  console.error(`[API Error] ${context}:`, error);
  
  const message = getErrorMessage(error);
  let userMessage = message;
  
  // Добавляем контекст к сообщению
  if (context) {
    userMessage = `${context}: ${message}`;
  }
  
  // Показываем уведомление пользователю
  toast.error(userMessage, {
    duration: 5000,
    position: 'top-right',
  });
}

/**
 * Обрабатывает ошибку сети
 */
export function handleNetworkError(error: unknown, context: string = ''): void {
  console.error(`[Network Error] ${context}:`, error);
  
  const message = 'Ошибка сети. Проверьте подключение к интернету.';
  const userMessage = context ? `${context}: ${message}` : message;
  
  toast.error(userMessage, {
    duration: 5000,
    position: 'top-right',
  });
}

/**
 * Обрабатывает ошибку валидации
 */
export function handleValidationError(message: string): void {
  toast.error(message, {
    duration: 3000,
    position: 'top-right',
  });
}

/**
 * Обрабатывает ошибку авторизации
 */
export function handleAuthError(message: string = 'Ошибка авторизации'): void {
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
  
  // При ошибке авторизации можно перенаправить на страницу входа
  if (message.includes('не авторизован') || message.includes('сессия истекла')) {
    setTimeout(() => {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('registeredUser');
      window.location.href = '/registration';
    }, 2000);
  }
}

/**
 * Обрабатывает успешное действие
 */
export function handleSuccess(message: string): void {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
}

/**
 * Проверяет, является ли ошибка ошибкой сети
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return true;
  }
  
  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.status === 0 || err.message?.includes('network') || err.message?.includes('Network')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Проверяет, является ли ошибка ошибкой авторизации
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.status === 401 || err.message?.includes('не авторизован') || err.message?.includes('авторизация')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Создает объект ошибки API
 */
export function createApiError(message: string, status?: number, code?: string, details?: any): ApiError {
  return {
    message,
    status,
    code,
    details
  };
}