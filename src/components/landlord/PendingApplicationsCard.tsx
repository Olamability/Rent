import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  DollarSign, 
  CheckCircle2,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { fetchApplicationsByLandlord } from "@/services/applicationService";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PendingApplication {
  id: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  income: number;
  moveInDate: Date;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';
}

export const PendingApplicationsCard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadApplications = async () => {
      try {
        setLoading(true);
        const apps = await fetchApplicationsByLandlord(user.id);
        
        // Get only pending applications
        const pendingApps = apps
          .filter(app => app.status === 'pending')
          .map(app => {
            // Build tenant name with fallbacks: users table -> personalInfo -> 'Unknown'
            const tenantName = app.users?.name || 
              (app.personalInfo?.firstName && app.personalInfo?.lastName 
                ? `${app.personalInfo.firstName} ${app.personalInfo.lastName}` 
                : app.personalInfo?.firstName || 'Unknown');
            
            return {
              id: app.id,
              tenantName,
              propertyName: app.properties?.name || 'Unknown Property',
              unitNumber: app.units?.unit_number || 'N/A',
              income: app.employmentInfo?.income || 0,
              moveInDate: app.moveInDate,
              submittedAt: app.submittedAt,
              status: app.status,
            };
          })
          .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
          .slice(0, 5); // Show top 5 most recent

        setApplications(pendingApps);
        setError(null);
      } catch (err) {
        console.error('Error loading applications:', err);
        setError('Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-accent/20">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Pending Applications
            </h3>
            <p className="text-sm text-muted-foreground">
              No pending applications at the moment.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-accent/20">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Pending Applications
            </h3>
            <p className="text-sm text-muted-foreground">
              {applications.length} application{applications.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/landlord/units">View All</Link>
        </Button>
      </div>

      <div className="space-y-4">
        {applications.map((app) => (
          <div 
            key={app.id} 
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-foreground">{app.tenantName}</p>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {app.propertyName} - Unit {app.unitNumber}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${app.income.toLocaleString()}/year
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Move-in: {new Date(app.moveInDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button variant="default" size="sm" asChild>
              <Link to="/landlord/units">Review</Link>
            </Button>
          </div>
        ))}
      </div>

      {applications.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/landlord/units">
              View All Applications
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
};
