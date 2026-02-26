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
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          cover_letter: string | null
          id: string
          job_id: string
          status: string
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          cover_letter?: string | null
          id?: string
          job_id: string
          status?: string
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          cover_letter?: string | null
          id?: string
          job_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          body: string | null
          category_id: string | null
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          category_id?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          category_id?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          created_at: string
          education: string | null
          experience_summary: string | null
          id: string
          phone: string | null
          resume_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          education?: string | null
          experience_summary?: string | null
          id?: string
          phone?: string | null
          resume_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          education?: string | null
          experience_summary?: string | null
          id?: string
          phone?: string | null
          resume_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_address: string
          company_email: string
          company_name: string
          company_phone: string
          created_at: string
          id: string
          invoice_footer: string | null
          logo_url: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_website: string | null
          social_youtube: string | null
          updated_at: string
        }
        Insert: {
          company_address?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          created_at?: string
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_website?: string | null
          social_youtube?: string | null
          updated_at?: string
        }
        Update: {
          company_address?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          created_at?: string
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_website?: string | null
          social_youtube?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          application_id: string
          contract_url: string | null
          created_at: string
          id: string
          signature_data: string | null
          signature_url: string | null
          signed_at: string | null
        }
        Insert: {
          application_id: string
          contract_url?: string | null
          created_at?: string
          id?: string
          signature_data?: string | null
          signature_url?: string | null
          signed_at?: string | null
        }
        Update: {
          application_id?: string
          contract_url?: string | null
          created_at?: string
          id?: string
          signature_data?: string | null
          signature_url?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          is_auto_generated: boolean
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          designation: string
          email: string | null
          employee_id: string
          full_name: string
          id: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          designation?: string
          email?: string | null
          employee_id?: string
          full_name?: string
          id?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          designation?: string
          email?: string | null
          employee_id?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          event_date: string | null
          gallery: Json | null
          id: string
          image_url: string | null
          is_published: boolean | null
          registration_url: string | null
          short_description: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          event_date?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          registration_url?: string | null
          short_description?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          event_date?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          registration_url?: string | null
          short_description?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          media_type: string | null
          media_url: string
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          media_type?: string | null
          media_url: string
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string
          title?: string | null
        }
        Relationships: []
      }
      innovations: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_published: boolean | null
          short_description: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          short_description?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          short_description?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          feedback: string | null
          id: string
          interview_date: string | null
          interviewer: string | null
          meeting_link: string | null
          outcome: string | null
          score: number | null
        }
        Insert: {
          application_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          interview_date?: string | null
          interviewer?: string | null
          meeting_link?: string | null
          outcome?: string | null
          score?: number | null
        }
        Update: {
          application_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          interview_date?: string | null
          interviewer?: string | null
          meeting_link?: string | null
          outcome?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          is_taxable: boolean
          item_type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          is_taxable?: boolean
          item_type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          is_taxable?: boolean
          item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          date_issued: string
          down_payment: number
          egf: number
          employee_id: string | null
          gross_payment: number
          id: string
          invoice_number: string
          month: number
          net_payment: number
          nhf: number
          outstanding_iou: number
          paye_tax: number
          pension: number
          slip_number: string
          taxable_income: number
          total_deductions: number
          total_monthly_income: number
          total_savings: number
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_issued?: string
          down_payment?: number
          egf?: number
          employee_id?: string | null
          gross_payment?: number
          id?: string
          invoice_number?: string
          month: number
          net_payment?: number
          nhf?: number
          outstanding_iou?: number
          paye_tax?: number
          pension?: number
          slip_number?: string
          taxable_income?: number
          total_deductions?: number
          total_monthly_income?: number
          total_savings?: number
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_issued?: string
          down_payment?: number
          egf?: number
          employee_id?: string | null
          gross_payment?: number
          id?: string
          invoice_number?: string
          month?: number
          net_payment?: number
          nhf?: number
          outstanding_iou?: number
          paye_tax?: number
          pension?: number
          slip_number?: string
          taxable_income?: number
          total_deductions?: number
          total_monthly_income?: number
          total_savings?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          compensation: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          job_type: string | null
          key_responsibilities: string | null
          media_url: string | null
          requirements: string | null
          status: string
          title: string
          work_location_country: string | null
          work_location_state: string | null
        }
        Insert: {
          compensation?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          job_type?: string | null
          key_responsibilities?: string | null
          media_url?: string | null
          requirements?: string | null
          status?: string
          title: string
          work_location_country?: string | null
          work_location_state?: string | null
        }
        Update: {
          compensation?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          job_type?: string | null
          key_responsibilities?: string | null
          media_url?: string | null
          requirements?: string | null
          status?: string
          title?: string
          work_location_country?: string | null
          work_location_state?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          parent_message_id: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          recipient_id: string
          sender_id: string
          subject?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          logo_url: string | null
          name: string
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          name: string
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          passcode: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          passcode?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          passcode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_change_history: {
        Row: {
          change_summary: string | null
          changed_at: string
          changed_by: string | null
          changes: Json | null
          id: string
          new_config: Json | null
          previous_config: Json | null
          rate_config_id: string | null
        }
        Insert: {
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          changes?: Json | null
          id?: string
          new_config?: Json | null
          previous_config?: Json | null
          rate_config_id?: string | null
        }
        Update: {
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          changes?: Json | null
          id?: string
          new_config?: Json | null
          previous_config?: Json | null
          rate_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_change_history_rate_config_id_fkey"
            columns: ["rate_config_id"]
            isOneToOne: false
            referencedRelation: "rate_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_configurations: {
        Row: {
          administrative_assistant_salary: number
          bac_audit_rate: number
          booking_agent_rate: number
          booklet_monthly_income: number
          created_at: string
          data_entry_clerks_rate: number
          data_entry_misc_rate: number
          data_entry_rate: number
          effective_from: string
          employee_gratuity_rate: number
          field_agent_rate: number
          field_manager_rate: number
          field_misc_rate: number
          field_relation_officers_salary: number
          field_relation_rate: number
          field_relation_supervisor_salary: number
          field_work_rate: number
          id: string
          incentives_rate: number
          logistics_rate: number
          metadata_audit_rate: number
          office_data_subscription_monthly: number
          pm_bac_audit_rate: number
          pm_data_entry_rate: number
          pm_field_work_rate: number
          power_plant_monthly: number
          qa_manager_rate: number
          staff_data_support_monthly: number
          virtual_audit_rate: number
        }
        Insert: {
          administrative_assistant_salary?: number
          bac_audit_rate?: number
          booking_agent_rate?: number
          booklet_monthly_income?: number
          created_at?: string
          data_entry_clerks_rate?: number
          data_entry_misc_rate?: number
          data_entry_rate?: number
          effective_from?: string
          employee_gratuity_rate?: number
          field_agent_rate?: number
          field_manager_rate?: number
          field_misc_rate?: number
          field_relation_officers_salary?: number
          field_relation_rate?: number
          field_relation_supervisor_salary?: number
          field_work_rate?: number
          id?: string
          incentives_rate?: number
          logistics_rate?: number
          metadata_audit_rate?: number
          office_data_subscription_monthly?: number
          pm_bac_audit_rate?: number
          pm_data_entry_rate?: number
          pm_field_work_rate?: number
          power_plant_monthly?: number
          qa_manager_rate?: number
          staff_data_support_monthly?: number
          virtual_audit_rate?: number
        }
        Update: {
          administrative_assistant_salary?: number
          bac_audit_rate?: number
          booking_agent_rate?: number
          booklet_monthly_income?: number
          created_at?: string
          data_entry_clerks_rate?: number
          data_entry_misc_rate?: number
          data_entry_rate?: number
          effective_from?: string
          employee_gratuity_rate?: number
          field_agent_rate?: number
          field_manager_rate?: number
          field_misc_rate?: number
          field_relation_officers_salary?: number
          field_relation_rate?: number
          field_relation_supervisor_salary?: number
          field_work_rate?: number
          id?: string
          incentives_rate?: number
          logistics_rate?: number
          metadata_audit_rate?: number
          office_data_subscription_monthly?: number
          pm_bac_audit_rate?: number
          pm_data_entry_rate?: number
          pm_field_work_rate?: number
          power_plant_monthly?: number
          qa_manager_rate?: number
          staff_data_support_monthly?: number
          virtual_audit_rate?: number
        }
        Relationships: []
      }
      screening_responses: {
        Row: {
          application_id: string
          created_at: string
          id: string
          responses: Json | null
          score: number | null
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          responses?: Json | null
          score?: number | null
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          responses?: Json | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_responses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          cta_type: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          short_description: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cta_type?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          short_description?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cta_type?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          short_description?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_image: string | null
          author_name: string
          author_title: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          quote: string
        }
        Insert: {
          author_image?: string | null
          author_name: string
          author_title?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          quote: string
        }
        Update: {
          author_image?: string | null
          author_name?: string
          author_title?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          quote?: string
        }
        Relationships: []
      }
      user_capabilities: {
        Row: {
          capability: string
          id: string
          user_id: string
        }
        Insert: {
          capability: string
          id?: string
          user_id: string
        }
        Update: {
          capability?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_sections: {
        Row: {
          body: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          section_key: string
          subtitle: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          section_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          section_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      weekly_records: {
        Row: {
          bac_audit: number
          booklet_income: number
          created_at: string
          created_by: string | null
          data_entry: number
          field_work: number
          id: string
          metadata_audit: number
          net_cashflow: number
          other_expenses: Json | null
          rate_config_id: string | null
          total_expenses: number
          total_income: number
          virtual_audit: number
          week_number: number
          year: number
        }
        Insert: {
          bac_audit?: number
          booklet_income?: number
          created_at?: string
          created_by?: string | null
          data_entry?: number
          field_work?: number
          id?: string
          metadata_audit?: number
          net_cashflow?: number
          other_expenses?: Json | null
          rate_config_id?: string | null
          total_expenses?: number
          total_income?: number
          virtual_audit?: number
          week_number: number
          year: number
        }
        Update: {
          bac_audit?: number
          booklet_income?: number
          created_at?: string
          created_by?: string | null
          data_entry?: number
          field_work?: number
          id?: string
          metadata_audit?: number
          net_cashflow?: number
          other_expenses?: Json | null
          rate_config_id?: string | null
          total_expenses?: number
          total_income?: number
          virtual_audit?: number
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_records_rate_config_id_fkey"
            columns: ["rate_config_id"]
            isOneToOne: false
            referencedRelation: "rate_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "guest" | "candidate"
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
    Enums: {
      app_role: ["admin", "employee", "guest", "candidate"],
    },
  },
} as const
