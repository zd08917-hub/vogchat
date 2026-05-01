import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { 
  Lock, 
  Shield, 
  Mail, 
  Key, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  LogOut
} from "lucide-react";
import { toast } from "sonner";
import PasswordSetupDialog from "./PasswordSetupDialog";

interface SecuritySettingsProps {
  userId: string;
  onLogout?: () => void;
}

export default function SecuritySettings({ userId, onLogout }: SecuritySettingsProps) {
  const [hasPassword, setHasPassword] = useState(false);
  const [preferredLoginMethod, setPreferredLoginMethod] = useState<"password" | "email_code">("email_code");
  const [loading, setLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null);

  // Загружаем информацию о безопасности
  const loadSecurityInfo = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/auth/has-password?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setHasPassword(data.hasPassword);
        setPreferredLoginMethod(data.preferredLoginMethod || "email_code");
      }
    } catch (error) {
      console.error("Failed to load security info:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      loadSecurityInfo();
    }
  }, [userId]);

  // Обновляем предпочтительный метод входа
  const updatePreferredLoginMethod = async (method: "password" | "email_code") => {
    if (method === "password" && !hasPassword) {
      toast.error("Сначала установите пароль");
      setPasswordDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/preferred-login-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method }),
      });

      const data = await response.json();

      if (response.ok) {
        setPreferredLoginMethod(method);
        toast.success(`Метод входа изменен на ${method === "password" ? "пароль" : "email-код"}`);
      } else {
        toast.error(data.error || "Ошибка изменения метода входа");
        if (data.requiresPasswordSetup) {
          setPasswordDialogOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to update login method:", error);
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // Запрос сброса пароля
  const handlePasswordResetRequest = async () => {
    // Получаем email пользователя
    try {
      const userResponse = await fetch(`http://localhost:3001/api/users?id=${userId}`);
      const users = await userResponse.json();
      
      if (!users || users.length === 0) {
        toast.error("Пользователь не найден");
        return;
      }

      const user = users[0];
      
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Код сброса пароля отправлен на ваш email");
      } else {
        toast.error(data.error || "Ошибка запроса сброса пароля");
      }
    } catch (error) {
      console.error("Failed to request password reset:", error);
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // Выход со всех устройств
  const handleLogoutAllDevices = () => {
    // В реальном приложении здесь был бы вызов API для инвалидации всех токенов
    toast.info("Функция выхода со всех устройств будет доступна в будущих обновлениях");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Безопасность
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Управление настройками безопасности вашего аккаунта
          </p>
        </div>
      </div>

      {/* Карточка статуса пароля */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Пароль аккаунта
          </CardTitle>
          <CardDescription>
            {hasPassword 
              ? "У вас установлен пароль для входа в аккаунт" 
              : "Пароль не установлен. Рекомендуем установить для удобного входа"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Статус пароля</Label>
              <div className="flex items-center gap-2">
                {hasPassword ? (
                  <>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Установлен
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {lastPasswordChange ? `Изменен ${new Date(lastPasswordChange).toLocaleDateString()}` : ""}
                    </span>
                  </>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Не установлен
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant={hasPassword ? "outline" : "default"}
              onClick={() => setPasswordDialogOpen(true)}
              disabled={loading}
            >
              {hasPassword ? "Изменить пароль" : "Установить пароль"}
            </Button>
          </div>

          {!hasPassword && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    Рекомендуем установить пароль
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Без пароля вы можете входить только по email-кодам. Пароль обеспечит более быстрый и удобный вход.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Карточка метода входа */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Метод входа
          </CardTitle>
          <CardDescription>
            Выберите предпочтительный способ входа в аккаунт
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Использовать пароль для входа</Label>
              <p className="text-sm text-gray-500">
                {preferredLoginMethod === "password" 
                  ? "Вы входите по паролю" 
                  : "Вы входите по email-кодам"}
              </p>
            </div>
            <Switch
              checked={preferredLoginMethod === "password"}
              onCheckedChange={(checked) => 
                updatePreferredLoginMethod(checked ? "password" : "email_code")
              }
              disabled={loading || !hasPassword}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Вход по email-коду</p>
                <p className="text-sm text-gray-500">
                  Каждый раз при входе вы получаете 6-значный код на email
                </p>
                <Badge 
                  variant={preferredLoginMethod === "email_code" ? "default" : "outline"}
                  className="mt-1"
                >
                  {preferredLoginMethod === "email_code" ? "Текущий метод" : "Альтернативный метод"}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Lock className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Вход по паролю</p>
                <p className="text-sm text-gray-500">
                  Быстрый вход с помощью пароля
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={preferredLoginMethod === "password" ? "default" : "outline"}
                  >
                    {preferredLoginMethod === "password" ? "Текущий метод" : "Альтернативный метод"}
                  </Badge>
                  {!hasPassword && (
                    <Badge variant="outline" className="text-amber-600">
                      Требуется установка пароля
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Карточка дополнительных действий */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Дополнительные действия
          </CardTitle>
          <CardDescription>
            Управление доступом и безопасностью
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handlePasswordResetRequest}
              disabled={loading || !hasPassword}
            >
              <Mail className="w-4 h-4 mr-2" />
              Сбросить пароль по email
              {!hasPassword && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Недоступно
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogoutAllDevices}
              disabled={loading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти со всех устройств
            </Button>

            {onLogout && (
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={onLogout}
                disabled={loading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти из аккаунта
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Диалог установки пароля */}
      <PasswordSetupDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        userId={userId}
        onSuccess={loadSecurityInfo}
      />
    </div>
  );
}