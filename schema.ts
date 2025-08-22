export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      destinations: {
        Row: {
          created_at: string
          destination_team: string | null
          destination_token: string | null
          destination_workspace: string | null
          id: string
          last_active_at: string | null
          project_id: string
          type: Database["public"]["Enums"]["destination_type"]
        }
        Insert: {
          created_at?: string
          destination_team?: string | null
          destination_token?: string | null
          destination_workspace?: string | null
          id?: string
          last_active_at?: string | null
          project_id: string
          type: Database["public"]["Enums"]["destination_type"]
        }
        Update: {
          created_at?: string
          destination_team?: string | null
          destination_token?: string | null
          destination_workspace?: string | null
          id?: string
          last_active_at?: string | null
          project_id?: string
          type?: Database["public"]["Enums"]["destination_type"]
        }
        Relationships: [
          {
            foreignKeyName: "destinations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          domain: string
          id: string
          image: string
          name: string
          plan: Database["public"]["Enums"]["project_plan"]
          slug: string
          subscribed_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          image: string
          name: string
          plan: Database["public"]["Enums"]["project_plan"]
          slug: string
          subscribed_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          image?: string
          name?: string
          plan?: Database["public"]["Enums"]["project_plan"]
          slug?: string
          subscribed_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_tickets: {
        Row: {
          created_at: string
          id: string
          project_id: string
          session_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          session_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          session_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_tickets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          active_duration: number | null
          analyzed_at: string | null
          created_at: string
          embedding: string | null
          event_uri: string | null
          external_group_id: string | null
          external_group_name: string | null
          external_id: string
          external_user_id: string | null
          external_user_name: string | null
          features: string[] | null
          id: string
          name: string | null
          observations: Json[] | null
          processed_at: string | null
          project_id: string
          session_at: string | null
          source_id: string
          status: Database["public"]["Enums"]["session_status"]
          story: string | null
          total_duration: number | null
          video_duration: number | null
          video_uri: string | null
        }
        Insert: {
          active_duration?: number | null
          analyzed_at?: string | null
          created_at?: string
          embedding?: string | null
          event_uri?: string | null
          external_group_id?: string | null
          external_group_name?: string | null
          external_id: string
          external_user_id?: string | null
          external_user_name?: string | null
          features?: string[] | null
          id?: string
          name?: string | null
          observations?: Json[] | null
          processed_at?: string | null
          project_id: string
          session_at?: string | null
          source_id: string
          status: Database["public"]["Enums"]["session_status"]
          story?: string | null
          total_duration?: number | null
          video_duration?: number | null
          video_uri?: string | null
        }
        Update: {
          active_duration?: number | null
          analyzed_at?: string | null
          created_at?: string
          embedding?: string | null
          event_uri?: string | null
          external_group_id?: string | null
          external_group_name?: string | null
          external_id?: string
          external_user_id?: string | null
          external_user_name?: string | null
          features?: string[] | null
          id?: string
          name?: string | null
          observations?: Json[] | null
          processed_at?: string | null
          project_id?: string
          session_at?: string | null
          source_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          story?: string | null
          total_duration?: number | null
          video_duration?: number | null
          video_uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          id: string
          last_active_at: string | null
          project_id: string
          source_host: string | null
          source_key: string | null
          source_project: string | null
          type: Database["public"]["Enums"]["source_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          project_id: string
          source_host?: string | null
          source_key?: string | null
          source_project?: string | null
          type: Database["public"]["Enums"]["source_type"]
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          project_id?: string
          source_host?: string | null
          source_key?: string | null
          source_project?: string | null
          type?: Database["public"]["Enums"]["source_type"]
        }
        Relationships: [
          {
            foreignKeyName: "sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          description: string
          destination_id: string
          external_id: string
          id: string
          labels: string[]
          links: string[]
          name: string
          project_id: string
          status: string
          url: string
        }
        Insert: {
          created_at?: string
          description: string
          destination_id: string
          external_id: string
          id?: string
          labels: string[]
          links: string[]
          name: string
          project_id: string
          status: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          destination_id?: string
          external_id?: string
          id?: string
          labels?: string[]
          links?: string[]
          name?: string
          project_id?: string
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          image: string | null
          last_name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          image?: string | null
          last_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          image?: string | null
          last_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_sessions: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      project_access: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      destination_type: "linear"
      project_plan: "trial" | "starter" | "growth" | "scale" | "enterprise"
      session_status:
        | "pending"
        | "processing"
        | "processed"
        | "analyzing"
        | "analyzed"
        | "failed"
      source_type: "posthog"
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
      destination_type: ["linear"],
      project_plan: ["trial", "starter", "growth", "scale", "enterprise"],
      session_status: [
        "pending",
        "processing",
        "processed",
        "analyzing",
        "analyzed",
        "failed",
      ],
      source_type: ["posthog"],
    },
  },
} as const

