import { 
  Building2, 
  Home, 
  Users, 
  CreditCard, 
  Wrench, 
  FileText, 
  Settings,
  User,
  Search,
  BarChart3,
  Headphones,
  Shield,
  Bell,
  Key,
  UserCog,
  Database,
} from "lucide-react";

export const landlordNavLinks = [
  { icon: Home, label: "Dashboard", href: "/landlord/dashboard" },
  { icon: Building2, label: "Properties", href: "/landlord/properties" },
  { icon: Users, label: "Units", href: "/landlord/units" },
  { icon: CreditCard, label: "Rent Collection", href: "/landlord/rent-collection" },
  { icon: Wrench, label: "Maintenance", href: "/landlord/maintenance" },
  { icon: FileText, label: "Agreements", href: "/landlord/agreements" },
  { icon: User, label: "Profile", href: "/landlord/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export const tenantNavLinks = [
  { icon: Home, label: "Dashboard", href: "/tenant/dashboard" },
  { icon: Search, label: "Search Properties", href: "/tenant/search" },
  { icon: CreditCard, label: "Rent Payment", href: "/tenant/rent" },
  { icon: Wrench, label: "Maintenance", href: "/tenant/maintenance" },
  { icon: FileText, label: "Agreements", href: "/tenant/agreements" },
  { icon: User, label: "Profile", href: "/tenant/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export const adminNavLinks = [
  { icon: Home, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Users, label: "User Management", href: "/admin/users" },
  { icon: Building2, label: "Properties", href: "/admin/properties" },
  { icon: Users, label: "Units", href: "/admin/units" },
  { icon: Wrench, label: "Maintenance", href: "/admin/maintenance" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: Headphones, label: "Support", href: "/admin/support" },
  { icon: CreditCard, label: "Subscriptions", href: "/admin/subscriptions" },
  { icon: FileText, label: "Audit Log", href: "/admin/audit-log" },
  { icon: Bell, label: "Announcements", href: "/admin/announcements" },
  { icon: User, label: "Profile", href: "/admin/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export const superAdminNavLinks = [
  { icon: Home, label: "Dashboard", href: "/superadmin/dashboard" },
  { icon: UserCog, label: "Admin Management", href: "/superadmin/admin-management" },
  { icon: Users, label: "User Management", href: "/superadmin/users" },
  { icon: Building2, label: "Properties", href: "/superadmin/properties" },
  { icon: Users, label: "Units", href: "/superadmin/units" },
  { icon: Wrench, label: "Maintenance", href: "/superadmin/maintenance" },
  { icon: BarChart3, label: "Analytics", href: "/superadmin/analytics" },
  { icon: Headphones, label: "Support", href: "/superadmin/support" },
  { icon: CreditCard, label: "Subscriptions", href: "/superadmin/subscriptions" },
  { icon: Shield, label: "Configuration", href: "/superadmin/configuration" },
  { icon: Database, label: "Database Health", href: "/superadmin/database-health" },
  { icon: Key, label: "Admin Codes", href: "/admin/verification-code" },
  { icon: FileText, label: "Audit Log", href: "/superadmin/audit-log" },
  { icon: Bell, label: "Announcements", href: "/superadmin/announcements" },
  { icon: User, label: "Profile", href: "/superadmin/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
];
