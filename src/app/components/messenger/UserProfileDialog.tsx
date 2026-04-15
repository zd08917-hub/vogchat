import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { MessageCircle, Phone, Video, Info } from "lucide-react";
import { User } from "../../types/messenger";
import { VisuallyHidden } from "../ui/visually-hidden";

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onStartChat?: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
}

export function UserProfileDialog({
  open,
  onClose,
  user,
  onStartChat,
  onStartAudioCall,
  onStartVideoCall,
}: UserProfileDialogProps) {
  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: User["status"]) => {
    switch (status) {
      case "online":
        return "в сети";
      case "away":
        return "не на месте";
      case "offline":
        return "не в сети";
    }
  };

  const formatLastSeen = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 1000 * 60) {
      return "только что";
    } else if (diff < 1000 * 60 * 60) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} мин. назад`;
    } else if (diff < 1000 * 60 * 60 * 24) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `${hours} ч. назад`;
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Профиль пользователя</DialogTitle>
            <DialogDescription>
              Информация о пользователе {user.name}
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="relative">
              <Avatar className="w-32 h-32">
                <AvatarFallback className="bg-blue-500 text-white text-4xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 ${getStatusColor(
                  user.status
                )}`}
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {user.name}
              </h2>
              <Badge
                variant="secondary"
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {getStatusText(user.status)}
              </Badge>
              {user.lastSeen && user.status === "offline" && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  был(а) в сети {formatLastSeen(user.lastSeen)}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {onStartChat && (
              <Button
                onClick={() => {
                  onStartChat();
                  onClose();
                }}
                className="flex flex-col items-center gap-2 h-auto py-4 bg-blue-500 hover:bg-blue-600"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-xs">Написать</span>
              </Button>
            )}
            {onStartAudioCall && (
              <Button
                onClick={() => {
                  onStartAudioCall();
                  onClose();
                }}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Phone className="w-6 h-6" />
                <span className="text-xs">Позвонить</span>
              </Button>
            )}
            {onStartVideoCall && (
              <Button
                onClick={() => {
                  onStartVideoCall();
                  onClose();
                }}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Video className="w-6 h-6" />
                <span className="text-xs">Видеозвонок</span>
              </Button>
            )}
          </div>

          {/* User Info */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Info className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  О пользователе
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Информация о пользователе не указана
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 ID пользователя: {user.id}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
