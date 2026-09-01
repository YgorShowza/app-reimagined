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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          attempt_id: string
          created_at: string
          employee_name: string
          exam_id: string
          exam_title: string
          id: string
          issued_at: string
          matricula: string | null
          revoked: boolean
          revoked_at: string | null
          revoked_reason: string | null
          score: number
          user_id: string
          verification_code: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          employee_name: string
          exam_id: string
          exam_title: string
          id?: string
          issued_at?: string
          matricula?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          score: number
          user_id: string
          verification_code: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          employee_name?: string
          exam_id?: string
          exam_title?: string
          id?: string
          issued_at?: string
          matricula?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          score?: number
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_entries: {
        Row: {
          completion_date: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          employee_matricula: string
          employee_name: string
          employee_sector: string
          exam_id: string | null
          exam_title: string | null
          id: string
          justification: string | null
          month: string
          notes: string | null
          planned_date: string | null
          question_bank_ids: string[]
          status: string
          theme: string
          type: string
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          employee_matricula: string
          employee_name: string
          employee_sector: string
          exam_id?: string | null
          exam_title?: string | null
          id?: string
          justification?: string | null
          month: string
          notes?: string | null
          planned_date?: string | null
          question_bank_ids?: string[]
          status?: string
          theme: string
          type?: string
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employee_matricula?: string
          employee_name?: string
          employee_sector?: string
          exam_id?: string | null
          exam_title?: string | null
          id?: string
          justification?: string | null
          month?: string
          notes?: string | null
          planned_date?: string | null
          question_bank_ids?: string[]
          status?: string
          theme?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_entries_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_recurring_models: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          recurrence: string
          target_sector: string
          theme: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          recurrence?: string
          target_sector?: string
          theme: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          recurrence?: string
          target_sector?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      cronograma_suspensions: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          date_end: string | null
          date_start: string | null
          employee_id: string | null
          employee_matricula: string | null
          employee_name: string | null
          id: string
          month: string
          notes: string | null
          reason: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          date_end?: string | null
          date_start?: string | null
          employee_id?: string | null
          employee_matricula?: string | null
          employee_name?: string | null
          id?: string
          month: string
          notes?: string | null
          reason: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          date_end?: string | null
          date_start?: string | null
          employee_id?: string | null
          employee_matricula?: string | null
          employee_name?: string | null
          id?: string
          month?: string
          notes?: string | null
          reason?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_suspensions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          access_profile: string
          created_at: string
          first_access: boolean
          full_name: string
          id: string
          level: number
          matricula: string
          points: number
          sector: string
          status: string
          updated_at: string
        }
        Insert: {
          access_profile?: string
          created_at?: string
          first_access?: boolean
          full_name: string
          id?: string
          level?: number
          matricula: string
          points?: number
          sector?: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_profile?: string
          created_at?: string
          first_access?: boolean
          full_name?: string
          id?: string
          level?: number
          matricula?: string
          points?: number
          sector?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answers: Json
          certificate_code: string | null
          created_at: string
          exam_id: string
          finished_at: string
          id: string
          matricula: string | null
          passed: boolean
          score: number
          signature_agreed: boolean
          signature_name: string | null
          signature_path: string | null
          signed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          certificate_code?: string | null
          created_at?: string
          exam_id: string
          finished_at?: string
          id?: string
          matricula?: string | null
          passed?: boolean
          score?: number
          signature_agreed?: boolean
          signature_name?: string | null
          signature_path?: string | null
          signed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          certificate_code?: string | null
          created_at?: string
          exam_id?: string
          finished_at?: string
          id?: string
          matricula?: string | null
          passed?: boolean
          score?: number
          signature_agreed?: boolean
          signature_name?: string | null
          signature_path?: string | null
          signed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          exam_type: string
          id: string
          min_approval_pct: number
          questions: Json
          scheduled_date: string | null
          status: string
          target_sector: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_type?: string
          id?: string
          min_approval_pct?: number
          questions?: Json
          scheduled_date?: string | null
          status?: string
          target_sector?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_type?: string
          id?: string
          min_approval_pct?: number
          questions?: Json
          scheduled_date?: string | null
          status?: string
          target_sector?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          target_sector: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_sector?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_sector?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      occurrences: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string
          employee_id: string | null
          employee_matricula: string | null
          employee_name: string | null
          id: string
          location: string | null
          occurred_at: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description: string
          employee_id?: string | null
          employee_matricula?: string | null
          employee_name?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string
          employee_id?: string | null
          employee_matricula?: string | null
          employee_name?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      practical_eval_templates: {
        Row: {
          applications_per_month: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          min_approval_score: number
          platform: string | null
          recurrence: string
          status: string
          target_sector: string
          tasks: Json
          title: string
          updated_at: string
        }
        Insert: {
          applications_per_month?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          min_approval_score?: number
          platform?: string | null
          recurrence?: string
          status?: string
          target_sector?: string
          tasks?: Json
          title: string
          updated_at?: string
        }
        Update: {
          applications_per_month?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          min_approval_score?: number
          platform?: string | null
          recurrence?: string
          status?: string
          target_sector?: string
          tasks?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      practical_evaluations: {
        Row: {
          checklist: Json
          completed_at: string | null
          created_at: string
          employee_id: string
          employee_matricula: string
          employee_name: string
          employee_sector: string
          evaluation_date: string | null
          evaluator_id: string | null
          evaluator_name: string | null
          id: string
          max_score: number
          notes: string | null
          score: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          employee_id: string
          employee_matricula: string
          employee_name: string
          employee_sector: string
          evaluation_date?: string | null
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          max_score?: number
          notes?: string | null
          score?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          employee_matricula?: string
          employee_name?: string
          employee_sector?: string
          evaluation_date?: string | null
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          max_score?: number
          notes?: string | null
          score?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practical_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          matricula: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          matricula: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          matricula?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          active: boolean
          bank_type: string
          correct_answer: string | null
          correct_index: number | null
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          options: Json
          question_text: string
          target_sector: string
          theme: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bank_type: string
          correct_answer?: string | null
          correct_index?: number | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_text: string
          target_sector?: string
          theme?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bank_type?: string
          correct_answer?: string | null
          correct_index?: number | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_text?: string
          target_sector?: string
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registration_activation_codes: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          employee_id: string
          expires_at: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          expires_at: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          expires_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_activation_codes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_activity_attempts: {
        Row: {
          activity_day: string | null
          activity_title: string
          activity_type: string
          answers: Json
          created_at: string
          employee_id: string | null
          employee_matricula: string | null
          employee_name: string
          employee_sector: string | null
          id: string
          max_score: number
          passed: boolean
          points_earned: number
          score: number
          user_id: string
        }
        Insert: {
          activity_day?: string | null
          activity_title: string
          activity_type: string
          answers?: Json
          created_at?: string
          employee_id?: string | null
          employee_matricula?: string | null
          employee_name: string
          employee_sector?: string | null
          id?: string
          max_score?: number
          passed?: boolean
          points_earned?: number
          score?: number
          user_id: string
        }
        Update: {
          activity_day?: string | null
          activity_title?: string
          activity_type?: string
          answers?: Json
          created_at?: string
          employee_id?: string | null
          employee_matricula?: string | null
          employee_name?: string
          employee_sector?: string | null
          id?: string
          max_score?: number
          passed?: boolean
          points_earned?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_activity_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          id: string
          min_score: number
          status: string
          target_sector: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          id?: string
          min_score?: number
          status?: string
          target_sector?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          id?: string
          min_score?: number
          status?: string
          target_sector?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_days: number
          employee_id: string
          employee_matricula: string | null
          employee_name: string
          id: string
          last_training_date: string | null
          observations: string | null
          status: string
          updated_at: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_days?: number
          employee_id: string
          employee_matricula?: string | null
          employee_name: string
          id?: string
          last_training_date?: string | null
          observations?: string | null
          status?: string
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_days?: number
          employee_id?: string
          employee_matricula?: string | null
          employee_name?: string
          id?: string
          last_training_date?: string | null
          observations?: string | null
          status?: string
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_employee_sector: { Args: never; Returns: string }
      generate_registration_code: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_employee_user: { Args: never; Returns: boolean }
      is_current_employee: { Args: { _employee_id: string }; Returns: boolean }
      make_certificate_code: { Args: never; Returns: string }
      revoke_registration_code: {
        Args: { p_employee_id: string }
        Returns: undefined
      }
      sign_exam_attempt: {
        Args: {
          p_attempt_id: string
          p_signature_name: string
          p_signature_path: string
        }
        Returns: {
          answers: Json
          certificate_code: string | null
          created_at: string
          exam_id: string
          finished_at: string
          id: string
          matricula: string | null
          passed: boolean
          score: number
          signature_agreed: boolean
          signature_name: string | null
          signature_path: string | null
          signed_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "exam_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_training_activity: {
        Args: {
          p_activity_title: string
          p_activity_type: string
          p_answers?: Json
          p_score?: number
        }
        Returns: Json
      }
      validate_certificate: {
        Args: { p_code: string }
        Returns: {
          employee_name: string
          exam_title: string
          is_valid: boolean
          issued_at: string
          score: number
          verification_code: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "operador"
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
      app_role: ["admin", "operador"],
    },
  },
} as const
