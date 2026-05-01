import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface PasswordSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export default function PasswordSetupDialog({ open, onOpenChange, userId, onSuccess }: PasswordSetupDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = "Введите новый пароль";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Пароль должен быть не менее 8 символов";
    } else if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      newErrors.newPassword = "Пароль должен содержать буквы и цифры";
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          password: newPassword,
          currentPassword: currentPassword || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Пароль успешно установлен!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        
        if (onSuccess) {
          onSuccess();
        }
        
        onOpenChange(false);
      } else {
        toast.error(data.error || "Ошибка установки пароля");
        if (data.details) {
          setErrors({ general: data.details });
        }
      }
    } catch (error) {
      console.error("Failed to set password:", error);
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Настройка пароля
          </DialogTitle>
          <DialogDescription>
            Установите пароль для входа в аккаунт. Это позволит вам входить без email-кодов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Текущий пароль (если уже есть пароль) */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Текущий пароль (если есть)</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Введите текущий пароль"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Оставьте пустым, если устанавливаете пароль впервые
            </p>
          </div>

          {/* Новый пароль */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Введите новый пароль"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className={errors.newPassword ? "border-red-500" : ""}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <div className="flex items-center gap-1 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.newPassword}</span>
              </div>
            )}
            <div className="text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${newPassword.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
                Минимум 8 символов
              </p>
              <p className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${/\d/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                Содержит цифры
              </p>
              <p className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${/[a-zA-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                Содержит буквы
              </p>
            </div>
          </div>

          {/* Подтверждение пароля */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Повторите новый пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center gap-1 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.confirmPassword}</span>
              </div>
            )}
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Пароли совпадают</span>
              </div>
            )}
          </div>

          {errors.general && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.general}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="sm:flex-1"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Установка..." : "Установить пароль"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}