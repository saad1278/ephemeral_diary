import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MessageCard } from "@/components/MessageCard";
import { Loader2, ArrowLeft, Bell, BellOff } from "lucide-react";
import { useLocation } from "wouter";
import type { Message } from "../../../drizzle/schema";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyBefore, setNotifyBefore] = useState(60);

  // Fetch user's messages
  const { data: userMessages, isLoading: isLoadingMessages, refetch: refetchMessages } = trpc.dashboard.getMyMessages.useQuery();

  // Fetch user preferences
  const { data: preferences, isLoading: isLoadingPrefs } = trpc.dashboard.getPreferences.useQuery();

  // Update preferences mutation
  const updatePrefsMutation = trpc.dashboard.updatePreferences.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
  });

  // Delete message mutation
  const deleteMutation = trpc.messages.delete.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== variables.id));
        refetchMessages();
      }
    },
  });

  // Update messages when fetched
  useEffect(() => {
    if (userMessages) {
      setMessages(userMessages);
    }
  }, [userMessages]);

  // Update preferences when fetched
  useEffect(() => {
    if (preferences) {
      setNotificationsEnabled(preferences.notificationsEnabled === "true");
      setNotifyBefore(preferences.notifyBefore);
    }
  }, [preferences]);

  const handleToggleNotifications = async () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    await updatePrefsMutation.mutateAsync({
      notificationsEnabled: newState,
      notifyBefore,
    });
  };

  const handleNotifyBeforeChange = async (value: number) => {
    setNotifyBefore(value);
    await updatePrefsMutation.mutateAsync({
      notificationsEnabled,
      notifyBefore: value,
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-light text-foreground">My Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user.name || user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Settings section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Notification Settings</h2>
            
            <div className="space-y-4">
              {/* Notifications toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-accent" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">Message Expiration Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      {notificationsEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={notificationsEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleNotifications}
                  disabled={updatePrefsMutation.isPending}
                >
                  {notificationsEnabled ? "Disable" : "Enable"}
                </Button>
              </div>

              {/* Notify before setting */}
              {notificationsEnabled && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notify me before expiration
                  </label>
                  <select
                    value={notifyBefore}
                    onChange={(e) => handleNotifyBeforeChange(Number(e.target.value))}
                    disabled={updatePrefsMutation.isPending}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={120}>2 hours before</option>
                    <option value={360}>6 hours before</option>
                    <option value={720}>12 hours before</option>
                    <option value={1440}>24 hours before</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Messages section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Messages</h2>
            
            <div className="space-y-4">
              {isLoadingMessages || isLoadingPrefs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-lg">
                  <p className="text-muted-foreground">You haven't posted any messages yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/")}
                    className="mt-4"
                  >
                    Go back and post a message
                  </Button>
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
        </div>
      </main>
    </div>
  );
}
