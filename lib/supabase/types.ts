export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ScalingMode = 'free' | 'notify' | 'auto';
export type UserRole = 'admin' | 'doctor' | 'front_desk';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          address: string | null
          phone: string | null
          timezone: string
          scaling_mode: ScalingMode
          subscription_tier: 'free' | 'paid'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          timezone?: string
          scaling_mode?: ScalingMode
          subscription_tier?: 'free' | 'paid'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          timezone?: string
          scaling_mode?: ScalingMode
          subscription_tier?: 'free' | 'paid'
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          clinic_id: string
          full_name: string
          role: UserRole
          phone: string | null
          avatar_url: string | null
          specialty: string | null
          license_no: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          clinic_id: string
          full_name: string
          role?: UserRole
          phone?: string | null
          avatar_url?: string | null
          specialty?: string | null
          license_no?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          full_name?: string
          role?: UserRole
          phone?: string | null
          avatar_url?: string | null
          specialty?: string | null
          license_no?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          id: string
          clinic_id: string
          full_name: string
          dob: string | null
          sex: 'male' | 'female' | 'other' | null
          phone: string | null
          email: string | null
          address: string | null
          blood_group: string | null
          allergies: string | null
          emergency_contact: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          full_name: string
          dob?: string | null
          sex?: 'male' | 'female' | 'other' | null
          phone?: string | null
          email?: string | null
          address?: string | null
          blood_group?: string | null
          allergies?: string | null
          emergency_contact?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          full_name?: string
          dob?: string | null
          sex?: 'male' | 'female' | 'other' | null
          phone?: string | null
          email?: string | null
          address?: string | null
          blood_group?: string | null
          allergies?: string | null
          emergency_contact?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          start_time: string
          end_time: string
          status: AppointmentStatus
          reason: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          start_time: string
          end_time: string
          status?: AppointmentStatus
          reason?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          doctor_id?: string
          start_time?: string
          end_time?: string
          status?: AppointmentStatus
          reason?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          appointment_id: string | null
          diagnosis: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          appointment_id?: string | null
          diagnosis?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          doctor_id?: string
          appointment_id?: string | null
          diagnosis?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          id: string
          prescription_id: string
          drug_name: string
          dosage: string | null
          frequency: string | null
          duration: string | null
          instructions: string | null
        }
        Insert: {
          id?: string
          prescription_id: string
          drug_name: string
          dosage?: string | null
          frequency?: string | null
          duration?: string | null
          instructions?: string | null
        }
        Update: {
          id?: string
          prescription_id?: string
          drug_name?: string
          dosage?: string | null
          frequency?: string | null
          duration?: string | null
          instructions?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          appointment_id: string | null
          invoice_number: string
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
          subtotal: number
          tax: number
          total: number
          currency: string
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          appointment_id?: string | null
          invoice_number: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
          subtotal?: number
          tax?: number
          total?: number
          currency?: string
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          appointment_id?: string | null
          invoice_number?: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
          subtotal?: number
          tax?: number
          total?: number
          currency?: string
          due_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          amount?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          amount?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          amount: number
          status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded'
          method: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount: number
          status?: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded'
          method?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount?: number
          status?: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded'
          method?: string | null
          paid_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          clinic_id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          clinic_id: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          clinic_id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          id: string
          clinic_id: string
          metric_name: string
          value: number
          recorded_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          metric_name: string
          value: number
          recorded_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          metric_name?: string
          value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          profile_id: string
          title: string
          body: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          body?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          body?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          recorded_by: string | null
          blood_pressure_systolic: number | null
          blood_pressure_diastolic: number | null
          heart_rate: number | null
          weight_kg: number | null
          temperature_c: number | null
          spo2: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          recorded_by?: string | null
          blood_pressure_systolic?: number | null
          blood_pressure_diastolic?: number | null
          heart_rate?: number | null
          weight_kg?: number | null
          temperature_c?: number | null
          spo2?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          patient_id?: string
          recorded_by?: string | null
          blood_pressure_systolic?: number | null
          blood_pressure_diastolic?: number | null
          heart_rate?: number | null
          weight_kg?: number | null
          temperature_c?: number | null
          spo2?: number | null
          recorded_at?: string
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          day_of_week: number
          start_time?: string
          end_time?: string
          is_available?: boolean
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
