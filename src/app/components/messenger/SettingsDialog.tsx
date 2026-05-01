import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { VisuallyHidden } from "../ui/visually-hidden";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Bell, Lock, Moon, Sun, Monitor, LogOut, Key } from "lucide-react";
import { useTheme } from "next-themes";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import SecuritySettings from "./SecuritySettings";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    messages: true,
    groups: true,
    calls: false,
    sound: true,
  });

  const [privacy, setPrivacy] = useState({
    lastSeen: true,
    profilePhoto: true,
    readReceipts: true,
    onlineStatus: true,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Настройки</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Настройте тему оформления, уведомления и параметры приватности
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Theme Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium dark:text-white">Тема оформления</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  theme === "light"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Sun className="w-6 h-6 dark:text-white" />
                <span className="text-sm dark:text-white">Светлая</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  theme === "dark"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Moon className="w-6 h-6 dark:text-white" />
                <span className="text-sm dark:text-white">Темная</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  theme === "system"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Monitor className="w-6 h-6 dark:text-white" />
                <span className="text-sm dark:text-white">Системная</span>
              </button>
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Notification Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium dark:text-white">Уведомления</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-messages" className="cursor-pointer dark:text-white">
                  Личные сообщения
                </Label>
                <Switch
                  id="notif-messages"
                  checked={notifications.messages}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, messages: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-groups" className="cursor-pointer dark:text-white">
                  Групповые чаты
                </Label>
                <Switch
                  id="notif-groups"
                  checked={notifications.groups}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, groups: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-calls" className="cursor-pointer dark:text-white">
                  Звонки
                </Label>
                <Switch
                  id="notif-calls"
                  checked={notifications.calls}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, calls: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-sound" className="cursor-pointer dark:text-white">
                  Звук уведомлений
                </Label>
                <Switch
                  id="notif-sound"
                  checked={notifications.sound}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, sound: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Privacy Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium dark:text-white">Приватность</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacy-lastseen" className="cursor-pointer dark:text-white">
                    Время последнего посещения
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Кто может видеть когда вы были онлайн</p>
                </div>
                <Switch
                  id="privacy-lastseen"
                  checked={privacy.lastSeen}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, lastSeen: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacy-photo" className="cursor-pointer dark:text-white">
                    Фото профиля
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Кто может видеть ваше фото</p>
                </div>
                <Switch
                  id="privacy-photo"
                  checked={privacy.profilePhoto}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, profilePhoto: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacy-read" className="cursor-pointer dark:text-white">
                    Отметки о прочтении
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Показывать что вы прочитали сообщения</p>
                </div>
                <Switch
                  id="privacy-read"
                  checked={privacy.readReceipts}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, readReceipts: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacy-online" className="cursor-pointer dark:text-white">
                    Статус онлайн
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Показывать когда вы онлайн</p>
                </div>
                <Switch
                  id="privacy-online"
                  checked={privacy.onlineStatus}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, onlineStatus: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Security Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium dark:text-white">Безопасность</h3>
            </div>
            <SecuritySettings
              userId={localStorage.getItem("registeredUser") || ""}
              onLogout={() => {
                localStorage.removeItem("isAuthenticated");
                localStorage.removeItem("registeredUser");
                toast.success("Вы вышли из системы");
                navigate("/register");
              }}
            />
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Logout */}
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => {
                localStorage.removeItem("isAuthenticated");
                localStorage.removeItem("registeredUser");
                toast.success("Вы вышли из системы");
                navigate("/register");
              }}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Выйти из аккаунта
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}