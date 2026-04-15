import { Message } from "../../types/messenger";
import { Check, CheckCheck, File, Download, Image, Music, FileText, Video, Edit, Trash2 } from "lucide-react";
import { VoiceMessage } from "./VoiceMessage";
import { motion } from "motion/react";
import { useState } from "react";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  showSenderName?: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({ message, isOwn, senderName, showSenderName, onEdit, onDelete }: MessageBubbleProps) {
  // Debug logging
  console.log('[DEBUG] MessageBubble rendering:', {
    messageId: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    isOwn,
    text: message.text.substring(0, 50)
  });
  
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showActions, setShowActions] = useState(false);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditText(message.text);
  };

  const handleSaveEdit = () => {
    if (onEdit && editText.trim() !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text);
  };

  const handleDeleteClick = () => {
    if (onDelete && window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
      onDelete(message.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getFileIcon = (fileName?: string, fileUrl?: string) => {
    if (!fileName && !fileUrl) return <File className="w-6 h-6" />;
    
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';
    const url = fileUrl || '';
    
    if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || extension.match(/^(jpg|jpeg|png|gif|webp|bmp)$/)) {
      return <Image className="w-6 h-6" />;
    } else if (url.match(/\.(mp3|wav|ogg|flac)$/i) || extension.match(/^(mp3|wav|ogg|flac)$/)) {
      return <Music className="w-6 h-6" />;
    } else if (url.match(/\.(mp4|avi|mov|mkv|webm)$/i) || extension.match(/^(mp4|avi|mov|mkv|webm)$/)) {
      return <Video className="w-6 h-6" />;
    } else if (url.match(/\.(pdf|doc|docx|txt)$/i) || extension.match(/^(pdf|doc|docx|txt)$/)) {
      return <FileText className="w-6 h-6" />;
    } else {
      return <File className="w-6 h-6" />;
    }
  };

  const getFileTypeText = (fileName?: string, fileUrl?: string) => {
    if (!fileName && !fileUrl) return "Файл";
    
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';
    const url = fileUrl || '';
    
    if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || extension.match(/^(jpg|jpeg|png|gif|webp|bmp)$/)) {
      return "Изображение";
    } else if (url.match(/\.(mp3|wav|ogg|flac)$/i) || extension.match(/^(mp3|wav|ogg|flac)$/)) {
      return "Аудио";
    } else if (url.match(/\.(mp4|avi|mov|mkv|webm)$/i) || extension.match(/^(mp4|avi|mov|mkv|webm)$/)) {
      return "Видео";
    } else if (url.match(/\.(pdf)$/i) || extension.match(/^(pdf)$/)) {
      return "PDF документ";
    } else if (url.match(/\.(doc|docx)$/i) || extension.match(/^(doc|docx)$/)) {
      return "Документ Word";
    } else if (url.match(/\.(txt)$/i) || extension.match(/^(txt)$/)) {
      return "Текстовый файл";
    } else {
      return "Документ";
    }
  };

  const handleDownload = () => {
    if (message.fileUrl) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = message.fileUrl;
      link.download = message.fileName || 'download';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImageClick = () => {
    if (message.fileUrl && message.type === 'image') {
      setImagePreviewOpen(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 px-4`}
    >
      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        {/* Debug indicator - show isOwn status */}
        <div className="text-xs text-gray-500 mb-1">
          {isOwn ? "OWN (should be right)" : "OTHER (should be left)"} |
          senderId: {message.senderId?.substring(0, 8)}...
        </div>
        {showSenderName && !isOwn && (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 ml-3">{senderName}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? "bg-blue-500 text-white rounded-br-sm"
              : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm shadow-sm"
          }`}
        >
          {message.deleted ? (
            <p className="text-[15px] break-words whitespace-pre-wrap italic text-gray-500 dark:text-gray-400">
              Сообщение удалено
            </p>
          ) : message.type === "text" && isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Сохранить
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : message.type === "text" ? (
            <div className="group relative">
              <p className="text-[15px] break-words whitespace-pre-wrap">{message.text}</p>
              {isOwn && !message.deleted && onEdit && onDelete && (
                <div className="absolute top-0 right-0 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1">
                  <button
                    onClick={handleEditClick}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Редактировать"
                  >
                    <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ) : null}
          
          {message.type === "audio" && message.duration && (
            <VoiceMessage duration={message.duration} isOwn={isOwn} />
          )}
          
          {message.type === "image" && message.fileUrl && (
            <div className="space-y-2">
              <div
                className="relative rounded-lg overflow-hidden cursor-pointer group"
                onClick={handleImageClick}
              >
                <img
                  src={message.fileUrl}
                  alt={message.fileName || "Изображение"}
                  className="w-full max-w-[300px] h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Image className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
              {message.text && message.text !== `Файл: ${message.fileName}` && (
                <p className="text-[15px] break-words whitespace-pre-wrap">{message.text}</p>
              )}
            </div>
          )}
          
          {(message.type === "file" || (message.fileUrl && !message.type)) && (
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${isOwn ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}`}>
                {getFileIcon(message.fileName, message.fileUrl)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{message.fileName || "Без названия"}</p>
                <p className={`text-xs ${isOwn ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                  {getFileTypeText(message.fileName, message.fileUrl)}
                </p>
              </div>
              <button
                className={`p-2 rounded-full hover:bg-opacity-80 ${isOwn ? "hover:bg-blue-600" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                onClick={handleDownload}
                title="Скачать"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
            {message.edited && !message.deleted && (
              <span className="italic" title={`Отредактировано ${message.editedAt ? formatTime(message.editedAt) : ''}`}>
                (ред.)
              </span>
            )}
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && !message.deleted && (
              message.read ? (
                <CheckCheck className="w-4 h-4 text-blue-200" />
              ) : (
                <Check className="w-4 h-4" />
              )
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно предпросмотра изображения */}
      {imagePreviewOpen && message.fileUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setImagePreviewOpen(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={message.fileUrl}
              alt={message.fileName || "Изображение"}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
              onClick={() => setImagePreviewOpen(false)}
            >
              ✕
            </button>
            {message.fileName && (
              <div className="absolute bottom-4 left-0 right-0 text-center text-white bg-black bg-opacity-50 py-2">
                {message.fileName}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}