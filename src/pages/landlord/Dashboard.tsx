import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  MoreVertical,
  ChevronRight,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { AddPropertyDialog } from "@/components/landlord/AddPropertyDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { landlordNavLinks } from "@/config/navigation";
import { Home, FileText, Wrench } from "lucide-react";
import { fetchLandlordDashboardData, type LandlordDashboardData } from "@/services/landlordDashboardService";
import { fetchUpcomingEvents, type UpcomingEvent } from "@/services/upcomingEventsService";
import { PendingApplicationsCard } from "@/components/landlord/PendingApplicationsCard";

const LandlordDashboard = () => {
  const navigate = useNavigate();
  const { user, getProfileCompleteness } = useAuth();
  const [isAddPropertyDialogOpen, setIsAddPropertyDialogOpen] = useState(false);
  const completeness = getProfileCompleteness();
  const [dashboardData, setDashboardData] = useState<LandlordDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  // Fetch dashboard data on mount
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      try {
        setError(null);
        setLoading(true);
        const [data, events] = await Promise.all([
          fetchLandlordDashboardData(user.id),
          fetchUpcomingEvents(user.id)
        ]);
        if (isMounted) {
          setDashboardData(data);
          setUpcomingEvents(events);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (isMounted) {
          setError('Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const stats = dashboardData ? [
    { label: "Total Revenue", value: `$${dashboardData.stats.totalRevenue.toLocaleString()}`, change: "+12.5%", trend: "up" as const, icon: DollarSign },
    { label: "Occupancy Rate", value: `${dashboardData.stats.occupancyRate}%`, change: "+3.2%", trend: "up" as const, icon: Home },
    { label: "Active Leases", value: `${dashboardData.stats.activeLeases}`, change: "+2", trend: "up" as const, icon: FileText },
    { label: "Open Requests", value: `${dashboardData.stats.openRequests}`, change: "-3", trend: dashboardData.stats.openRequests > 0 ? "up" as const : "down" as const, icon: Wrench },
  ] : [];

  const recentPayments = dashboardData?.recentPayments || [];
  const properties = dashboardData?.properties || [];

  return (
    <DashboardLayout
      navLinks={landlordNavLinks}
      userName={user?.name || "User"}
      pageTitle="Dashboard"
      pageDescription={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}`}
      headerActions={
        <Button variant="accent" size="sm" onClick={() => setIsAddPropertyDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      }
    >
      <AddPropertyDialog 
        open={isAddPropertyDialogOpen} 
        onOpenChange={setIsAddPropertyDialogOpen}
        onPropertyAdded={() => {
          // Refresh dashboard data after property is added
          if (user?.id) {
            fetchLandlordDashboardData(user.id)
              .then(data => setDashboardData(data))
              .catch(err => console.error('Failed to refresh dashboard:', err));
          }
        }}
      />
      
          {/* Profile Completion Banner */}
          <ProfileCompletionBanner
            completeness={completeness}
            profileUrl="/landlord/profile"
            className="mb-6"
          />

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-6 sm:mb-8">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : stats.length > 0 ? (
              stats.map((stat) => (
                <div key={stat.label} className="bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-5 lg:p-6 hover:shadow-soft transition-shadow">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs sm:text-sm ${stat.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                      {stat.trend === 'up' ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                      <span className="hidden xs:inline">{stat.change}</span>
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No statistics available</p>
              </div>
            )}
          </div>

          {/* Pending Applications Card */}
          <div className="mb-6 sm:mb-8">
            <PendingApplicationsCard />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {/* Recent Payments */}
            <div className="lg:col-span-2 bg-card rounded-lg sm:rounded-xl border border-border overflow-hidden">
              <div className="p-4 sm:p-5 lg:p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Recent Payments</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/landlord/rent-collection')} className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">View All</span>
                  <span className="sm:hidden">All</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="p-4 sm:p-5 lg:p-6">
                {recentPayments.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {recentPayments.map((payment, index) => (
                      <div key={index} className="flex flex-col xs:flex-row xs:items-center justify-between py-3 border-b border-border/50 last:border-0 gap-3 xs:gap-4">
                        <div className="flex items-center gap-3 xs:gap-4 min-w-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <span className="text-xs sm:text-sm font-medium text-secondary-foreground">
                              {payment.tenant.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm sm:text-base text-foreground truncate">{payment.tenant}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">{payment.unit}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between xs:justify-end gap-3 xs:gap-4">
                          <div className="text-left xs:text-right">
                            <div className="font-semibold text-sm sm:text-base text-foreground">{payment.amount}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">{payment.date}</div>
                          </div>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            payment.status === 'Paid' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No recent payments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Properties Overview */}
            <div className="bg-card rounded-lg sm:rounded-xl border border-border overflow-hidden">
              <div className="p-4 sm:p-5 lg:p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Properties</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-muted-foreground hover:text-foreground touch-target" aria-label="Property actions">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/landlord/properties')}>
                      View All Properties
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsAddPropertyDialogOpen(true)}>
                      Add Property
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="p-3 sm:p-4">
                {properties.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {properties.map((property) => (
                      <div 
                        key={property.id} 
                        className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/landlord/properties')}
                      >
                        <img 
                          src={property.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=150&fit=crop"} 
                          alt={property.name}
                          className="w-14 h-11 sm:w-16 sm:h-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base text-foreground truncate">{property.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{property.occupied}/{property.units} units</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-sm sm:text-base text-foreground whitespace-nowrap">{property.revenue}</div>
                          <div className="text-xs text-muted-foreground">/month</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">No properties added yet</p>
                    <Button variant="outline" size="sm" onClick={() => setIsAddPropertyDialogOpen(true)} className="touch-target">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Property
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <div className="mt-4 sm:mt-5 lg:mt-6 bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-5 lg:p-6">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between mb-4 sm:mb-6 gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Upcoming</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/landlord/rent-collection')} className="touch-target w-full xs:w-auto">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Calendar
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {upcomingEvents.slice(0, 3).map((event, index) => (
                  <div key={index} className={`p-3 sm:p-4 rounded-lg ${
                    event.type === 'rent_due' ? 'bg-warning/5 border border-warning/20' :
                    event.type === 'lease_renewal' ? 'bg-info/5 border border-info/20' :
                    'bg-destructive/5 border border-destructive/20'
                  }`}>
                    <div className={`flex items-center gap-2 mb-2 ${
                      event.type === 'rent_due' ? 'text-warning' :
                      event.type === 'lease_renewal' ? 'text-info' :
                      'text-destructive'
                    }`}>
                      {event.type === 'rent_due' && <CreditCard className="w-4 h-4" />}
                      {event.type === 'lease_renewal' && <FileText className="w-4 h-4" />}
                      {event.type === 'maintenance' && <Wrench className="w-4 h-4" />}
                      <span className="text-sm font-medium">{event.title}</span>
                    </div>
                    <div className="text-foreground font-semibold">{event.description}</div>
                    <div className="text-sm text-muted-foreground">{event.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
    </DashboardLayout>
  );
};

export default LandlordDashboard;
