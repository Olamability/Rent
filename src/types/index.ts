// User roles and authentication types
export type UserRole = 'landlord' | 'tenant' | 'admin' | 'super_admin';
export const VALID_USER_ROLES: readonly UserRole[] = ['landlord', 'tenant', 'admin', 'super_admin'] as const;
export type AccountStatus = 'pending' | 'approved' | 'suspended' | 'banned';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  createdAt: Date;
  isVerified: boolean;
  profileComplete?: boolean;
  profileCompleteness?: number; // 0-100 percentage
  accountStatus?: AccountStatus; // Account approval status
  profile?: TenantProfile | LandlordProfile | AdminProfile; // Role-specific profile data
}

export interface TenantProfile {
  // Personal Information
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationalId?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Employment Information
  employment?: {
    status: 'employed' | 'self-employed' | 'unemployed' | 'student' | 'retired';
    employer?: string;
    position?: string;
    monthlyIncome?: number;
    yearsEmployed?: number;
  };
  
  // Emergency Contact
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  
  // References
  refs?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }[];
  
  // Previous Address
  previousAddress?: {
    street: string;
    city: string;
    state: string;
    duration: string;
    landlordName?: string;
    landlordPhone?: string;
  };
}

export interface LandlordProfile {
  // Personal Information
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationalId?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Business Information
  businessInfo?: {
    registeredBusiness: boolean;
    businessName?: string;
    businessRegistrationNumber?: string;
    taxId?: string;
  };
  
  // Bank Details
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    routingNumber?: string;
  };
  
  // Verification Documents
  verificationDocuments?: {
    idCardUrl?: string;
    proofOfOwnershipUrl?: string;
    businessRegistrationUrl?: string;
  };
  
  // Subscription
  subscriptionPlan?: 'free' | 'pro';
  subscriptionStatus?: 'active' | 'cancelled' | 'expired';
}

export interface Landlord extends User {
  role: 'landlord';
  isPro: boolean;
  subscriptionStatus: 'free' | 'pro';
  subscriptionExpiry?: Date;
  properties: string[]; // Property IDs
  profile?: LandlordProfile;
}

export interface Tenant extends User {
  role: 'tenant';
  currentLeaseId?: string;
  applicationStatus?: 'pending' | 'approved' | 'rejected';
  profile?: TenantProfile;
}

export interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

