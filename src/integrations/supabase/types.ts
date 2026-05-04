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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string
        }
        Relationships: []
      }
      booking_series: {
        Row: {
          created_at: string
          end_hour: number
          facility_id: string
          id: string
          start_date: string
          start_hour: number
          team_name: string
          user_id: string
          weekday: number
          weeks: number
        }
        Insert: {
          created_at?: string
          end_hour: number
          facility_id: string
          id?: string
          start_date: string
          start_hour: number
          team_name: string
          user_id: string
          weekday: number
          weeks: number
        }
        Update: {
          created_at?: string
          end_hour?: number
          facility_id?: string
          id?: string
          start_date?: string
          start_hour?: number
          team_name?: string
          user_id?: string
          weekday?: number
          weeks?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          created_at: string
          end_hour: number
          facility_id: string
          id: string
          owner_notes: string | null
          paid_at: string | null
          payment_ref: string | null
          series_id: string | null
          start_hour: number
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          user_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          end_hour: number
          facility_id: string
          id?: string
          owner_notes?: string | null
          paid_at?: string | null
          payment_ref?: string | null
          series_id?: string | null
          start_hour: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          user_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          end_hour?: number
          facility_id?: string
          id?: string
          owner_notes?: string | null
          paid_at?: string | null
          payment_ref?: string | null
          series_id?: string | null
          start_hour?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          close_hour: number
          created_at: string
          description: string | null
          hourly_price: number
          id: string
          image_url: string | null
          location: string
          name: string
          open_hour: number
          owner_id: string | null
          sport_type: string
          updated_at: string
        }
        Insert: {
          close_hour?: number
          created_at?: string
          description?: string | null
          hourly_price?: number
          id?: string
          image_url?: string | null
          location: string
          name: string
          open_hour?: number
          owner_id?: string | null
          sport_type: string
          updated_at?: string
        }
        Update: {
          close_hour?: number
          created_at?: string
          description?: string | null
          hourly_price?: number
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          open_hour?: number
          owner_id?: string | null
          sport_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          business_name: string
          checklist: Json
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          description: string | null
          facility_type: string
          id: string
          location: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["partner_app_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          checklist?: Json
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          description?: string | null
          facility_type: string
          id?: string
          location: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["partner_app_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          checklist?: Json
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          description?: string | null
          facility_type?: string
          id?: string
          location?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["partner_app_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          reminder_channel: string
          reminders_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          reminder_channel?: string
          reminders_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          reminder_channel?: string
          reminders_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reminder_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          minutes_before: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          minutes_before: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          minutes_before?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_log_password_reset: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_review_partner_application: {
        Args: { _application_id: string; _approve: boolean; _notes?: string }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
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
      app_role: "admin" | "owner" | "user"
      booking_status: "pending" | "paid" | "cancelled" | "completed"
      partner_app_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "owner", "user"],
      booking_status: ["pending", "paid", "cancelled", "completed"],
      partner_app_status: ["pending", "approved", "rejected"],
    },
  },
} as const
