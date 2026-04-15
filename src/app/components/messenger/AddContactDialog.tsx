import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Search, MessageCircle, Loader2, ChevronDown } from "lucide-react";
import { User } from "../../types/messenger";
import { VisuallyHidden } from "../ui/visually-hidden";
import { fetchUsers, UsersResponse } from "../../api/messengerApi";

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onStartChat: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}

export function AddContactDialog({
  open,
  onClose,
  onStartChat,
  onViewProfile,
}: AddContactDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<{
    page: number;
    hasNextPage: boolean;
    total: number;
  }>({
    page: 1,
    hasNextPage: false,
    total: 0
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users when dialog opens or search changes
  useEffect(() => {
    if (!open) return;

    const loadUsers = async (reset = true) => {
      if (reset) {
        setLoading(true);
        setPagination({ page: 1, hasNextPage: false, total: 0 });
      } else {
        setLoadingMore(true);
      }
      
      try {
        const page = reset ? 1 : pagination.page + 1;
        const response = await fetchUsers(debouncedSearch || undefined, page, 20);
        
        if (reset) {
          setUsers(response.users);
        } else {
          setUsers(prev => [...prev, ...response.users]);
        }
        
        setPagination({
          page: response.pagination.page,
          hasNextPage: response.pagination.hasNextPage,
          total: response.pagination.total
        });
      } catch (error) {
        console.error("Failed to fetch users:", error);
        if (reset) {
          setUsers([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadUsers(true);
  }, [open, debouncedSearch]);

  // Load more users
  const loadMoreUsers = () => {
    if (loadingMore || !pagination.hasNextPage) return;
    const loadUsers = async () => {
      setLoadingMore(true);
      try {
        const nextPage = pagination.page + 1;
        const response = await fetchUsers(debouncedSearch || undefined, nextPage, 20);
        
        setUsers(prev => [...prev, ...response.users]);
        setPagination({
          page: response.pagination.page,
          hasNextPage: response.pagination.hasNextPage,
          total: response.pagination.total
        });
      } catch (error) {
        console.error("Failed to load more users:", error);
      } finally {
        setLoadingMore(false);
      }
    };
    loadUsers();
  };

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
        month: "short",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            Добавить контакт
          </DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Поиск пользователей для начала чата
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>

          {/* Users List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-12 h-12 mb-3 opacity-50 animate-spin" />
                <p>Загрузка пользователей...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p>{debouncedSearch ? "Пользователи не найдены" : "Нет доступных пользователей"}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
                  >
                    <button
                      onClick={() => onViewProfile(user.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-blue-500 text-white">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${getStatusColor(
                            user.status
                          )}`}
                        />
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {user.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          >
                            {getStatusText(user.status)}
                          </Badge>
                          {user.lastSeen && user.status === "offline" && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              был(а) {formatLastSeen(user.lastSeen)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onStartChat(user.id);
                        onClose();
                      }}
                      className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Написать сообщение"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
                {/* Load More Button */}
                {pagination.hasNextPage && (
                  <div className="flex justify-center pt-4 pb-2">
                    <Button
                      variant="outline"
                      onClick={loadMoreUsers}
                      disabled={loadingMore}
                      className="flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Загрузить еще
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Pagination Info */}
                {users.length > 0 && (
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2 pb-1">
                    Показано {users.length} из {pagination.total} пользователей
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Нажмите на пользователя, чтобы просмотреть профиль, или на{" "}
              <MessageCircle className="w-4 h-4 inline" /> чтобы начать чат
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
