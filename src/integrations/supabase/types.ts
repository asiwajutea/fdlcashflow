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
      activity_form_assignments: {
        Row: {
          assignment_type: string
          capability_key: string | null
          created_at: string
          form_id: string
          id: string
          target_id: string | null
        }
        Insert: {
          assignment_type: string
          capability_key?: string | null
          created_at?: string
          form_id: string
          id?: string
          target_id?: string | null
        }
        Update: {
          assignment_type?: string
          capability_key?: string | null
          created_at?: string
          form_id?: string
          id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_form_assignments_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "activity_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_form_fields: {
        Row: {
          created_at: string
          display_order: number
          field_key: string
          field_type: string
          form_id: string
          help_text: string | null
          id: string
          is_required: boolean
          label: string
          lookup_source: string | null
          options: Json | null
          placeholder: string | null
          validation: Json | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_key: string
          field_type: string
          form_id: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label: string
          lookup_source?: string | null
          options?: Json | null
          placeholder?: string | null
          validation?: Json | null
        }
        Update: {
          created_at?: string
          display_order?: number
          field_key?: string
          field_type?: string
          form_id?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label?: string
          lookup_source?: string | null
          options?: Json | null
          placeholder?: string | null
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "activity_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_form_leader_overrides: {
        Row: {
          can_view: boolean
          created_at: string
          form_id: string
          id: string
          user_id: string
        }
        Insert: {
          can_view?: boolean
          created_at?: string
          form_id: string
          id?: string
          user_id: string
        }
        Update: {
          can_view?: boolean
          created_at?: string
          form_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_form_submissions: {
        Row: {
          answers: Json
          form_id: string
          id: string
          period_key: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          form_id: string
          id?: string
          period_key: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          form_id?: string
          id?: string
          period_key?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "activity_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_forms: {
        Row: {
          analytics_employee_visible: boolean
          analytics_visible_fields: Json
          analytics_visible_to_submitter: boolean
          created_at: string
          created_by: string
          description: string | null
          due_day: number | null
          due_time: string | null
          first_step_name: string | null
          frequency: string
          id: string
          is_active: boolean
          manager_visible: boolean
          reminders_enabled: boolean
          title: string
          updated_at: string
        }
        Insert: {
          analytics_employee_visible?: boolean
          analytics_visible_fields?: Json
          analytics_visible_to_submitter?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          due_day?: number | null
          due_time?: string | null
          first_step_name?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          manager_visible?: boolean
          reminders_enabled?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          analytics_employee_visible?: boolean
          analytics_visible_fields?: Json
          analytics_visible_to_submitter?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          due_day?: number | null
          due_time?: string | null
          first_step_name?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          manager_visible?: boolean
          reminders_enabled?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      advance_repayments: {
        Row: {
          advance_id: string
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
        }
        Insert: {
          advance_id: string
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
        }
        Update: {
          advance_id?: string
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_repayments_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "advance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_request_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          note: string
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          note?: string
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          note?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "advance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_requests: {
        Row: {
          amount: number
          approver_id: string | null
          approver_note: string | null
          category_id: string | null
          created_at: string
          decided_at: string | null
          id: string
          kind: string
          reason: string
          receipt_url: string | null
          repaid_count: number
          repayment_plan: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approver_id?: string | null
          approver_note?: string | null
          category_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          kind: string
          reason?: string
          receipt_url?: string | null
          repaid_count?: number
          repayment_plan?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approver_id?: string | null
          approver_note?: string | null
          category_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          kind?: string
          reason?: string
          receipt_url?: string | null
          repaid_count?: number
          repayment_plan?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
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
      blog_comments: {
        Row: {
          author_email: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          is_approved: boolean
          post_id: string
          user_id: string | null
        }
        Insert: {
          author_email?: string | null
          author_name?: string
          body: string
          created_at?: string
          id?: string
          is_approved?: boolean
          post_id: string
          user_id?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string | null
          category_id: string | null
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_auto_generated: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          sources: Json | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body?: string | null
          category_id?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_auto_generated?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          sources?: Json | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string | null
          category_id?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_auto_generated?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          sources?: Json | null
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
      custom_roles: {
        Row: {
          capabilities: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      departments: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          head_user_id: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          head_user_id?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          head_user_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
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
          profile_id: string | null
          user_id: string | null
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
          profile_id?: string | null
          user_id?: string | null
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
          profile_id?: string | null
          user_id?: string | null
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
      finance_budgets: {
        Row: {
          category_id: string | null
          category_ids: string[]
          created_at: string
          id: string
          kind: string
          kinds: string[]
          monthly_limit: number
          scope_id: string
          scope_type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          category_ids?: string[]
          created_at?: string
          id?: string
          kind: string
          kinds?: string[]
          monthly_limit?: number
          scope_id: string
          scope_type: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          category_ids?: string[]
          created_at?: string
          id?: string
          kind?: string
          kinds?: string[]
          monthly_limit?: number
          scope_id?: string
          scope_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kind: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
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
      hero_slides: {
        Row: {
          accent: string
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_published: boolean | null
          subtitle: string
          title: string
          updated_at: string | null
        }
        Insert: {
          accent?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_published?: boolean | null
          subtitle?: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          accent?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_published?: boolean | null
          subtitle?: string
          title?: string
          updated_at?: string | null
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
          ytd_tax_paid: number
          ytd_taxable_income: number
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
          ytd_tax_paid?: number
          ytd_taxable_income?: number
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
          ytd_tax_paid?: number
          ytd_taxable_income?: number
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
      kb_articles: {
        Row: {
          attachments: Json
          body: string
          category_id: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_pinned: boolean
          published_at: string | null
          slug: string
          status: string
          summary: string
          tags: Json
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          attachments?: Json
          body?: string
          category_id?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          slug: string
          status?: string
          summary?: string
          tags?: Json
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          attachments?: Json
          body?: string
          category_id?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string
          tags?: Json
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
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
      positions: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_details: Json
          about_me: string | null
          about_me_excerpt: string | null
          about_visibility: Json
          account_name: string | null
          account_number: string | null
          approval_status: string
          avatar_url: string | null
          bank_name: string | null
          birthday: string | null
          created_at: string
          cv_url: string | null
          department_id: string | null
          employee_id: string | null
          employment_start_date: string | null
          full_name: string | null
          gender: string | null
          id: string
          id_card_url: string | null
          manager_id: string | null
          manager_intro_acknowledged: boolean
          passcode: string | null
          passcode_acknowledged: boolean
          phone: string | null
          position_id: string | null
          project_id: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          about_details?: Json
          about_me?: string | null
          about_me_excerpt?: string | null
          about_visibility?: Json
          account_name?: string | null
          account_number?: string | null
          approval_status?: string
          avatar_url?: string | null
          bank_name?: string | null
          birthday?: string | null
          created_at?: string
          cv_url?: string | null
          department_id?: string | null
          employee_id?: string | null
          employment_start_date?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          id_card_url?: string | null
          manager_id?: string | null
          manager_intro_acknowledged?: boolean
          passcode?: string | null
          passcode_acknowledged?: boolean
          phone?: string | null
          position_id?: string | null
          project_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          about_details?: Json
          about_me?: string | null
          about_me_excerpt?: string | null
          about_visibility?: Json
          account_name?: string | null
          account_number?: string | null
          approval_status?: string
          avatar_url?: string | null
          bank_name?: string | null
          birthday?: string | null
          created_at?: string
          cv_url?: string | null
          department_id?: string | null
          employee_id?: string | null
          employment_start_date?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_card_url?: string | null
          manager_id?: string | null
          manager_intro_acknowledged?: boolean
          passcode?: string | null
          passcode_acknowledged?: boolean
          phone?: string | null
          position_id?: string | null
          project_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_position_fk"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          lead_user_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          lead_user_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          lead_user_id?: string | null
          name?: string
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
      rate_items: {
        Row: {
          bucket: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          bucket: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Update: {
          bucket?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
          updated_at?: string
          value?: number
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
      sms_logs: {
        Row: {
          balance: number | null
          body: string
          created_at: string
          error: string | null
          id: string
          last_retry_at: string | null
          original_template_key: string | null
          original_to: string | null
          original_vars: Json | null
          provider_msg_id: string | null
          recipient_phone: string
          retry_count: number
          status: string
          template_key: string | null
          units: number | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          body: string
          created_at?: string
          error?: string | null
          id?: string
          last_retry_at?: string | null
          original_template_key?: string | null
          original_to?: string | null
          original_vars?: Json | null
          provider_msg_id?: string | null
          recipient_phone: string
          retry_count?: number
          status: string
          template_key?: string | null
          units?: number | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          body?: string
          created_at?: string
          error?: string | null
          id?: string
          last_retry_at?: string | null
          original_template_key?: string | null
          original_to?: string | null
          original_vars?: Json | null
          provider_msg_id?: string | null
          recipient_phone?: string
          retry_count?: number
          status?: string
          template_key?: string | null
          units?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string | null
          display_order: number | null
          full_name: string
          id: string
          image_url: string | null
          is_published: boolean | null
          role: string
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_order?: number | null
          full_name: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_order?: number | null
          full_name?: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          lead_user_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          lead_user_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          lead_user_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
      user_presence: {
        Row: {
          last_seen_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
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
      generate_employee_id: { Args: never; Returns: string }
      get_my_subordinates: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      get_org_chart: {
        Args: never
        Returns: {
          avatar_url: string
          department_name: string
          full_name: string
          id: string
          manager_id: string
          position_name: string
          role: string
        }[]
      }
      get_subordinate_user_ids: {
        Args: { _user_id: string }
        Returns: {
          user_id: string
        }[]
      }
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
      user_can_access_form: {
        Args: { _form_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_form_submissions: {
        Args: { _form_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_capability: {
        Args: { _cap: string; _user_id: string }
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
