import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Building2, Bell as BellIcon, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from "@/services/notificationService";
import { toast } from "sonner";

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications on mount
  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      try {
        setLoading(true);
        const data = await fetchNotifications(user.id);
        if (isMounted) {
          setNotifications(data);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
        if (isMounted) {
          toast.error('Failed to load notifications');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-6 h-6 text-success" />;
      case 'warning': return <AlertCircle className="w-6 h-6 text-warning" />;
      case 'error': return <AlertCircle className="w-6 h-6 text-destructive" />;
      default: return <Info className="w-6 h-6 text-info" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="w-6 h-6 text-accent-foreground" />
          </div>
          <span className="text-xl font-semibold">RentFlow</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>Mark All as Read</Button>
          <Link to={user?.role ? `/${user.role}/dashboard` : "/"}>
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
        <p className="text-muted-foreground mb-8">Stay updated with your latest activities</p>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <Card key={notification.id} className={`p-6 ${notification.isRead ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{getTimeAgo(notification.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    {!notification.isRead && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 px-0"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <BellIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No notifications</h3>
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
