import { useEffect, useRef, useState, useMemo } from "react";
import { Chat, Message } from "../../types/messenger";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Phone, Video, MoreVertical, Search, Ban, Trash2, Eraser, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { CallDialog } from "./CallDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  currentUserId?: string;
  onSendMessage: (text: string) => void;
  onSendVoice?: (duration: number) => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onBlockUser?: () => void;
  onBack?: () => void;
  onViewProfile?: () => void;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  isLoading?: boolean;
}

export function ChatWindow({
  chat,
  messages,
  currentUserId,
  onSendMessage,
  onSendVoice,
  onClearChat,
  onDeleteChat,
  onBlockUser,
  onBack,
  onViewProfile,
  onEdit,
  onDelete,
  isLoading = false
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertAction, setAlertAction] = useState<"clear" | "delete" | "block">("clear");

  // Удаляем дубликаты сообщений по ID перед рендерингом
  const uniqueMessages = useMemo(() => {
    const seenIds = new Set<string>();
    const result: Message[] = [];
    
    for (const message of messages) {
      if (!seenIds.has(message.id)) {
        seenIds.add(message.id);
        result.push(message);
      } else {
        console.warn(`[ChatWindow] Found duplicate message with ID: ${message.id}`);
      }
    }
    
    return result;
  }, [messages]);

  // Автопрокрутка к последнему сообщению при изменении uniqueMessages
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100); // Небольшая задержка для гарантии обновления DOM
    
    return () => clearTimeout(timer);
  }, [uniqueMessages]);

  // Debug logging для отладки отображения отправителей
  useEffect(() => {
    console.log('[ChatWindow Debug] currentUserId:', currentUserId);
    console.log('[ChatWindow Debug] messages count:', messages.length);
    console.log('[ChatWindow Debug] uniqueMessages count:', uniqueMessages.length);
    
    // Log detailed info about each message
    if (messages.length > 0) {
      console.log('[ChatWindow Debug] First message:', {
        id: messages[0].id,
        senderId: messages[0].senderId,
        senderName: messages[0].senderName,
        text: messages[0].text?.substring(0, 50)
      });
      console.log('[ChatWindow Debug] First message isOwn?', messages[0].senderId === currentUserId);
      
      // Log all unique sender IDs with counts
      const senderCounts: Record<string, number> = {};
      messages.forEach(m => {
        senderCounts[m.senderId] = (senderCounts[m.senderId] || 0) + 1;
      });
      console.log('[ChatWindow Debug] Sender counts:', senderCounts);
      
      // Log the last 3 messages (most recent)
      const lastMessages = messages.slice(-3);
      console.log('[ChatWindow Debug] Last 3 messages:', lastMessages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        isOwn: m.senderId === currentUserId,
        text: m.text?.substring(0, 30)
      })));
    }
    
    // Warn if currentUserId is undefined but we have messages
    if (currentUserId === undefined && messages.length > 0) {
      console.warn('[ChatWindow Warning] currentUserId is undefined! All messages will appear as "not own".');
    }
    
    // Check for any messages with undefined senderId
    const messagesWithUndefinedSender = messages.filter(m => !m.senderId);
    if (messagesWithUndefinedSender.length > 0) {
      console.warn('[ChatWindow Warning] Found messages with undefined senderId:', messagesWithUndefinedSender.length);
    }
  }, [currentUserId, messages, uniqueMessages]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusText = () => {
    if (chat.isGroup) {
      return `${chat.participants.length} участников`;
    }
    const participant = chat.participants[0];
    if (!participant) {
      return "не в сети";
    }
    if (participant.status === "online") {
      return "в сети";
    }
    if (participant.lastSeen) {
      const now = new Date();
      const diff = now.getTime() - participant.lastSeen.getTime();
      const minutes = Math.floor(diff / 1000 / 60);
      const hours = Math.floor(minutes / 60);
      
      if (minutes < 1) {
        return "только что";
      } else if (minutes < 60) {
        return `был(а) ${minutes} мин. назад`;
      } else if (hours < 24) {
        return `был(а) ${hours} ч. назад`;
      } else {
        return "был(а) давно";
      }
    }
    return "не в сети";
  };

  const handlePhoneCall = () => {
    setCallType("audio");
    setCallOpen(true);
  };

  const handleVideoCall = () => {
    setCallType("video");
    setCallOpen(true);
  };

  const handleMenuAction = (action: "clear" | "delete" | "block") => {
    setAlertAction(action);
    setAlertOpen(true);
  };

  const handleConfirmAction = () => {
    if (alertAction === "clear" && onClearChat) {
      onClearChat();
    } else if (alertAction === "delete" && onDeleteChat) {
      onDeleteChat();
    } else if (alertAction === "block" && onBlockUser) {
      onBlockUser();
    }
    setAlertOpen(false);
  };

  const getAlertContent = () => {
    switch (alertAction) {
      case "clear":
        return {
          title: "Очистить историю чата?",
          description: "Все сообщения в этом чате будут удалены. Это действие нельзя отменить.",
        };
      case "delete":
        return {
          title: "Удалить чат?",
          description: "Чат будет удален вместе со всеми сообщениями. Это действие нельзя отменить.",
        };
      case "block":
        return {
          title: "Заблокировать пользователя?",
          description: `${chat.name} больше не сможет отправлять вам сообщения.`,
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden h-8 w-8 shrink-0 text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <button
            onClick={() => !chat.isGroup && onViewProfile?.()}
            className={`flex items-center gap-2 sm:gap-3 min-w-0 ${
              !chat.isGroup ? "hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-1 -m-1 transition-colors" : ""
            }`}
            disabled={chat.isGroup}
          >
            <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
              <AvatarFallback className={`${chat.isGroup ? "bg-purple-500" : "bg-blue-500"} text-white`}>
                {getInitials(chat.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="font-semibold dark:text-white truncate text-sm sm:text-base">{chat.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{getStatusText()}</p>
            </div>
          </button>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="text-gray-600 dark:text-gray-400 h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-600 dark:text-gray-400 h-8 w-8 sm:h-10 sm:w-10"
            onClick={handlePhoneCall}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-600 dark:text-gray-400 h-8 w-8 sm:h-10 sm:w-10"
            onClick={handleVideoCall}
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-600 dark:text-gray-400 h-8 w-8 sm:h-10 sm:w-10">
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleMenuAction("clear")}>
                <Eraser className="w-4 h-4 mr-2" />
                Очистить историю
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleMenuAction("block")}
                className="text-orange-600 dark:text-orange-400"
              >
                <Ban className="w-4 h-4 mr-2" />
                Заблокировать пользователя
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleMenuAction("delete")}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить чат
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-gray-800">
        <div className="py-4">
          {uniqueMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>Нет сообщений. Начните общение!</p>
            </div>
          ) : (
            <>
              {uniqueMessages.map((message, index) => {
                 // Robust isOwn calculation with debugging for new messages
                 // If currentUserId is undefined, we can't determine ownership, so default to false
                 const isOwn = currentUserId ? message.senderId === currentUserId : false;
                 
                 // Always log for debugging - we need to understand the issue
                 console.log('[ChatWindow Render Debug] Message:', {
                   index,
                   messageId: message.id,
                   senderId: message.senderId,
                   currentUserId,
                   isOwn,
                   senderName: message.senderName,
                   textPreview: message.text?.substring(0, 30),
                   note: currentUserId ? 'currentUserId available' : 'WARNING: currentUserId is undefined!'
                 });
                 
                 // Debug logging for new messages (last 3) or if isOwn seems wrong
                 const isRecentMessage = index >= uniqueMessages.length - 3;
                 if (isRecentMessage || (index === 0 && uniqueMessages.length > 5)) {
                   // Additional logging for recent messages
                 }
                 
                 const showSenderName =
                   chat.isGroup &&
                   !isOwn &&
                   (index === 0 || uniqueMessages[index - 1].senderId !== message.senderId);
                 
                 // Prefer message.senderName if available, otherwise look up from participants
                 const senderName = message.senderName || chat.participants.find((p) => p.id === message.senderId)?.name;
 
                 return (
                   <MessageBubble
                     key={message.id}
                     message={message}
                     isOwn={isOwn}
                     senderName={senderName}
                    showSenderName={showSenderName}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={onSendMessage} onSendVoice={onSendVoice} />

      {/* Call Dialog */}
      <CallDialog
        open={callOpen}
        onClose={() => setCallOpen(false)}
        contactName={chat.name}
        isVideo={callType === "video"}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getAlertContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getAlertContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={
                alertAction === "delete" || alertAction === "block"
                  ? "bg-red-500 hover:bg-red-600"
                  : ""
              }
            >
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}