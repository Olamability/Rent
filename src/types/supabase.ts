export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          role: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          role: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_profiles: {
        Row: {
          created_at: string | null
          department: string | null
          first_name: string | null
          id: string
          is_super_admin: boolean | null
          last_name: string | null
          permissions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          first_name?: string | null
          id?: string
          is_super_admin?: boolean | null
          last_name?: string | null
          permissions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          first_name?: string | null
          id?: string
          is_super_admin?: boolean | null
          last_name?: string | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_signatures: {
        Row: {
          agreement_hash: string
          agreement_id: string
          agreement_version: number
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip_address: unknown
          signature_timestamp: string
          signer_id: string
          signer_role: string
          user_agent: string | null
        }
        Insert: {
          agreement_hash: string
          agreement_id: string
          agreement_version?: number
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: unknown
          signature_timestamp?: string
          signer_id: string
          signer_role: string
          user_agent?: string | null
        }
        Update: {
          agreement_hash?: string
          agreement_id?: string
          agreement_version?: number
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: unknown
          signature_timestamp?: string
          signer_id?: string
          signer_role?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_signatures_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreement_signing_status"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "agreement_signatures_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          performed_by: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          performed_by?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          performed_by?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          file_url: string
          document_type: string
          file_size: number | null
          id: string
          mime_type: string | null
          file_name: string
          uploaded_by: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_url: string
          document_type: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          file_name: string
          uploaded_by: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string
          document_type?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          file_name?: string
          uploaded_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          role: string
          used: boolean | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          role: string
          used?: boolean | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          role?: string
          used?: boolean | null
          used_by?: string | null
        }
        Relationships: []
      }
      landlord_profiles: {
        Row: {
          address: Json | null
          bank_details: Json | null
          business_info: Json | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string | null
          id: string
          last_name: string | null
          national_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string
          verification_documents: Json | null
        }
        Insert: {
          address?: Json | null
          bank_details?: Json | null
          business_info?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          national_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
          verification_documents?: Json | null
        }
        Update: {
          address?: Json | null
          bank_details?: Json | null
          business_info?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          national_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
          verification_documents?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "landlord_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          category: string
          completed_at: string | null
          created_at: string | null
          description: string
          estimated_cost: number | null
          id: string
          images: Json | null
          landlord_id: string
          priority: string | null
          request_status: string | null
          tenancy_id: string | null
          tenant_id: string
          title: string
          unit_id: string
          updated_at: string | null
          videos: Json | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          landlord_id: string
          priority?: string | null
          request_status?: string | null
          tenancy_id?: string | null
          tenant_id: string
          title: string
          unit_id: string
          updated_at?: string | null
          videos?: Json | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          landlord_id?: string
          priority?: string | null
          request_status?: string | null
          tenancy_id?: string | null
          tenant_id?: string
          title?: string
          unit_id?: string
          updated_at?: string | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_updates: {
        Row: {
          created_at: string | null
          id: string
          images: Json | null
          message: string
          request_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          images?: Json | null
          message: string
          request_id: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          images?: Json | null
          message?: string
          request_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_updates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_id: string | null
          created_at: string | null
          due_date: string
          id: string
          landlord_id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_status: string | null
          receipt_url: string | null
          tenancy_agreement_id: string | null
          tenant_id: string
          transaction_id: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          application_id?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          landlord_id: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          tenancy_agreement_id?: string | null
          tenant_id: string
          transaction_id?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          application_id?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          landlord_id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          tenancy_agreement_id?: string | null
          tenant_id?: string
          transaction_id?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "property_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenancy_agreement_id_fkey"
            columns: ["tenancy_agreement_id"]
            isOneToOne: false
            referencedRelation: "agreement_signing_status"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "payments_tenancy_agreement_id_fkey"
            columns: ["tenancy_agreement_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          announcement_type: string
          created_at: string | null
          created_by: string
          end_date: string | null
          id: string
          is_active: boolean | null
          message: string
          start_date: string
          target_audience: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_type: string
          created_at?: string | null
          created_by: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          start_date?: string
          target_audience?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_type?: string
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          start_date?: string
          target_audience?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          amenities: Json | null
          city: string
          created_at: string | null
          description: string | null
          id: string
          images: Json | null
          is_featured: boolean | null
          is_published: boolean | null
          landlord_id: string
          latitude: number | null
          longitude: number | null
          name: string
          property_type: string
          state: string
          total_units: number | null
          updated_at: string | null
          zip_code: string
        }
        Insert: {
          address: string
          amenities?: Json | null
          city: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          is_published?: boolean | null
          landlord_id: string
          latitude?: number | null
          longitude?: number | null
          name: string
          property_type: string
          state: string
          total_units?: number | null
          updated_at?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          amenities?: Json | null
          city?: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          is_published?: boolean | null
          landlord_id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          property_type?: string
          state?: string
          total_units?: number | null
          updated_at?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_applications: {
        Row: {
          admin_notes: string | null
          application_status: string | null
          approved_by: string | null
          background_check_consent: boolean | null
          created_at: string | null
          credit_check_consent: boolean | null
          current_address: Json | null
          decision_date: string | null
          documents: Json | null
          emergency_contact: Json | null
          employment_info: Json | null
          id: string
          move_in_date: string
          notes: string | null
          occupants: Json | null
          personal_info: Json | null
          pets: Json | null
          previous_landlord: Json | null
          property_id: string
          refs: Json | null
          reviewed_at: string | null
          submitted_at: string | null
          tenant_id: string
          unit_id: string
          updated_at: string | null
          vehicles: Json | null
          withdrawal_date: string | null
          withdrawal_reason: string | null
        }
        Insert: {
          admin_notes?: string | null
          application_status?: string | null
          approved_by?: string | null
          background_check_consent?: boolean | null
          created_at?: string | null
          credit_check_consent?: boolean | null
          current_address?: Json | null
          decision_date?: string | null
          documents?: Json | null
          emergency_contact?: Json | null
          employment_info?: Json | null
          id?: string
          move_in_date: string
          notes?: string | null
          occupants?: Json | null
          personal_info?: Json | null
          pets?: Json | null
          previous_landlord?: Json | null
          property_id: string
          refs?: Json | null
          reviewed_at?: string | null
          submitted_at?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string | null
          vehicles?: Json | null
          withdrawal_date?: string | null
          withdrawal_reason?: string | null
        }
        Update: {
          admin_notes?: string | null
          application_status?: string | null
          approved_by?: string | null
          background_check_consent?: boolean | null
          created_at?: string | null
          credit_check_consent?: boolean | null
          current_address?: Json | null
          decision_date?: string | null
          documents?: Json | null
          emergency_contact?: Json | null
          employment_info?: Json | null
          id?: string
          move_in_date?: string
          notes?: string | null
          occupants?: Json | null
          personal_info?: Json | null
          pets?: Json | null
          previous_landlord?: Json | null
          property_id?: string
          refs?: Json | null
          reviewed_at?: string | null
          submitted_at?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string | null
          vehicles?: Json | null
          withdrawal_date?: string | null
          withdrawal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "property_applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          channels: Json | null
          created_at: string | null
          id: string
          message: string
          recipient_id: string
          recipient_type: string
          reminder_status: string | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          channels?: Json | null
          created_at?: string | null
          id?: string
          message: string
          recipient_id: string
          recipient_type: string
          reminder_status?: string | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          channels?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          recipient_id?: string
          recipient_type?: string
          reminder_status?: string | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          billing_cycle: string | null
          created_at: string | null
          end_date: string | null
          id: string
          landlord_id: string
          payment_method: string | null
          start_date: string
          subscription_plan: string
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          billing_cycle?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          landlord_id: string
          payment_method?: string | null
          start_date: string
          subscription_plan: string
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          billing_cycle?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          landlord_id?: string
          payment_method?: string | null
          start_date?: string
          subscription_plan?: string
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_status: string | null
          updated_at: string | null
          user_id: string
          user_role: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_status?: string | null
          updated_at?: string | null
          user_id: string
          user_role: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_status?: string | null
          updated_at?: string | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_category: string | null
          config_key: string
          config_value: string
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_category?: string | null
          config_key: string
          config_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_category?: string | null
          config_key?: string
          config_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          agreement_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          landlord_id: string
          monthly_rent: number
          property_id: string
          start_date: string
          status: string | null
          tenant_id: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          agreement_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          landlord_id: string
          monthly_rent: number
          property_id: string
          start_date: string
          status?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          agreement_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          landlord_id?: string
          monthly_rent?: number
          property_id?: string
          start_date?: string
          status?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreement_signing_status"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "tenancies_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_agreements: {
        Row: {
          agreement_hash: string | null
          agreement_status: string | null
          agreement_version: number | null
          application_id: string | null
          created_at: string | null
          deposit_amount: number
          document_url: string | null
          end_date: string
          id: string
          landlord_id: string
          landlord_signature: string | null
          landlord_signed_at: string | null
          payment_id: string | null
          property_id: string
          rent_amount: number
          signed_date: string | null
          start_date: string
          tenant_id: string
          tenant_signature: string | null
          tenant_signed_at: string | null
          terminated_at: string | null
          termination_reason: string | null
          terms: Json | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          agreement_hash?: string | null
          agreement_status?: string | null
          agreement_version?: number | null
          application_id?: string | null
          created_at?: string | null
          deposit_amount: number
          document_url?: string | null
          end_date: string
          id?: string
          landlord_id: string
          landlord_signature?: string | null
          landlord_signed_at?: string | null
          payment_id?: string | null
          property_id: string
          rent_amount: number
          signed_date?: string | null
          start_date: string
          tenant_id: string
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          terms?: Json | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          agreement_hash?: string | null
          agreement_status?: string | null
          agreement_version?: number | null
          application_id?: string | null
          created_at?: string | null
          deposit_amount?: number
          document_url?: string | null
          end_date?: string
          id?: string
          landlord_id?: string
          landlord_signature?: string | null
          landlord_signed_at?: string | null
          payment_id?: string | null
          property_id?: string
          rent_amount?: number
          signed_date?: string | null
          start_date?: string
          tenant_id?: string
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          terms?: Json | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_agreement_application"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "property_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agreement_payment"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "property_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_profiles: {
        Row: {
          address: Json | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact: Json | null
          employment: Json | null
          first_name: string | null
          id: string
          last_name: string | null
          national_id: string | null
          previous_address: Json | null
          refs: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: Json | null
          employment?: Json | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          national_id?: string | null
          previous_address?: Json | null
          refs?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: Json | null
          employment?: Json | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          national_id?: string | null
          previous_address?: Json | null
          refs?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          message: string
          ticket_id: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message: string
          ticket_id: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          ticket_id?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          available_date: string | null
          bathrooms: number
          bedrooms: number
          created_at: string | null
          current_tenant_id: string | null
          deposit: number
          features: Json | null
          id: string
          is_featured: boolean | null
          is_occupied: boolean | null
          is_public_listing: boolean | null
          listing_status: string | null
          property_id: string
          rent_amount: number
          square_feet: number | null
          unit_number: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          available_date?: string | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string | null
          current_tenant_id?: string | null
          deposit: number
          features?: Json | null
          id?: string
          is_featured?: boolean | null
          is_occupied?: boolean | null
          is_public_listing?: boolean | null
          listing_status?: string | null
          property_id: string
          rent_amount: number
          square_feet?: number | null
          unit_number: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          available_date?: string | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string | null
          current_tenant_id?: string | null
          deposit?: number
          features?: Json | null
          id?: string
          is_featured?: boolean | null
          is_occupied?: boolean | null
          is_public_listing?: boolean | null
          listing_status?: string | null
          property_id?: string
          rent_amount?: number
          square_feet?: number | null
          unit_number?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "units_current_tenant_id_fkey"
            columns: ["current_tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["property_id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: string | null
          avatar: string | null
          created_at: string | null
          email: string
          id: string
          is_verified: boolean | null
          last_login: string | null
          name: string
          phone: string | null
          profile_complete: boolean | null
          profile_completeness: number | null
          role: string
          updated_at: string | null
        }
        Insert: {
          account_status?: string | null
          avatar?: string | null
          created_at?: string | null
          email: string
          id: string
          is_verified?: boolean | null
          last_login?: string | null
          name: string
          phone?: string | null
          profile_complete?: boolean | null
          profile_completeness?: number | null
          role: string
          updated_at?: string | null
        }
        Update: {
          account_status?: string | null
          avatar?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_verified?: boolean | null
          last_login?: string | null
          name?: string
          phone?: string | null
          profile_complete?: boolean | null
          profile_completeness?: number | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      agreement_signing_status: {
        Row: {
          agreement_hash: string | null
          agreement_id: string | null
          agreement_status: string | null
          agreement_version: number | null
          landlord_id: string | null
          landlord_signature_timestamp: string | null
          landlord_signed: boolean | null
          property_id: string | null
          signed_date: string | null
          tenant_id: string | null
          tenant_signature_timestamp: string | null
          tenant_signed: boolean | null
          unit_id: string | null
        }
        Insert: {
          agreement_hash?: string | null
          agreement_id?: string | null
          agreement_status?: string | null
          agreement_version?: number | null
          landlord_id?: string | null
          landlord_signature_timestamp?: never
          landlord_signed?: never
          property_id?: string | null
          signed_date?: string | null
          tenant_id?: string | null
          tenant_signature_timestamp?: never
          tenant_signed?: never
          unit_id?: string | null
        }
        Update: {
          agreement_hash?: string | null
          agreement_id?: string | null
          agreement_status?: string | null
          agreement_version?: number | null
          landlord_id?: string | null
          landlord_signature_timestamp?: never
          landlord_signed?: never
          property_id?: string | null
          signed_date?: string | null
          tenant_id?: string | null
          tenant_signature_timestamp?: never
          tenant_signed?: never
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_agreements_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      public_property_listings: {
        Row: {
          address: string | null
          amenities: Json | null
          available_date: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          deposit: number | null
          description: string | null
          features: Json | null
          images: Json | null
          landlord_id: string | null
          latitude: number | null
          longitude: number | null
          property_featured: boolean | null
          property_id: string | null
          property_name: string | null
          property_type: string | null
          rent_amount: number | null
          square_feet: number | null
          state: string | null
          unit_featured: boolean | null
          unit_id: string | null
          unit_number: string | null
          view_count: number | null
          zip_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_apply_for_unit: { Args: { unit_id_param: string }; Returns: boolean }
      can_generate_agreement: {
        Args: { payment_id_param: string }
        Returns: boolean
      }
      can_make_payment: {
        Args: { application_id_param: string }
        Returns: boolean
      }
      can_raise_maintenance: {
        Args: { tenant_id_param: string; unit_id_param: string }
        Returns: boolean
      }
      generate_admin_code: {
        Args: { p_expires_in?: unknown; p_role?: string }
        Returns: {
          code: string
          created_at: string
          expires_at: string
          role: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_landlord: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      mark_admin_code_used: {
        Args: { code_to_use: string; user_id: string }
        Returns: undefined
      }
      refresh_user_auth_metadata: {
        Args: { target_user_id: string }
        Returns: Json
      }
      verify_admin_code: {
        Args: { code_to_verify: string }
        Returns: {
          role: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
