import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCard } from "@/components/MessageCard";
import { Loader2, Send, LogIn, LayoutDashboard, Heart, HeartOff } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import type { Message } from "../../../drizzle/schema";

interface EnrichedMessage extends Message {
  likes: number;
  dislikes: number;
  userReaction: "like" | "dislike" | null;
}

export default function Home() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);

  const { data: fetchedMessages, isLoading: isLoadingMessages, refetch } = trpc.messages.list.useQuery();

  const createMutation = trpc.messages.create.useMutation({
    onSuccess: (newMessage) => {
      setContent("");
      setMessages((prev) => [{ ...newMessage, likes: 0, dislikes: 0, userReaction: null }, ...prev]);
      refetch();
    },
    onError: (error) => {
      console.error("Failed to create message:", error);
    },
  });

  const reactMutation = trpc.messages.react.useMutation({
    onSuccess: (result, variables) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === variables.messageId
            ? {
                ...m,
                likes: result.likes,
                dislikes: result.dislikes,
                userReaction: result.userReaction,
              }
            : m
        )
      );
    },
  });

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

  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages as EnrichedMessage[]);
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

  const handleReact = (messageId: number, reactionType: "like" | "dislike") => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    reactMutation.mutate({ messageId, reactionType });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-blue-100/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Ephemeral Diary
              </h1>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                Share your thoughts. They disappear in 24 hours.
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/dashboard")}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Message posting form */}
          {user ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <label htmlFor="message-input" className="block text-sm font-semibold text-slate-900 mb-3">
                  Share your thought
                </label>
                <Textarea
                  id="message-input"
                  placeholder="What's on your mind? (max 500 characters)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={500}
                  className="resize-none focus:ring-2 focus:ring-blue-400 border-blue-100"
                  rows={4}
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-slate-500 font-medium">
                    {content.length}/500
                  </span>
                  <Button
                    type="submit"
                    disabled={!content.trim() || isSubmitting || createMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium"
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
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-xl p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to share your thoughts?</h3>
              <p className="text-slate-600 mb-4">Log in to post messages that will disappear in 24 hours.</p>
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login to Post
              </Button>
            </div>
          )}

          {/* Messages feed */}
          <div className="space-y-4">
            {isLoadingMessages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 bg-white border border-blue-100 rounded-xl">
                <p className="text-slate-600 font-medium">
                  No messages yet. Be the first to share your thought.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-slate-900 text-base leading-relaxed mb-4">{message.content}</p>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  {/* Time remaining and reactions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Time remaining: 23h 59m 22s
                    </span>

                    <div className="flex items-center gap-4">
                      {/* Like button */}
                      <button
                        onClick={() => handleReact(message.id, "like")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                          message.userReaction === "like"
                            ? "bg-red-100 text-red-600"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${message.userReaction === "like" ? "fill-current" : ""}`} />
                        <span className="text-xs font-medium">{message.likes}</span>
                      </button>

                      {/* Dislike button */}
                      <button
                        onClick={() => handleReact(message.id, "dislike")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                          message.userReaction === "dislike"
                            ? "bg-slate-200 text-slate-700"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <HeartOff className={`w-4 h-4 ${message.userReaction === "dislike" ? "fill-current" : ""}`} />
                        <span className="text-xs font-medium">{message.dislikes}</span>
                      </button>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(message.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-100/50 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="container py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-slate-600">
              Follow us on{" "}
              <a
                href="https://instagram.com/1_s44d"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                @1_s44d
              </a>
            </p>
            <p className="text-xs text-slate-500">
              © 2025 Ephemeral Diary. All messages are temporary.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
