import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Camera, Mail, User as UserIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/ui/input-otp";
import { validateForm, registrationRules, loginRules, getFieldError } from "../utils/validation";

export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "verification">("info");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Валидация формы регистрации
  const validateRegistrationForm = () => {
    const formData = { name, email };
    const result = validateForm(formData, registrationRules);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  // Валидация кода подтверждения
  const validateVerificationForm = () => {
    const formData = { email, code };
    const result = validateForm(formData, loginRules);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  // Обработчик изменения поля с валидацией в реальном времени
  const handleFieldChange = (field: string, value: string) => {
    if (field === 'name') setName(value);
    if (field === 'email') setEmail(value);
    if (field === 'code') setCode(value);

    // Помечаем поле как "тронутое"
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Валидируем поле в реальном времени
    if (touchedFields[field]) {
      const formData = field === 'code' ? { code: value } : { name, email };
      const rules = field === 'code' ? loginRules : registrationRules;
      const error = getFieldError(field, value, rules);
      
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
    if (!validateRegistrationForm()) {
      // Помечаем все поля как "тронутые" для отображения ошибок
      setTouchedFields({ name: true, email: true });
      console.log('Validation failed:', validationErrors);
      return;
    }

    setLoading(true);
    try {
      console.log('Sending verification code to', email);
      const response = await fetch('http://localhost:3001/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'registration' }),
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      // Try to parse response as JSON, but handle non-JSON responses
      let data;
      try {
        const text = await response.text();
        console.log('Response text:', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        data = {};
      }
      
      console.log('Response data:', data);
      
      if (response.ok) {
        toast.success("Код отправлен на ваш email");
        console.log('Setting step to verification');
        setStep("verification");
      } else {
        console.error('API error:', data);
        toast.error(data.error || data.message || "Не удалось отправить код");
      }
    } catch (error) {
      console.error('Error sending code:', error);
      toast.error("Ошибка сети. Проверьте подключение.");
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
      console.log('Verifying code', code, 'for email', email, 'with name', name);
      const response = await fetch('http://localhost:3001/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose: 'registration', name }),
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      // Try to parse response as JSON, but handle non-JSON responses
      let data;
      try {
        const text = await response.text();
        console.log('Response text:', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        data = {};
      }
      
      console.log('Response data:', data);
      
      if (response.ok) {
        const userId = data.user.id;
        let avatarUrl = data.user.avatar_url;

        // Если пользователь выбрал аватар, загружаем его на сервер
        if (avatarFile) {
          try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);
            
            const avatarResponse = await fetch(`http://localhost:3001/api/users/${userId}/avatar`, {
              method: 'POST',
              body: formData,
            });
            
            if (avatarResponse.ok) {
              const avatarData = await avatarResponse.json();
              avatarUrl = avatarData.avatarUrl;
              console.log('Avatar uploaded successfully:', avatarUrl);
            } else {
              console.warn('Failed to upload avatar, using default');
            }
          } catch (avatarError) {
            console.error('Error uploading avatar:', avatarError);
            // Продолжаем без аватара, не прерываем регистрацию
          }
        }

        // Сохраняем данные пользователя в localStorage
        localStorage.setItem(
          "registeredUser",
          JSON.stringify({
            id: userId,
            name: data.user.name,
            email: data.user.email,
            avatar: avatarUrl || avatar
          })
        );
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("currentUserId", userId);
        toast.success("Регистрация успешна!");
        navigate("/");
      } else {
        toast.error(data.error || "Неверный код");
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error("Ошибка сети. Проверьте подключение.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string) => {
    if (!name.trim()) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Messenger
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {step === "info"
                ? "Создайте ваш аккаунт"
                : "Подтвердите ваш email"}
            </p>
          </div>

          {step === "info" ? (
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-blue-500 text-white text-2xl">
                        {getInitials(name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Загрузите фото профиля
                </p>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-white">
                  Имя или ID
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, name: true }))}
                    placeholder="Введите ваше имя"
                    className={`pl-10 dark:bg-gray-800 dark:text-white dark:border-gray-700 ${
                      validationErrors.name && touchedFields.name ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                  />
                </div>
                {validationErrors.name && touchedFields.name && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.name}</span>
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="dark:text-white">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, email: true }))}
                    placeholder="example@email.com"
                    className={`pl-10 dark:bg-gray-800 dark:text-white dark:border-gray-700 ${
                      validationErrors.email && touchedFields.email ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                  />
                </div>
                {validationErrors.email && touchedFields.email && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.email}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  На этот адрес будет отправлен код подтверждения
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSendCode}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                Получить код подтверждения
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Email Display */}
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Мы отправили 6-значный код на
                </p>
                <p className="font-medium text-gray-900 dark:text-white mb-6">
                  {email}
                </p>
              </div>

              {/* OTP Input */}
              <div className="space-y-2">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => handleFieldChange('code', value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
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

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                Подтвердить
              </Button>

              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={() => setStep("info")}
                className="w-full dark:text-white"
              >
                Изменить email
              </Button>

              {/* Resend Code */}
              <button
                onClick={() => toast.success("Код отправлен повторно")}
                className="w-full text-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                Отправить код повторно
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-white/80 text-sm">
          Уже есть аккаунт?{" "}
          <button
            onClick={() => navigate("/")}
            className="font-medium hover:underline"
          >
            Войти
          </button>
        </p>
      </div>
    </div>
  );
}