export interface SuperAdmin extends User {
  role: 'super_admin';
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface AdminProfile {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Property and Unit types
export interface Property {
  id: string;
  landlordId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  type: 'apartment' | 'house' | 'condo' | 'townhouse';
  description: string;
  images: string[];
  amenities: string[];
  totalUnits: number;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
  isFeatured?: boolean;
  isPublished?: boolean;
}

// Marketplace listing type (combines property and unit data)
export interface MarketplaceListing {
  unitId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rentAmount: number;
  deposit: number;
  features: string[];
  availableDate?: Date;
  isFeatured: boolean;
  viewCount: number;
  propertyId: string;
  propertyName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: 'apartment' | 'house' | 'condo' | 'townhouse';
  description: string;
  images: string[];
  amenities: string[];
  latitude?: number;
  longitude?: number;
  landlordId: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rentAmount: number;
  deposit: number;
  isOccupied: boolean;
  currentTenantId?: string;
  features: string[];
  availableDate?: Date;
  listingStatus?: 'available' | 'applied' | 'rented' | 'unlisted';
  isPublicListing?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
}

// Tenancy and Lease types
export interface TenancyAgreement {
  id: string;
  landlordId: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  applicationId?: string;
  paymentId?: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  depositAmount: number;
  status: 'draft' | 'sent' | 'pending' | 'accepted' | 'signed' | 'active' | 'expired' | 'terminated' | 'renewed';
  documentUrl?: string;
  signedDate?: Date;
  tenantSignedAt?: Date;
  landlordSignedAt?: Date;
  tenantSignature?: string;
  landlordSignature?: string;
  terminatedAt?: Date;
  terminationReason?: string;
  agreementHash?: string;
  agreementVersion?: number;
  terms: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Payment types
export interface Payment {
  id: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  status: 'pending' | 'paid' | 'failed' | 'overdue' | 'partial';
  paymentMethod?: 'card' | 'transfer' | 'ussd' | 'cash';
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Maintenance Request types
export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest_control' | 'cleaning' | 'locks_security' | 'landscaping' | 'other';
  images: string[];
  videos?: string[];
  assignedTo?: string; // Worker ID or name
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedCost?: number;
  actualCost?: number;
}

export interface MaintenanceUpdate {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  images?: string[];
}

// Application types
export type ApplicationStatus = 
  | 'submitted'           // Initial submission
  | 'pending'            // Under review (backwards compatibility)
  | 'approved'           // Approved by landlord
  | 'agreement_sent'     // Agreement generated and sent
  | 'agreement_accepted' // Tenant accepted agreement
  | 'payment_pending'    // Waiting for payment
  | 'paid'              // Payment completed
  | 'rejected'          // Rejected
  | 'withdrawn'         // Withdrawn by tenant
  | 'cancelled'         // Cancelled
  | 'expired';          // Expired

export interface PropertyApplication {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  status: ApplicationStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  moveInDate?: Date;
  // Personal Information
  personalInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phone: string;
    email: string;
    nationalId?: string;
  };
  // Current Address
  currentAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    duration: string; // e.g., "2 years"
  };
  // Employment Information
  employmentInfo: {
    employer: string;
    position: string;
    income?: number;
    employmentDuration?: string; // e.g., "3 years"
    employerPhone?: string;
  };
  // Emergency Contact
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  // References (at least 2 recommended)
  refs: {
    name: string;
    phone: string;
    email?: string;
    relationship: string;
  }[];
  // Previous Landlord Reference
  previousLandlord?: {
    name: string;
    phone: string;
    address: string;
    rentalDuration: string;
  };
  // Additional Information
  pets?: {
    hasPets: boolean;
    petDetails?: string; // Type, breed, size
  };
  vehicles?: {
    hasVehicle: boolean;
    vehicleDetails?: string; // Make, model, license plate
  };
  occupants?: {
    numberOfOccupants: number;
    occupantDetails?: string; // Ages and relationships
  };
  // Legal and Consent
  creditCheckConsent?: boolean;
  backgroundCheckConsent?: boolean;
  // Documents
  documents: {
    idCard?: string;
    proofOfIncome?: string;
    refs?: string;
    bankStatement?: string;
    previousLeaseAgreement?: string;
  };
  notes?: string;
  adminNotes?: string;
  approvedBy?: string;
  decisionDate?: Date;
}


// Reminder and Notification types
export interface Reminder {
  id: string;
  type: 'rent_due' | 'rent_overdue' | 'lease_renewal' | 'maintenance';
  recipientId: string;
  recipientType: 'tenant' | 'landlord';
  message: string;
  scheduledFor: Date;
  sentAt?: Date;
  status: 'scheduled' | 'sent' | 'failed';
  channels: ('email' | 'sms' | 'push')[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

// Document types
export interface Document {
  id: string;
  uploadedBy: string;
  type: 'lease' | 'receipt' | 'id' | 'photo' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Subscription types
export interface Subscription {
  id: string;
  landlordId: string;
  plan: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  amount?: number;
  billingCycle?: 'monthly' | 'yearly';
  paymentMethod?: string;
}

// Analytics types
export interface RentCollectionAnalytics {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  monthlyTrend: {
    month: string;
    collected: number;
    pending: number;
  }[];
}

export interface OccupancyAnalytics {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
}

export interface MaintenanceAnalytics {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  averageResolutionTime: number; // in days
  costByCategory: {
    category: string;
    cost: number;
  }[];
}

// Ticket/Support types
export interface SupportTicket {
  id: string;
  userId: string;
  userRole: UserRole;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  userName: string;
  userRole: UserRole;
  message: string;
  createdAt: Date;
  attachments?: string[];
}

// Platform announcement types
export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  announcementType: 'info' | 'warning' | 'success' | 'error';
  targetAudience: 'all' | 'landlords' | 'tenants' | 'admins';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  authorId?: string;
  createdAt: Date;
  updatedAt: Date;
}
