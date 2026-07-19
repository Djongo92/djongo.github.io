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
      benchmark_rate_limit: {
        Row: {
          client_id: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          client_id: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          client_id?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      teaser_rate_limit: {
        Row: {
          ip_hash: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          ip_hash: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          ip_hash?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      directory_lookup_requests: {
        Row: {
          firm_domain_or_name: string
          id: string
          market: string
          requested_at: string
        }
        Insert: {
          firm_domain_or_name: string
          id?: string
          market: string
          requested_at?: string
        }
        Update: {
          firm_domain_or_name?: string
          id?: string
          market?: string
          requested_at?: string
        }
        Relationships: []
      }
      market_directory_data: {
        Row: {
          chambers: Json
          firm_domain: string | null
          firm_name: string
          firm_type: string | null
          id: string
          iflr1000: Json
          last_verified_at: string
          legal500: Json
          market: string
        }
        Insert: {
          chambers?: Json
          firm_domain?: string | null
          firm_name: string
          firm_type?: string | null
          id?: string
          iflr1000?: Json
          last_verified_at?: string
          legal500?: Json
          market: string
        }
        Update: {
          chambers?: Json
          firm_domain?: string | null
          firm_name?: string
          firm_type?: string | null
          id?: string
          iflr1000?: Json
          last_verified_at?: string
          legal500?: Json
          market?: string
        }
        Relationships: []
      }
      market_visibility_audits: {
        Row: {
          audited_domain: string
          client_id: string
          created_at: string
          display_name: string | null
          id: string
          market: string
          peer_group: string
          performance_score: number
          provenance: Json
          published_at: string | null
          raw_metrics: Json
          reputation_score: number
          is_public: boolean
          seo_authority_score: number
          social_score: number
          thought_leadership_score: number
          total_score: number
          updated_at: string
        }
        Insert: {
          audited_domain: string
          client_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          market: string
          peer_group: string
          performance_score?: number
          provenance?: Json
          published_at?: string | null
          raw_metrics?: Json
          reputation_score?: number
          is_public?: boolean
          seo_authority_score?: number
          social_score?: number
          thought_leadership_score?: number
          total_score?: never
          updated_at?: string
        }
        Update: {
          audited_domain?: string
          client_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          market?: string
          peer_group?: string
          performance_score?: number
          provenance?: Json
          published_at?: string | null
          raw_metrics?: Json
          reputation_score?: number
          is_public?: boolean
          seo_authority_score?: number
          social_score?: number
          thought_leadership_score?: number
          total_score?: never
          updated_at?: string
        }
        Relationships: []
      }
      firm_benchmarks: {
        Row: {
          analyses_run: number
          chapters_read: number
          client_id: string
          created_at: string
          firm_size: string | null
          id: string
          implementation_pct: number
          practice_area: string | null
          updated_at: string
        }
        Insert: {
          analyses_run?: number
          chapters_read?: number
          client_id: string
          created_at?: string
          firm_size?: string | null
          id?: string
          implementation_pct?: number
          practice_area?: string | null
          updated_at?: string
        }
        Update: {
          analyses_run?: number
          chapters_read?: number
          client_id?: string
          created_at?: string
          firm_size?: string | null
          id?: string
          implementation_pct?: number
          practice_area?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shared_artifacts: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          payload: Json
          source_url: string | null
          title: string
          view_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: string
          payload: Json
          source_url?: string | null
          title: string
          view_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          source_url?: string | null
          title?: string
          view_count?: number
        }
        Relationships: []
      }
      url_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          fn_name: string
          response: Json
          url: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at?: string
          fn_name: string
          response: Json
          url: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          fn_name?: string
          response?: Json
          url?: string
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
