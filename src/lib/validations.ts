import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['tenant', 'landlord', 'admin', 'super_admin']),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  role: z.enum(['tenant', 'landlord']),
  phone: z.string().optional(),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Property schemas
export const propertySchema = z.object({
  name: z.string().min(2, 'Property name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  type: z.enum(['apartment', 'house', 'condo', 'townhouse']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  amenities: z.array(z.string()).optional(),
  totalUnits: z.number().min(1, 'Must have at least 1 unit'),
});

// Unit schemas
export const unitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  bedrooms: z.number().min(0, 'Bedrooms must be 0 or more'),
  bathrooms: z.number().min(0.5, 'Bathrooms must be at least 0.5'),
  squareFeet: z.number().min(1, 'Square feet must be greater than 0'),
  rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
  deposit: z.number().min(0, 'Deposit must be 0 or more'),
  features: z.array(z.string()).optional(),
  availableDate: z.date().optional(),
});

// Payment schemas
export const paymentSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['card', 'transfer', 'ussd', 'cash']),
  savePaymentMethod: z.boolean().optional(),
});

export const paymentMethodSchema = z.object({
  type: z.enum(['card', 'bank']),
  cardDetails: z.object({
    cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits').optional(),
    expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Invalid expiry date (MM/YY)').optional(),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits').optional(),
    cardholderName: z.string().min(2, 'Cardholder name is required').optional(),
  }).optional(),
  bankDetails: z.object({
    accountName: z.string().min(2, 'Account holder name is required').optional(),
    accountNumber: z.string().regex(/^\d{10,12}$/, 'Invalid account number').optional(),
    bankName: z.string().min(2, 'Bank name is required').optional(),
    routingNumber: z.string().regex(/^\d{9}$/, 'Routing number must be 9 digits').optional(),
  }).optional(),
});

// Maintenance request schemas
export const maintenanceRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'cleaning', 'locks_security', 'landscaping', 'other']),
  images: z.array(z.string()).optional(),
});

// Tenancy agreement schemas
export const tenancyAgreementSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().min(1, 'Unit is required'),
  startDate: z.date(),
  endDate: z.date(),
  rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
  deposit: z.number().min(0, 'Deposit must be 0 or more'),
  terms: z.array(z.string()).optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Profile update schemas
export const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^\+?1?\d{10,14}$/, 'Invalid phone number').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ['confirmNewPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ['newPassword'],
});

// Application schema
export const applicationSchema = z.object({
  moveInDate: z.date(),
  employmentInfo: z.object({
    employer: z.string().min(2, 'Employer name is required'),
    position: z.string().min(2, 'Position is required'),
    income: z.number().min(1).optional(),
  }),
  refs: z.array(z.object({
    name: z.string().min(2, 'Reference name is required'),
    phone: z.string().regex(/^\+?1?\d{10,14}$/, 'Invalid phone number'),
    relationship: z.string().min(2, 'Relationship is required'),
  })).min(1, 'At least one reference is required'),
});

// Support ticket schema
export const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.enum(['technical', 'billing', 'general', 'feature_request', 'other']).optional(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PropertyFormData = z.infer<typeof propertySchema>;
export type UnitFormData = z.infer<typeof unitSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;
export type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;
export type TenancyAgreementFormData = z.infer<typeof tenancyAgreementSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
export type ApplicationFormData = z.infer<typeof applicationSchema>;
export type SupportTicketFormData = z.infer<typeof supportTicketSchema>;
