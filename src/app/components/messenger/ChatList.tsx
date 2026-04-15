import { useState, memo } from "react";
import { Chat, User as UserType } from "../../types/messenger";
import { Search, Pin, User, Settings, Plus, UserPlus } from "lucide-react";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useUser } from "../../contexts/UserContext";
import { ProfileDialog } from "./ProfileDialog";
import { SettingsDialog } from "./SettingsDialog";

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
  onCreateGroup?: () => void;
  onAddContact?: () => void;
  onViewProfile?: (userId: string) => void;
  isLoading?: boolean;
}

const ChatListComponent = memo(function ChatListComponent({
  chats,
  selectedChatId,
  onSelectChat,
  onCreateGroup,
  onAddContact,
  onViewProfile,
  isLoading = false
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useUser();
  
  // Use default values if user is null
  const userDisplayName = user?.name || "Пользователь";
  const userUsername = user?.username;

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 1000 * 60 * 60 * 24) {
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } else if (diff < 1000 * 60 * 60 * 24 * 7) {
      return date.toLocaleDateString("ru-RU", { weekday: "short" });
    } else {
      return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    }
  };

  const pinnedChats = filteredChats.filter((chat) => chat.isPinned);
  const regularChats = filteredChats.filter((chat) => !chat.isPinned);

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
      {/* Header with User Profile */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800">
        {/* User Profile Section */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <button 
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 sm:gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-1 min-w-0"
          >
            <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
              <AvatarFallback className="bg-blue-500 text-white">
                {getInitials(userDisplayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <h2 className="font-medium truncate dark:text-white text-sm sm:text-base">{userDisplayName}</h2>
              {userUsername && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">@{userUsername}</p>
              )}
            </div>
          </button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 bg-gray-100 dark:bg-gray-800 border-0 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {pinnedChats.length > 0 && (
          <div>
            {pinnedChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedChatId === chat.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarFallback className={`${chat.isGroup ? "bg-purple-500" : "bg-blue-500"} text-white`}>
                    {getInitials(chat.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate dark:text-white">{chat.name}</h3>
                      {chat.isPinned && <Pin className="w-4 h-4 text-gray-400" />}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(chat.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{chat.lastMessage}</p>
                    {chat.unreadCount > 0 && (
                      <Badge className="ml-2 bg-blue-500 hover:bg-blue-600 min-w-[20px] h-5 rounded-full flex items-center justify-center">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {regularChats.length > 0 && <div className="h-px bg-gray-200 dark:bg-gray-800 mx-3 my-2" />}
          </div>
        )}

        {regularChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
              selectedChatId === chat.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <Avatar className="w-12 h-12">
              <AvatarFallback className={`${chat.isGroup ? "bg-purple-500" : "bg-blue-500"} text-white`}>
                {getInitials(chat.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium truncate dark:text-white">{chat.name}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(chat.lastMessageTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{chat.lastMessage}</p>
                {chat.unreadCount > 0 && (
                  <Badge className="ml-2 bg-blue-500 hover:bg-blue-600 min-w-[20px] h-5 rounded-full flex items-center justify-center">
                    {chat.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <div className="border-t border-gray-200 dark:border-gray-800 mt-2">
          {onAddContact && (
            <button
              onClick={onAddContact}
              className="w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium dark:text-white">Добавить контакт</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Найти и добавить пользователей</p>
              </div>
            </button>
          )}
          {onCreateGroup && (
            <button
              onClick={onCreateGroup}
              className="w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium dark:text-white">Создать группу</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Новый групповой чат</p>
              </div>
            </button>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
});

export const ChatList = ChatListComponent;