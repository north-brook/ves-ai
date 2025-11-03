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
          destination_access_token: string | null
          destination_refresh_token: string | null
          destination_team: string | null
          destination_workspace: string | null
          id: string
          last_active_at: string | null
          project_id: string
          type: Database["public"]["Enums"]["destination_type"]
        }
        Insert: {
          created_at?: string
          destination_access_token?: string | null
          destination_refresh_token?: string | null
          destination_team?: string | null
          destination_workspace?: string | null
          id?: string
          last_active_at?: string | null
          project_id: string
          type: Database["public"]["Enums"]["destination_type"]
        }
        Update: {
          created_at?: string
          destination_access_token?: string | null
          destination_refresh_token?: string | null
          destination_team?: string | null
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
      issues: {
        Row: {
          analysis_hash: string | null
          analyzed_at: string | null
          confidence: Database["public"]["Enums"]["issue_confidence"]
          created_at: string
          embedding: string | null
          external_id: string | null
          external_status:
            | Database["public"]["Enums"]["issue_external_status"]
            | null
          id: string
          name: string
          priority: Database["public"]["Enums"]["issue_priority"]
          project_id: string
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"]
          story: string
          type: Database["public"]["Enums"]["issue_type"]
        }
        Insert: {
          analysis_hash?: string | null
          analyzed_at?: string | null
          confidence: Database["public"]["Enums"]["issue_confidence"]
          created_at?: string
          embedding?: string | null
          external_id?: string | null
          external_status?:
            | Database["public"]["Enums"]["issue_external_status"]
            | null
          id?: string
          name: string
          priority: Database["public"]["Enums"]["issue_priority"]
          project_id: string
          severity: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          story: string
          type: Database["public"]["Enums"]["issue_type"]
        }
        Update: {
          analysis_hash?: string | null
          analyzed_at?: string | null
          confidence?: Database["public"]["Enums"]["issue_confidence"]
          created_at?: string
          embedding?: string | null
          external_id?: string | null
          external_status?:
            | Database["public"]["Enums"]["issue_external_status"]
            | null
          id?: string
          name?: string
          priority?: Database["public"]["Enums"]["issue_priority"]
          project_id?: string
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          story?: string
          type?: Database["public"]["Enums"]["issue_type"]
        }
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_groups: {
        Row: {
          analysis_hash: string | null
          analyzed_at: string | null
          created_at: string
          external_id: string
          health: string | null
          id: string
          name: string | null
          project_id: string
          properties: Json | null
          score: number | null
          session_at: string | null
          status: Database["public"]["Enums"]["project_group_status"]
          story: string | null
        }
        Insert: {
          analysis_hash?: string | null
          analyzed_at?: string | null
          created_at?: string
          external_id: string
          health?: string | null
          id?: string
          name?: string | null
          project_id: string
          properties?: Json | null
          score?: number | null
          session_at?: string | null
          status: Database["public"]["Enums"]["project_group_status"]
          story?: string | null
        }
        Update: {
          analysis_hash?: string | null
          analyzed_at?: string | null
          created_at?: string
          external_id?: string
          health?: string | null
          id?: string
          name?: string | null
          project_id?: string
          properties?: Json | null
          score?: number | null
          session_at?: string | null
          status?: Database["public"]["Enums"]["project_group_status"]
          story?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_users: {
        Row: {
          analysis_hash: string | null
          analyzed_at: string | null
          created_at: string
          external_id: string
          health: string | null
          id: string
          name: string | null
          project_group_id: string | null
          project_id: string
          properties: Json | null
          score: number | null
          session_at: string | null
          status: Database["public"]["Enums"]["project_user_status"]
          story: string | null
        }
        Insert: {
          analysis_hash?: string | null
          analyzed_at?: string | null
          created_at?: string
          external_id: string
          health?: string | null
          id?: string
          name?: string | null
          project_group_id?: string | null
          project_id: string
          properties?: Json | null
          score?: number | null
          session_at?: string | null
          status: Database["public"]["Enums"]["project_user_status"]
          story?: string | null
        }
        Update: {
          analysis_hash?: string | null
          analyzed_at?: string | null
          created_at?: string
          external_id?: string
          health?: string | null
          id?: string
          name?: string | null
          project_group_id?: string | null
          project_id?: string
          properties?: Json | null
          score?: number | null
          session_at?: string | null
          status?: Database["public"]["Enums"]["project_user_status"]
          story?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_users_project_group_id_fkey"
            columns: ["project_group_id"]
            isOneToOne: false
            referencedRelation: "project_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
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
          customer_id: string | null
          domain: string
          id: string
          image: string
          name: string
          plan: Database["public"]["Enums"]["project_plan"]
          slug: string
          subscribed_at: string | null
          subscription_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          domain: string
          id?: string
          image: string
          name: string
          plan: Database["public"]["Enums"]["project_plan"]
          slug: string
          subscribed_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          domain?: string
          id?: string
          image?: string
          name?: string
          plan?: Database["public"]["Enums"]["project_plan"]
          slug?: string
          subscribed_at?: string | null
          subscription_id?: string | null
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
      session_issues: {
        Row: {
          created_at: string
          issue_id: string
          project_id: string
          session_id: string
          story: string
          times: Json
        }
        Insert: {
          created_at?: string
          issue_id: string
          project_id: string
          session_id: string
          story: string
          times: Json
        }
        Update: {
          created_at?: string
          issue_id?: string
          project_id?: string
          session_id?: string
          story?: string
          times?: Json
        }
        Relationships: [
          {
            foreignKeyName: "session_issues_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_issues_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          active_duration: number | null
          analyzed_at: string | null
          created_at: string
          detected_issues: Json[] | null
          embedding: string | null
          event_uri: string | null
          external_id: string
          features: string[] | null
          health: string | null
          id: string
          name: string | null
          observations: Json[] | null
          processed_at: string | null
          project_group_id: string | null
          project_id: string
          project_user_id: string
          score: number | null
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
          detected_issues?: Json[] | null
          embedding?: string | null
          event_uri?: string | null
          external_id: string
          features?: string[] | null
          health?: string | null
          id?: string
          name?: string | null
          observations?: Json[] | null
          processed_at?: string | null
          project_group_id?: string | null
          project_id: string
          project_user_id: string
          score?: number | null
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
          detected_issues?: Json[] | null
          embedding?: string | null
          event_uri?: string | null
          external_id?: string
          features?: string[] | null
          health?: string | null
          id?: string
          name?: string | null
          observations?: Json[] | null
          processed_at?: string | null
          project_group_id?: string | null
          project_id?: string
          project_user_id?: string
          score?: number | null
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
            foreignKeyName: "sessions_project_group_id_fkey"
            columns: ["project_group_id"]
            isOneToOne: false
            referencedRelation: "project_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_project_user_id_fkey1"
            columns: ["project_user_id"]
            isOneToOne: false
            referencedRelation: "project_users"
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
      match_issues: {
        Args: {
          match_count: number
          match_threshold: number
          project_id: string
          query_embedding: string
        }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      match_sessions: {
        Args: {
          match_count: number
          match_threshold: number
          project_id: string
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
      issue_confidence: "low" | "medium" | "high"
      issue_external_status:
        | "backlog"
        | "todo"
        | "in_progress"
        | "in_review"
        | "done"
        | "canceled"
        | "duplicate"
      issue_priority: "immediate" | "high" | "medium" | "low" | "backlog"
      issue_severity: "critical" | "high" | "medium" | "low" | "suggestion"
      issue_status: "pending" | "analyzing" | "analyzed" | "failed"
      issue_type: "bug" | "usability" | "improvement" | "feature"
      page_status: "pending" | "analyzing" | "analyzed" | "failed"
      project_group_status: "pending" | "analyzing" | "analyzed" | "failed"
      project_plan: "starter" | "growth" | "scale" | "enterprise"
      project_user_status: "pending" | "analyzing" | "analyzed" | "failed"
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
      issue_confidence: ["low", "medium", "high"],
      issue_external_status: [
        "backlog",
        "todo",
        "in_progress",
        "in_review",
        "done",
        "canceled",
        "duplicate",
      ],
      issue_priority: ["immediate", "high", "medium", "low", "backlog"],
      issue_severity: ["critical", "high", "medium", "low", "suggestion"],
      issue_status: ["pending", "analyzing", "analyzed", "failed"],
      issue_type: ["bug", "usability", "improvement", "feature"],
      page_status: ["pending", "analyzing", "analyzed", "failed"],
      project_group_status: ["pending", "analyzing", "analyzed", "failed"],
      project_plan: ["starter", "growth", "scale", "enterprise"],
      project_user_status: ["pending", "analyzing", "analyzed", "failed"],
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

