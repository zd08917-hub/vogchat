import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Mail, AlertCircle } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

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
            Введите email для получения кода подтверждения
          </p>
        </div>

        {step === "email" ? (
          <div className="space-y-6">
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
                  disabled={loading}
                />
              </div>
              {validationErrors.email && touchedFields.email && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.email}</span>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSendCode}
              disabled={loading}
            >
              {loading ? "Отправка..." : "Получить код"}
            </Button>

            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Нет аккаунта?{" "}
                <button
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  onClick={() => navigate("/register")}
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