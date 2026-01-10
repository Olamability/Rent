import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Eagerly load critical pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminLogin from "./pages/auth/AdminLogin";
import AdminRegister from "./pages/auth/AdminRegister";
import WaitingForApproval from "./pages/auth/WaitingForApproval";

// Lazy load non-critical pages for better initial load performance
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const AdminForgotPassword = lazy(() => import("./pages/auth/AdminForgotPassword"));

// Landlord Pages
const LandlordDashboard = lazy(() => import("./pages/landlord/Dashboard"));
const PropertyManagement = lazy(() => import("./pages/landlord/PropertyManagement"));
const UnitManagement = lazy(() => import("./pages/landlord/UnitManagement"));
const RentCollection = lazy(() => import("./pages/landlord/RentCollection"));
const LandlordMaintenance = lazy(() => import("./pages/landlord/Maintenance"));
const TenancyAgreements = lazy(() => import("./pages/landlord/TenancyAgreements"));
const LandlordReports = lazy(() => import("./pages/landlord/Reports"));
const Subscription = lazy(() => import("./pages/landlord/Subscription"));
const AutomatedReminders = lazy(() => import("./pages/landlord/AutomatedReminders"));
const LandlordProfile = lazy(() => import("./pages/landlord/Profile"));

// Tenant Pages
const TenantDashboard = lazy(() => import("./pages/tenant/Dashboard"));
const PropertySearch = lazy(() => import("./pages/tenant/PropertySearch"));
const TenantPropertyDetails = lazy(() => import("./pages/tenant/PropertyDetails"));
const RentPayment = lazy(() => import("./pages/tenant/RentPayment"));
const TenantMaintenance = lazy(() => import("./pages/tenant/Maintenance"));
const TenantAgreements = lazy(() => import("./pages/tenant/Agreements"));
const AgreementReview = lazy(() => import("./pages/tenant/AgreementReview"));
const TenantProfile = lazy(() => import("./pages/tenant/Profile"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AdminPropertyManagement = lazy(() => import("./pages/admin/PropertyManagement"));
const AdminUnitManagement = lazy(() => import("./pages/admin/UnitManagement"));
const AdminMaintenanceManagement = lazy(() => import("./pages/admin/MaintenanceManagement"));
const PlatformAnalytics = lazy(() => import("./pages/admin/PlatformAnalytics"));
const SupportTickets = lazy(() => import("./pages/admin/SupportTickets"));
const SubscriptionManagement = lazy(() => import("./pages/admin/SubscriptionManagement"));
const SystemConfiguration = lazy(() => import("./pages/admin/SystemConfiguration"));
const AdminVerificationCode = lazy(() => import("./pages/admin/AdminVerificationCode"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));
const PlatformAnnouncements = lazy(() => import("./pages/admin/PlatformAnnouncements"));
const AdminProfile = lazy(() => import("./pages/admin/Profile"));

// Super Admin Pages
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/Dashboard"));
const AdminManagement = lazy(() => import("./pages/superadmin/AdminManagement"));
const DatabaseHealth = lazy(() => import("./pages/superadmin/DatabaseHealth"));

// Shared Pages
const Settings = lazy(() => import("./pages/shared/Settings"));
const Documents = lazy(() => import("./pages/shared/Documents"));
const PaymentHistory = lazy(() => import("./pages/shared/PaymentHistory"));
const Help = lazy(() => import("./pages/shared/Help"));
const Notifications = lazy(() => import("./pages/shared/Notifications"));
const BackendIntegrationTest = lazy(() => import("./pages/shared/BackendIntegrationTest"));

// Public Pages
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const Features = lazy(() => import("./pages/Features"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Blog = lazy(() => import("./pages/Blog"));
const Careers = lazy(() => import("./pages/Careers"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Changelog = lazy(() => import("./pages/Changelog"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Security = lazy(() => import("./pages/Security"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);


const queryClient = new QueryClient();

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <NotificationProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/security" element={<Security />} />

          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/waiting-for-approval" element={<ProtectedRoute requireCompleteProfile={false}><WaitingForApproval /></ProtectedRoute>} />
          
          {/* Landlord Routes - Protected */}
          <Route path="/landlord/dashboard" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordDashboard /></ProtectedRoute>} />
          <Route path="/landlord/properties" element={<ProtectedRoute allowedRoles={['landlord']}><PropertyManagement /></ProtectedRoute>} />
          <Route path="/landlord/units" element={<ProtectedRoute allowedRoles={['landlord']}><UnitManagement /></ProtectedRoute>} />
          <Route path="/landlord/rent-collection" element={<ProtectedRoute allowedRoles={['landlord']}><RentCollection /></ProtectedRoute>} />
          <Route path="/landlord/maintenance" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordMaintenance /></ProtectedRoute>} />
          <Route path="/landlord/agreements" element={<ProtectedRoute allowedRoles={['landlord']}><TenancyAgreements /></ProtectedRoute>} />
          <Route path="/landlord/reports" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordReports /></ProtectedRoute>} />
          <Route path="/landlord/subscription" element={<ProtectedRoute allowedRoles={['landlord']}><Subscription /></ProtectedRoute>} />
          <Route path="/landlord/reminders" element={<ProtectedRoute allowedRoles={['landlord']}><AutomatedReminders /></ProtectedRoute>} />
          <Route path="/landlord/profile" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordProfile /></ProtectedRoute>} />
          
          {/* Tenant Routes - Protected */}
          <Route path="/tenant/dashboard" element={<ProtectedRoute allowedRoles={['tenant']}><TenantDashboard /></ProtectedRoute>} />
          <Route path="/tenant/search" element={<ProtectedRoute allowedRoles={['tenant']}><PropertySearch /></ProtectedRoute>} />
          <Route path="/tenant/property/:id" element={<ProtectedRoute allowedRoles={['tenant']}><TenantPropertyDetails /></ProtectedRoute>} />
          <Route path="/tenant/rent" element={<ProtectedRoute allowedRoles={['tenant']}><RentPayment /></ProtectedRoute>} />
          <Route path="/tenant/maintenance" element={<ProtectedRoute allowedRoles={['tenant']}><TenantMaintenance /></ProtectedRoute>} />
          <Route path="/tenant/agreements" element={<ProtectedRoute allowedRoles={['tenant']}><TenantAgreements /></ProtectedRoute>} />
          <Route path="/tenant/agreements/review/:agreementId" element={<ProtectedRoute allowedRoles={['tenant']}><AgreementReview /></ProtectedRoute>} />
          <Route path="/tenant/profile" element={<ProtectedRoute allowedRoles={['tenant']}><TenantProfile /></ProtectedRoute>} />
          
          {/* Admin Routes - Protected */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/properties" element={<ProtectedRoute allowedRoles={['admin']}><AdminPropertyManagement /></ProtectedRoute>} />
          <Route path="/admin/units" element={<ProtectedRoute allowedRoles={['admin']}><AdminUnitManagement /></ProtectedRoute>} />
          <Route path="/admin/maintenance" element={<ProtectedRoute allowedRoles={['admin']}><AdminMaintenanceManagement /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><PlatformAnalytics /></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute allowedRoles={['admin']}><SupportTickets /></ProtectedRoute>} />
          <Route path="/admin/subscriptions" element={<ProtectedRoute allowedRoles={['admin']}><SubscriptionManagement /></ProtectedRoute>} />
          <Route path="/admin/audit-log" element={<ProtectedRoute allowedRoles={['admin']}><AuditLog /></ProtectedRoute>} />
          <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['admin']}><PlatformAnnouncements /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['admin']}><AdminProfile /></ProtectedRoute>} />
          
          {/* Super Admin Routes - Protected */}
          <Route path="/superadmin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/admin-management" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminManagement /></ProtectedRoute>} />
          <Route path="/superadmin/database-health" element={<ProtectedRoute allowedRoles={['super_admin']}><DatabaseHealth /></ProtectedRoute>} />
          <Route path="/superadmin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/superadmin/properties" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminPropertyManagement /></ProtectedRoute>} />
          <Route path="/superadmin/units" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminUnitManagement /></ProtectedRoute>} />
          <Route path="/superadmin/maintenance" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminMaintenanceManagement /></ProtectedRoute>} />
          <Route path="/superadmin/analytics" element={<ProtectedRoute allowedRoles={['super_admin']}><PlatformAnalytics /></ProtectedRoute>} />
          <Route path="/superadmin/support" element={<ProtectedRoute allowedRoles={['super_admin']}><SupportTickets /></ProtectedRoute>} />
          <Route path="/superadmin/subscriptions" element={<ProtectedRoute allowedRoles={['super_admin']}><SubscriptionManagement /></ProtectedRoute>} />
          <Route path="/superadmin/configuration" element={<ProtectedRoute allowedRoles={['super_admin']}><SystemConfiguration /></ProtectedRoute>} />
          <Route path="/superadmin/audit-log" element={<ProtectedRoute allowedRoles={['super_admin']}><AuditLog /></ProtectedRoute>} />
          <Route path="/superadmin/announcements" element={<ProtectedRoute allowedRoles={['super_admin']}><PlatformAnnouncements /></ProtectedRoute>} />
          <Route path="/superadmin/profile" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminProfile /></ProtectedRoute>} />
          <Route path="/admin/verification-code" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminVerificationCode /></ProtectedRoute>} />
          
          {/* Shared Routes - Protected */}
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          
          {/* Backend Integration Test - Public for testing */}
          <Route path="/backend-test" element={<BackendIntegrationTest />} />
          
          {/* Legacy Routes (for backward compatibility) */}
          <Route path="/dashboard" element={<LandlordDashboard />} />
          <Route path="/tenant" element={<TenantDashboard />} />
          
          {/* 404 - Keep this last */}
          <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </NotificationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
