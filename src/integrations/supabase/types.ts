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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          cover_letter: string | null
          id: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          cover_letter?: string | null
          id?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          cover_letter?: string | null
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
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
      candidates: {
        Row: {
          address: string | null
          created_at: string
          current_status: string
          education: string | null
          experience_summary: string | null
          id: string
          phone: string | null
          resume_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          current_status?: string
          education?: string | null
          experience_summary?: string | null
          id?: string
          phone?: string | null
          resume_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          current_status?: string
          education?: string | null
          experience_summary?: string | null
          id?: string
          phone?: string | null
          resume_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_address: string
          company_email: string | null
          company_name: string
          company_phone: string
          created_at: string
          id: string
          invoice_footer: string | null
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          company_address?: string
          company_email?: string | null
          company_name?: string
          company_phone?: string
          created_at?: string
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          company_address?: string
          company_email?: string | null
          company_name?: string
          company_phone?: string
          created_at?: string
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          updated_at?: string
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
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          contract_url?: string | null
          created_at?: string
          id?: string
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          contract_url?: string | null
          created_at?: string
          id?: string
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
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
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          id: string
          is_auto_generated: boolean | null
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          id?: string
          is_auto_generated?: boolean | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          is_auto_generated?: boolean | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          designation: string
          email: string | null
          employee_id: string
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          designation: string
          email?: string | null
          employee_id: string
          full_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          designation?: string
          email?: string | null
          employee_id?: string
          full_name?: string
          id?: string
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          invoice_id: string
          is_taxable: boolean | null
          item_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          invoice_id: string
          is_taxable?: boolean | null
          item_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          invoice_id?: string
          is_taxable?: boolean | null
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
          created_at: string | null
          created_by: string | null
          date_issued: string
          down_payment: number
          egf: number
          employee_id: string
          gross_payment: number
          id: string
          invoice_number: string
          month: number
          net_payment: number
          outstanding_iou: number
          slip_number: string
          taxable_income: number | null
          total_deductions: number
          total_monthly_income: number
          total_savings: number
          updated_at: string | null
          year: number
          ytd_tax_paid: number | null
          ytd_taxable_income: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_issued: string
          down_payment?: number
          egf?: number
          employee_id: string
          gross_payment?: number
          id?: string
          invoice_number: string
          month: number
          net_payment?: number
          outstanding_iou?: number
          slip_number: string
          taxable_income?: number | null
          total_deductions?: number
          total_monthly_income?: number
          total_savings?: number
          updated_at?: string | null
          year: number
          ytd_tax_paid?: number | null
          ytd_taxable_income?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_issued?: string
          down_payment?: number
          egf?: number
          employee_id?: string
          gross_payment?: number
          id?: string
          invoice_number?: string
          month?: number
          net_payment?: number
          outstanding_iou?: number
          slip_number?: string
          taxable_income?: number | null
          total_deductions?: number
          total_monthly_income?: number
          total_savings?: number
          updated_at?: string | null
          year?: number
          ytd_tax_paid?: number | null
          ytd_taxable_income?: number | null
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
          compensation: string
          created_at: string
          created_by: string | null
          department: string
          description: string
          id: string
          job_type: string
          key_responsibilities: string
          media_url: string | null
          requirements: string
          status: string
          title: string
          updated_at: string
          work_location_country: string
          work_location_state: string
        }
        Insert: {
          compensation?: string
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          id?: string
          job_type?: string
          key_responsibilities?: string
          media_url?: string | null
          requirements?: string
          status?: string
          title: string
          updated_at?: string
          work_location_country?: string
          work_location_state?: string
        }
        Update: {
          compensation?: string
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          id?: string
          job_type?: string
          key_responsibilities?: string
          media_url?: string | null
          requirements?: string
          status?: string
          title?: string
          updated_at?: string
          work_location_country?: string
          work_location_state?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          passcode: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          passcode: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          passcode?: string
        }
        Relationships: []
      }
      rate_change_history: {
        Row: {
          change_summary: string | null
          changed_at: string
          id: string
          new_config: Json | null
          previous_config: Json | null
          rate_config_id: string
        }
        Insert: {
          change_summary?: string | null
          changed_at?: string
          id?: string
          new_config?: Json | null
          previous_config?: Json | null
          rate_config_id: string
        }
        Update: {
          change_summary?: string | null
          changed_at?: string
          id?: string
          new_config?: Json | null
          previous_config?: Json | null
          rate_config_id?: string
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
          booklet_rate: number
          created_at: string
          data_entry_clerks_rate: number
          data_entry_misc_rate: number
          data_entry_rate: number
          effective_from: string
          employee_gratuity: number
          employee_gratuity_rate: number
          field_agent_rate: number
          field_manager_rate: number
          field_misc_rate: number
          field_relation_officers_salary: number
          field_relation_rate: number
          field_relation_supervisor_salary: number
          field_work_rate: number
          fixed_monthly_salaries: number
          id: string
          incentives: number
          incentives_rate: number
          logistics: number
          logistics_rate: number
          metadata_audit_rate: number
          office_data_subscription_monthly: number
          operations_utilities: number
          pm_bac_audit_rate: number
          pm_data_entry_rate: number
          pm_field_work_rate: number
          power_plant_monthly: number
          production_manager_salary: number
          qa_manager_rate: number
          staff_data_support_monthly: number
          updated_at: string
          virtual_audit_rate: number
        }
        Insert: {
          administrative_assistant_salary?: number
          bac_audit_rate?: number
          booking_agent_rate?: number
          booklet_monthly_income?: number
          booklet_rate?: number
          created_at?: string
          data_entry_clerks_rate?: number
          data_entry_misc_rate?: number
          data_entry_rate?: number
          effective_from?: string
          employee_gratuity?: number
          employee_gratuity_rate?: number
          field_agent_rate?: number
          field_manager_rate?: number
          field_misc_rate?: number
          field_relation_officers_salary?: number
          field_relation_rate?: number
          field_relation_supervisor_salary?: number
          field_work_rate?: number
          fixed_monthly_salaries?: number
          id?: string
          incentives?: number
          incentives_rate?: number
          logistics?: number
          logistics_rate?: number
          metadata_audit_rate?: number
          office_data_subscription_monthly?: number
          operations_utilities?: number
          pm_bac_audit_rate?: number
          pm_data_entry_rate?: number
          pm_field_work_rate?: number
          power_plant_monthly?: number
          production_manager_salary?: number
          qa_manager_rate?: number
          staff_data_support_monthly?: number
          updated_at?: string
          virtual_audit_rate?: number
        }
        Update: {
          administrative_assistant_salary?: number
          bac_audit_rate?: number
          booking_agent_rate?: number
          booklet_monthly_income?: number
          booklet_rate?: number
          created_at?: string
          data_entry_clerks_rate?: number
          data_entry_misc_rate?: number
          data_entry_rate?: number
          effective_from?: string
          employee_gratuity?: number
          employee_gratuity_rate?: number
          field_agent_rate?: number
          field_manager_rate?: number
          field_misc_rate?: number
          field_relation_officers_salary?: number
          field_relation_rate?: number
          field_relation_supervisor_salary?: number
          field_work_rate?: number
          fixed_monthly_salaries?: number
          id?: string
          incentives?: number
          incentives_rate?: number
          logistics?: number
          logistics_rate?: number
          metadata_audit_rate?: number
          office_data_subscription_monthly?: number
          operations_utilities?: number
          pm_bac_audit_rate?: number
          pm_data_entry_rate?: number
          pm_field_work_rate?: number
          power_plant_monthly?: number
          production_manager_salary?: number
          qa_manager_rate?: number
          staff_data_support_monthly?: number
          updated_at?: string
          virtual_audit_rate?: number
        }
        Relationships: []
      }
      screening_responses: {
        Row: {
          application_id: string
          id: string
          responses: Json | null
          score: number | null
          submitted_at: string
        }
        Insert: {
          application_id: string
          id?: string
          responses?: Json | null
          score?: number | null
          submitted_at?: string
        }
        Update: {
          application_id?: string
          id?: string
          responses?: Json | null
          score?: number | null
          submitted_at?: string
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
      user_capabilities: {
        Row: {
          capability: string
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          capability: string
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          capability?: string
          created_at?: string
          granted_by?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
      has_capability: {
        Args: { _capability: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "guest" | "employee" | "candidate"
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
      app_role: ["admin", "guest", "employee", "candidate"],
    },
  },
} as const
