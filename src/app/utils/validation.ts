/**
 * Утилиты для валидации форм
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ValidationRules {
  [field: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
    custom?: (value: any) => string | null;
    email?: boolean;
    match?: {
      field: string;
      message: string;
    };
  };
}

/**
 * Валидирует форму на основе правил
 */
export function validateForm(data: Record<string, any>, rules: ValidationRules): ValidationResult {
  const errors: Record<string, string> = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const fieldErrors: string[] = [];
    
    // Проверка на обязательность
    if (rule.required && (value === undefined || value === null || value === '')) {
      fieldErrors.push('Это поле обязательно для заполнения');
    }
    
    // Проверка минимальной длины
    if (rule.minLength && value && value.length < rule.minLength) {
      fieldErrors.push(`Минимальная длина: ${rule.minLength} символов`);
    }
    
    // Проверка максимальной длины
    if (rule.maxLength && value && value.length > rule.maxLength) {
      fieldErrors.push(`Максимальная длина: ${rule.maxLength} символов`);
    }
    
    // Проверка по регулярному выражению
    if (rule.pattern && value && !rule.pattern.test(value)) {
      fieldErrors.push(rule.patternMessage || 'Неверный формат');
    }
    
    // Проверка email
    if (rule.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        fieldErrors.push('Введите корректный email адрес');
      }
    }
    
    // Пользовательская валидация
    if (rule.custom && value) {
      const customError = rule.custom(value);
      if (customError) {
        fieldErrors.push(customError);
      }
    }
    
    // Проверка совпадения полей
    if (rule.match && value !== data[rule.match.field]) {
      fieldErrors.push(rule.match.message);
    }
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors.join('. ');
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Правила валидации для регистрации
 */
export const registrationRules: ValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  email: {
    required: true,
    email: true,
    maxLength: 100
  }
};

/**
 * Правила валидации для входа
 */
export const loginRules: ValidationRules = {
  email: {
    required: true,
    email: true
  },
  code: {
    required: true,
    pattern: /^\d{6}$/,
    patternMessage: 'Код должен состоять из 6 цифр'
  }
};

/**
 * Правила валидации для создания чата
 */
export const chatRules: ValidationRules = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 100
  }
};

/**
 * Правила валидации для сообщений
 */
export const messageRules: ValidationRules = {
  text: {
    maxLength: 5000
  }
};

/**
 * Правила валидации для профиля
 */
export const profileRules: ValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    patternMessage: 'Имя пользователя может содержать только буквы, цифры и нижнее подчеркивание'
  },
  bio: {
    maxLength: 500
  }
};

/**
 * Валидирует email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Валидирует код подтверждения
 */
export function validateVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Валидирует имя пользователя
 */
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

/**
 * Валидирует пароль (если будет добавлен в будущем)
 */
export function validatePassword(password: string): boolean {
  // Минимум 8 символов, хотя бы одна буква и одна цифра
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password);
}

/**
 * Получает сообщение об ошибке для поля
 */
export function getFieldError(field: string, value: any, rules: ValidationRules): string | null {
  const rule = rules[field];
  if (!rule) return null;
  
  // Проверка на обязательность
  if (rule.required && (value === undefined || value === null || value === '')) {
    return 'Это поле обязательно для заполнения';
  }
  
  // Проверка минимальной длины
  if (rule.minLength && value && value.length < rule.minLength) {
    return `Минимальная длина: ${rule.minLength} символов`;
  }
  
  // Проверка максимальной длины
  if (rule.maxLength && value && value.length > rule.maxLength) {
    return `Максимальная длина: ${rule.maxLength} символов`;
  }
  
  // Проверка по регулярному выражению
  if (rule.pattern && value && !rule.pattern.test(value)) {
    return rule.patternMessage || 'Неверный формат';
  }
  
  // Проверка email
  if (rule.email && value && !validateEmail(value)) {
    return 'Введите корректный email адрес';
  }
  
  // Пользовательская валидация
  if (rule.custom && value) {
    return rule.custom(value);
  }
  
  return null;
}

/**
 * Проверяет, есть ли ошибки в форме
 */
export function hasFormErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Сбрасывает ошибки формы
 */
export function resetFormErrors(): Record<string, string> {
  return {};
}