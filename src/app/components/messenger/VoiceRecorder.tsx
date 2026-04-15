import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Mic, X, Send } from "lucide-react";
import { motion } from "motion/react";

interface VoiceRecorderProps {
  onSend: (duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-start recording
    setIsRecording(true);
    intervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSend = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onSend(duration);
  };

  const handleCancel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <X className="w-6 h-6" />
      </Button>

      <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-3 h-3 bg-red-500 rounded-full"
        />
        <Mic className="w-5 h-5 text-red-500" />
        <span className="text-lg font-mono dark:text-white">{formatDuration(duration)}</span>
        
        <div className="flex-1 flex items-center gap-1 ml-2">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-blue-500 rounded-full"
              animate={{
                height: [8, Math.random() * 24 + 8, 8],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.5,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      </div>

      <Button
        size="icon"
        onClick={handleSend}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
      >
        <Send className="w-5 h-5" />
      </Button>
    </motion.div>
  );
}
