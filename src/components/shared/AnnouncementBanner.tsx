import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchActiveAnnouncementsForRole, PlatformAnnouncement } from "@/services/announcementService";
import { useAuth } from "@/contexts/AuthContext";

/**
 * AnnouncementBanner - Displays active platform announcements for the current user's role
 * Placed at the top of dashboard pages to show important updates and messages
 */
export function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, [user?.role]);

  const loadAnnouncements = async () => {
    if (!user?.role) return;
    
    try {
      setLoading(true);
      const data = await fetchActiveAnnouncementsForRole(user.role);
      setAnnouncements(data);
      
      // Load dismissed announcements from localStorage
      const dismissed = localStorage.getItem('dismissedAnnouncements');
      if (dismissed) {
        setDismissedIds(JSON.parse(dismissed));
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  const getTypeIcon = (type: PlatformAnnouncement['type']) => {
    const icons = {
      info: <Info className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />,
      warning: <AlertTriangle className="h-4 w-4" />,
      error: <AlertCircle className="h-4 w-4" />,
    };
    return icons[type];
  };

  const getVariant = (type: PlatformAnnouncement['type']): 'default' | 'destructive' => {
    const variants: Record<PlatformAnnouncement['type'], 'default' | 'destructive'> = {
      info: 'default',
      success: 'default',
      warning: 'destructive',
      error: 'destructive',
    };
    return variants[type];
  };

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {visibleAnnouncements.map((announcement) => (
        <Alert key={announcement.id} variant={getVariant(announcement.type)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2 flex-1">
              {getTypeIcon(announcement.type)}
              <div className="flex-1">
                <AlertTitle className="mb-1">{announcement.title}</AlertTitle>
                <AlertDescription>{announcement.message}</AlertDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => handleDismiss(announcement.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
