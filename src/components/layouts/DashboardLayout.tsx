import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Building2, 
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AnnouncementBanner } from "@/components/shared/AnnouncementBanner";

interface NavLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  superAdminOnly?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navLinks: NavLink[];
  userName?: string; // Override auto-detected name from auth context
  pageTitle?: string;
  pageDescription?: string;
  headerActions?: ReactNode;
  showBackButton?: boolean;
  backButtonPath?: string;
}

const DashboardLayout = ({
  children,
  navLinks,
  userName,
  pageTitle = "Dashboard",
  pageDescription,
  headerActions,
  showBackButton = false,
  backButtonPath,
}: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Get display name for user - use userName prop if provided, otherwise use auth user name with role
  const getDisplayName = () => {
    if (userName) return userName;
    if (!user) return "User";
    
    // For super_admin, show "Super Admin" if no custom name provided
    if (user.role === 'super_admin') {
      return user.name || "Super Admin";
    }
    
    // For admin, show "Admin" if no custom name provided
    if (user.role === 'admin') {
      return user.name || "Admin";
    }
    
    // For other roles, just show the name
    return user.name || "User";
  };

  const displayName = getDisplayName();

  // Get role description for dropdown
  const getRoleDescription = () => {
    if (user?.role === 'super_admin') return 'Super Admin';
    if (user?.role === 'admin') return 'Admin';
    return 'Manage your account';
  };

  const isActiveLink = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Filter nav links based on user role
  const filteredNavLinks = navLinks.filter(link => {
    // If link is marked as superAdminOnly, only show to super_admin users
    if (link.superAdminOnly && user?.role !== 'super_admin') {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  // Determine profile URL based on user role
  const getProfileUrl = () => {
    if (!user) return "/settings";
    switch (user.role) {
      case 'tenant':
        return '/tenant/profile';
      case 'landlord':
        return '/landlord/profile';
      case 'admin':
      case 'super_admin':
        return '/admin/profile';
      default:
        return '/settings';
    }
  };

  // Determine dashboard URL based on user role
  const getDashboardUrl = () => {
    if (!user) return "/";
    switch (user.role) {
      case 'tenant':
        return '/tenant/dashboard';
      case 'landlord':
        return '/landlord/dashboard';
      case 'admin':
      case 'super_admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar text-sidebar-foreground flex-shrink-0 transition-all duration-300 fixed h-screen z-50",
          sidebarOpen ? 'w-64' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-3 sm:p-4 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin">
          {/* Logo */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <Link to={getDashboardUrl()} className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-sidebar-primary-foreground" />
              </div>
              {sidebarOpen && <span className="text-lg sm:text-xl font-semibold">RentFlow</span>}
            </Link>
            
            {/* Mobile close button */}
            <button 
              className="lg:hidden p-2 hover:bg-sidebar-accent/50 rounded-lg transition-colors touch-target"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto scrollbar-thin">
            {filteredNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-lg transition-all touch-target",
                  isActiveLink(link.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <link.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm sm:text-base">{link.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Collapse button - desktop only */}
          <div className="pt-4 border-t border-sidebar-border/50 mt-4">
            <button 
              className="hidden lg:flex items-center justify-center w-full p-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <>
                  <ChevronLeft className="w-5 h-5 flex-shrink-0" />
                  <span className="ml-2">Collapse</span>
                </>
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        {/* Top bar */}
        <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile menu button */}
            <button 
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors touch-target flex-shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Back button */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => backButtonPath ? navigate(backButtonPath) : navigate(-1)}
                className="gap-2 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">{pageTitle}</h1>
              {pageDescription && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{pageDescription}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
            {headerActions && <div className="hidden sm:block">{headerActions}</div>}
            <Link 
              to="/notifications"
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors touch-target"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent flex items-center justify-center hover:opacity-90 transition-opacity touch-target" aria-label="User menu">
                  <span className="text-xs sm:text-sm font-semibold text-accent-foreground">
                    {displayName.split(' ').map(n => n[0]).join('')}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{getRoleDescription()}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getProfileUrl()} className="cursor-pointer">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <AnnouncementBanner />
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
