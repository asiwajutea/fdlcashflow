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
      weekly_records: {
        Row: {
          bac_audit: number
          booklet_income: number
          created_at: string
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
