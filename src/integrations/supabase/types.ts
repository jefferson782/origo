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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          role: string | null
          service_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          role?: string | null
          service_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          role?: string | null
          service_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      department_members: {
        Row: {
          created_at: string
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_member_skills: {
        Row: {
          created_at: string
          department_member_id: string
          department_role_id: string
          id: string
        }
        Insert: {
          created_at?: string
          department_member_id: string
          department_role_id: string
          id?: string
        }
        Update: {
          created_at?: string
          department_member_id?: string
          department_role_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_member_skills_department_member_id_fkey"
            columns: ["department_member_id"]
            isOneToOne: false
            referencedRelation: "department_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_member_skills_department_role_id_fkey"
            columns: ["department_role_id"]
            isOneToOne: false
            referencedRelation: "department_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_roles: {
        Row: {
          created_at: string
          department_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          church_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          church_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          church_id: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          church_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_services: {
        Row: {
          church_id: string
          created_at: string
          id: string
          name: string
          service_time: string | null
          weekday: number
        }
        Insert: {
          church_id: string
          created_at?: string
          id?: string
          name: string
          service_time?: string | null
          weekday: number
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          name?: string
          service_time?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_services_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      service_songs: {
        Row: {
          artist: string | null
          created_at: string
          id: string
          link: string | null
          position: number
          service_id: string
          song_key: string | null
          title: string
        }
        Insert: {
          artist?: string | null
          created_at?: string
          id?: string
          link?: string | null
          position?: number
          service_id: string
          song_key?: string | null
          title: string
        }
        Update: {
          artist?: string | null
          created_at?: string
          id?: string
          link?: string | null
          position?: number
          service_id?: string
          song_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_songs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          church_id: string
          created_at: string
          id: string
          name: string
          service_date: string
          service_time: string | null
        }
        Insert: {
          church_id: string
          created_at?: string
          id?: string
          name: string
          service_date: string
          service_time?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          name?: string
          service_date?: string
          service_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      unavailability: {
        Row: {
          created_at: string
          day: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          church_id: string | null
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          church_id?: string | null
          department_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          church_id?: string | null
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_church: { Args: { _church_id: string }; Returns: boolean }
      can_manage_department: {
        Args: { _department_id: string }
        Returns: boolean
      }
      current_user_church: { Args: never; Returns: string }
      generate_monthly_schedule: {
        Args: { _church_id: string; _month: number; _year: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_department_leader: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
      materialize_recurring_for_month: {
        Args: { _church_id: string; _month: number; _year: number }
        Returns: number
      }
      register_with_church_code: {
        Args: { _church_code: string; _full_name: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "member" | "leader"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "admin", "member", "leader"],
    },
  },
} as const
