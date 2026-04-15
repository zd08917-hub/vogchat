import { useState, KeyboardEvent, useRef, ChangeEvent } from "react";
import { Smile, Paperclip, Mic, Send, X, File, Image, FileText } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { VoiceRecorder } from "./VoiceRecorder";
import { EmojiPicker } from "./EmojiPicker";
import { motion, AnimatePresence } from "motion/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { toast } from "sonner";

interface MessageInputProps {
  onSendMessage: (text: string, attachments?: { fileUrl: string; fileName: string; type: string }[]) => void;
  onSendVoice?: (duration: number) => void;
}

export function MessageInput({ onSendMessage, onSendVoice }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<{ file: File; previewUrl?: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = Array.from(files).map(file => {
      let previewUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }
      return { file, previewUrl };
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <File className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <File className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const uploadFile = async (file: File): Promise<{ fileUrl: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload file');
    }
    
    const data = await response.json();
    return { fileUrl: data.fileUrl, fileName: file.name };
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedAttachments = [];
      
      // Upload all attachments
      for (const attachment of attachments) {
        try {
          const uploaded = await uploadFile(attachment.file);
          const type = attachment.file.type.startsWith('image/') ? 'image' :
                      attachment.file.type.startsWith('audio/') ? 'audio' : 'file';
          uploadedAttachments.push({ ...uploaded, type });
        } catch (error) {
          console.error('Failed to upload attachment:', error);
          toast.error(`Не удалось загрузить файл: ${attachment.file.name}`);
        }
      }

      // Send message with attachments
      onSendMessage(message.trim(), uploadedAttachments);
      
      // Clean up
      setMessage("");
      setAttachments([]);
      attachments.forEach(att => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Ошибка при отправке сообщения');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceSend = (duration: number) => {
    if (onSendVoice) {
      onSendVoice(duration);
    }
    setIsRecordingVoice(false);
  };

  const handleEmojiClick = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = message.substring(0, start) + emoji + message.substring(end);
      setMessage(newText);
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage(message + emoji);
    }
  };

  if (isRecordingVoice) {
    return (
      <VoiceRecorder
        onSend={handleVoiceSend}
        onCancel={() => setIsRecordingVoice(false)}
      />
    );
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg p-2 flex items-center gap-2"
            >
              {attachment.previewUrl ? (
                <div className="w-12 h-12 rounded overflow-hidden">
                  <img
                    src={attachment.previewUrl}
                    alt={attachment.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {getFileIcon(attachment.file)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {attachment.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(attachment.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-red-500"
                onClick={() => removeAttachment(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            className="resize-none min-h-[44px] max-h-[120px] pr-10 rounded-3xl dark:bg-gray-800 dark:text-white"
            rows={1}
            disabled={isUploading}
          />
          <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 bottom-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={isUploading}
              >
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-auto p-0 border-0 shadow-lg"
              sideOffset={8}
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </PopoverContent>
          </Popover>
        </div>

        <AnimatePresence mode="wait">
          {message.trim() || attachments.length > 0 ? (
            <motion.div
              key="send"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Button
                onClick={handleSend}
                size="icon"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setIsRecordingVoice(true)}
                disabled={isUploading}
              >
                <Mic className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}