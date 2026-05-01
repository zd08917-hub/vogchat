import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Mail, AlertCircle, Lock, Key } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/ui/input-otp";
import { validateForm, loginRules, getFieldError } from "../utils/validation";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "verification">("email");
  const [loginMethod, setLoginMethod] = useState<"email_code" | "password">("email_code");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [checkingPasswordStatus, setCheckingPasswordStatus] = useState(false);

  // Валидация формы email
  const validateEmailForm = () => {
    const formData = { email };
    const result = validateForm(formData, loginRules);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  // Валидация формы верификации
  const validateVerificationForm = () => {
    const formData = { code };
    const result = validateForm(formData, loginRules);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  // Обработчик изменения поля с валидацией в реальном времени
  const handleFieldChange = (field: string, value: string) => {
    if (field === 'email') setEmail(value);
    if (field === 'code') setCode(value);
    if (field === 'password') setPassword(value);

    // Помечаем поле как "тронутое"
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Валидируем поле в реальном времени
    if (touchedFields[field]) {
      const formData = field === 'code' ? { code: value } : { email };
      const error = getFieldError(field, value, loginRules);
      
      setValidationErrors(prev => {
        if (error) {
          return { ...prev, [field]: error };
        } else {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        }
      });
    }
  };

  // Сброс ошибок при смене шага
  useEffect(() => {
    setValidationErrors({});
    setTouchedFields({});
  }, [step]);

  // Проверить, есть ли у пользователя пароль
  const checkPasswordStatus = async () => {
    if (!email || !validateEmailForm()) {
      setTouchedFields(prev => ({ ...prev, email: true }));
      return;
    }

    setCheckingPasswordStatus(true);
    try {
      // Сначала ищем пользователя по email
      const userResponse = await fetch(`http://localhost:3001/api/users?email=${encodeURIComponent(email)}`);
      const users = await userResponse.json();
      
      if (!users || users.length === 0) {
        // Пользователь не найден, предлагаем зарегистрироваться
        toast.info("Пользователь не найден. Зарегистрируйтесь, чтобы создать аккаунт.");
        navigate("/register");
        return;
      }

      const user = users[0];
      
      // Проверяем, есть ли у пользователя пароль
      const response = await fetch(`http://localhost:3001/api/auth/has-password?userId=${user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.hasPassword) {
          // У пользователя есть пароль, предлагаем выбор метода входа
          setLoginMethod("password");
          toast.info("У вас есть пароль. Вы можете войти по паролю или получить код на email.");
        } else {
          // У пользователя нет пароля, используем email-код
          setLoginMethod("email_code");
          handleSendCode();
        }
      } else {
        // Если ошибка, используем email-код по умолчанию
        setLoginMethod("email_code");
        handleSendCode();
      }
    } catch (error) {
      console.error("Failed to check password status:", error);
      // В случае ошибки используем email-код
      setLoginMethod("email_code");
      handleSendCode();
    } finally {
      setCheckingPasswordStatus(false);
    }
  };

  const handleSendCode = async () => {
    // Валидация формы
    if (!validateEmailForm()) {
      setTouchedFields(prev => ({ ...prev, email: true }));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'login' }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("Код отправлен на ваш email");
        setStep("verification");
      } else {
        toast.error(data.error || "Не удалось отправить код");
      }
    } catch (error) {
      console.error("Failed to send code:", error);
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // Вход по паролю
  const handlePasswordLogin = async () => {
    if (!validateEmailForm()) {
      setTouchedFields(prev => ({ ...prev, email: true }));
      return;
    }

    if (!password) {
      toast.error("Введите пароль");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Сохраняем данные пользователя
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('registeredUser', JSON.stringify(data.user));
        localStorage.setItem('currentUserId', data.user.id);
        
        toast.success("Вход выполнен успешно!");
        navigate("/");
      } else {
        if (data.requiresEmailCode) {
          // Если у пользователя нет пароля, предлагаем войти по email-коду
          toast.info("У вас не установлен пароль. Используйте вход по email-коду.");
          setLoginMethod("email_code");
          handleSendCode();
        } else {
          toast.error(data.error || "Неверный пароль");
        }
      }
    } catch (error) {
      console.error("Failed to login with password:", error);
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    // Валидация формы верификации
    if (!validateVerificationForm()) {
      setTouchedFields(prev => ({ ...prev, code: true }));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose: 'login' }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Сохраняем данные пользователя
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('registeredUser', JSON.stringify(data.user));
        localStorage.setItem('currentUserId', data.user.id);
        
        toast.success("Вход выполнен успешно!");
        navigate("/");
      } else {
        toast.error(data.error || "Неверный код");
      }
    } catch (error) {
      console.error("Failed to verify code:", error);
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Вход в мессенджер
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {loginMethod === "password"
              ? "Введите email и пароль для входа"
              : "Введите email для получения кода подтверждения"}
          </p>
        </div>

        {step === "email" ? (
          <div className="space-y-6">
            {/* Переключатель метода входа */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  loginMethod === "email_code"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                onClick={() => setLoginMethod("email_code")}
                disabled={loading || checkingPasswordStatus}
              >
                <Mail className="w-4 h-4" />
                <span>Email код</span>
              </button>
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  loginMethod === "password"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                onClick={() => setLoginMethod("password")}
                disabled={loading || checkingPasswordStatus}
              >
                <Lock className="w-4 h-4" />
                <span>Пароль</span>
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className={`pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    validationErrors.email && touchedFields.email ? 'border-red-500 dark:border-red-500' : ''
                  }`}
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => setTouchedFields(prev => ({ ...prev, email: true }))}
                  disabled={loading || checkingPasswordStatus}
                />
              </div>
              {validationErrors.email && touchedFields.email && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.email}</span>
                </div>
              )}
            </div>

            {/* Поле для пароля (только при выборе метода "пароль") */}
            {loginMethod === "password" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  Пароль
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Введите ваш пароль"
                    className={`pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      validationErrors.password && touchedFields.password ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, password: true }))}
                    disabled={loading}
                  />
                </div>
                {validationErrors.password && touchedFields.password && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.password}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Минимум 8 символов, должны быть буквы и цифры
                </p>
              </div>
            )}

            {/* Кнопка входа в зависимости от выбранного метода */}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={loginMethod === "password" ? handlePasswordLogin : checkPasswordStatus}
              disabled={loading || checkingPasswordStatus}
            >
              {loading ? (
                "Вход..."
              ) : checkingPasswordStatus ? (
                "Проверка..."
              ) : loginMethod === "password" ? (
                "Войти по паролю"
              ) : (
                "Продолжить"
              )}
            </Button>

            {/* Ссылка на восстановление пароля */}
            {loginMethod === "password" && (
              <div className="text-center">
                <button
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  onClick={() => {
                    toast.info("Функция восстановления пароля будет доступна в настройках безопасности");
                  }}
                  disabled={loading}
                >
                  Забыли пароль?
                </button>
              </div>
            )}

            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Нет аккаунта?{" "}
                <button
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  onClick={() => navigate("/register")}
                  disabled={loading || checkingPasswordStatus}
                >
                  Зарегистрироваться
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Мы отправили 6-значный код на <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => handleFieldChange('code', value)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {validationErrors.code && touchedFields.code && (
                <div className="flex items-center justify-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.code}</span>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? "Проверка..." : "Войти"}
            </Button>

            <div className="text-center">
              <button
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                disabled={loading}
              >
                Изменить email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}