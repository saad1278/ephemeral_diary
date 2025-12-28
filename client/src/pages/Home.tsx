import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCard } from "@/components/MessageCard";
import { Loader2, Send } from "lucide-react";
import type { Message } from "../../../drizzle/schema";

/**
 * Home page for the Ephemeral Diary.
 * Features:
 * - Anonymous message posting form
 * - Real-time message feed with countdown timers
 * - Elegant minimalist design
 * - Instagram footer link
 */
export default function Home() {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Fetch active messages
  const { data: fetchedMessages, isLoading: isLoadingMessages, refetch } = trpc.messages.list.useQuery();

  // Create message mutation
  const createMutation = trpc.messages.create.useMutation({
    onSuccess: (newMessage) => {
      setContent("");
      setMessages((prev) => [newMessage, ...prev]);
      refetch();
    },
    onError: (error) => {
      console.error("Failed to create message:", error);
    },
  });

  // Delete message mutation
  const deleteMutation = trpc.messages.delete.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== variables.id));
        refetch();
      }
    },
    onError: (error) => {
      console.error("Failed to delete message:", error);
    },
  });

  // Update messages when fetched
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({ content: content.trim() });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-6">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-light text-foreground tracking-tight">
              Ephemeral Diary
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Share your thoughts. They disappear in 24 hours.
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Message posting form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <label htmlFor="message-input" className="block text-sm font-medium text-foreground mb-3">
                Share your thought
              </label>
              <Textarea
                id="message-input"
                placeholder="What's on your mind? (max 500 characters)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                className="resize-none focus:ring-2 focus:ring-accent"
                rows={4}
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">
                  {content.length}/500
                </span>
                <Button
                  type="submit"
                  disabled={!content.trim() || isSubmitting || createMutation.isPending}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isSubmitting || createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Messages feed */}
          <div className="space-y-4">
            {isLoadingMessages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No messages yet. Be the first to share your thought.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="container py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Follow us on{" "}
              <a
                href="https://instagram.com/1_s44d"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/90 font-semibold transition-colors"
              >
                @1_s44d
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              © 2025 Ephemeral Diary. All messages are temporary.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
