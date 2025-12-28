import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "../../../drizzle/schema";

interface MessageCardProps {
  message: Message;
  onDelete?: (id: number) => void;
}

/**
 * MessageCard displays a single ephemeral message with a countdown timer.
 * The countdown shows hours:minutes:seconds until the message expires.
 * A progress bar indicates the time remaining as a visual indicator.
 */
export function MessageCard({ message, onDelete }: MessageCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [progress, setProgress] = useState<number>(100);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(message.expiresAt).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining("Expired");
        setProgress(0);
        return;
      }

      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);

      // Calculate progress (0-100%)
      const createdAt = new Date(message.createdAt).getTime();
      const totalDuration = expiresAt - createdAt;
      const elapsed = now - createdAt;
      const progressPercent = Math.max(0, Math.min(100, 100 - (elapsed / totalDuration) * 100));
      setProgress(progressPercent);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [message]);

  if (isExpired) {
    return null; // Don't render expired messages
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Message content */}
      <p className="text-foreground text-base leading-relaxed mb-4 break-words">
        {message.content}
      </p>

      {/* Progress bar and countdown */}
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Countdown timer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Time remaining
          </span>
          <span className="text-xs text-accent font-semibold tracking-wide">
            {timeRemaining}
          </span>
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <div className="mt-4 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(message.id)}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
