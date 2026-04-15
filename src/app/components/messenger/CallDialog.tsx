import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { VisuallyHidden } from "../ui/visually-hidden";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";

interface CallDialogProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  isVideo: boolean;
}

export function CallDialog({ open, onClose, contactName, isVideo }: CallDialogProps) {
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected">("connecting");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideo);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  useEffect(() => {
    if (!open) {
      setCallStatus("connecting");
      setDuration(0);
      setIsMuted(false);
      setIsVideoOn(isVideo);
      return;
    }

    // Simulate call progression
    const connectTimer = setTimeout(() => {
      setCallStatus("ringing");
    }, 1000);

    const answerTimer = setTimeout(() => {
      setCallStatus("connected");
    }, 3000);

    return () => {
      clearTimeout(connectTimer);
      clearTimeout(answerTimer);
    };
  }, [open, isVideo]);

  useEffect(() => {
    if (callStatus === "connected") {
      const interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEndCall = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[600px] p-0 border-0 dark:bg-gray-900">
        <VisuallyHidden>
          <DialogTitle>{isVideo ? "Видео звонок" : "Аудио звонок"} с {contactName}</DialogTitle>
          <DialogDescription>
            {callStatus === "connecting" && "Подключение к звонку"}
            {callStatus === "ringing" && "Ожидание ответа"}
            {callStatus === "connected" && `Активный звонок: ${formatDuration(duration)}`}
          </DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col items-center justify-between h-full p-8 bg-gradient-to-b from-blue-500 to-blue-700 dark:from-blue-900 dark:to-gray-900 text-white">
          {/* Contact Info */}
          <div className="flex flex-col items-center gap-4 mt-8">
            <motion.div
              animate={callStatus === "ringing" ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Avatar className="w-32 h-32 border-4 border-white/30">
                <AvatarFallback className="bg-blue-600 text-white text-4xl">
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">{contactName}</h2>
              <p className="text-white/80">
                {callStatus === "connecting" && "Подключение..."}
                {callStatus === "ringing" && "Звонок..."}
                {callStatus === "connected" && formatDuration(duration)}
              </p>
            </div>
          </div>

          {/* Video placeholder */}
          {isVideo && isVideoOn && callStatus === "connected" && (
            <div className="flex-1 w-full max-w-md bg-gray-900/50 rounded-lg flex items-center justify-center my-8">
              <p className="text-white/60">Видео собеседника</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4 mb-8">
            {callStatus === "connected" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-14 h-14 rounded-full ${
                    isMuted ? "bg-red-500" : "bg-white/20"
                  } hover:bg-white/30`}
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                {isVideo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`w-14 h-14 rounded-full ${
                      !isVideoOn ? "bg-red-500" : "bg-white/20"
                    } hover:bg-white/30`}
                    onClick={() => setIsVideoOn(!isVideoOn)}
                  >
                    {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-14 h-14 rounded-full ${
                    !isSpeakerOn ? "bg-red-500" : "bg-white/20"
                  } hover:bg-white/30`}
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                >
                  {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleEndCall}
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}