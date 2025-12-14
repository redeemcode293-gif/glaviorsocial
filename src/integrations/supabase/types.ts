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
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          title: string
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          auto_refill: boolean | null
          created_at: string
          dripfeed: boolean | null
          dripfeed_interval: number | null
          id: string
          link: string
          order_number: string
          price: number
          quantity: number
          remains: number | null
          service_id: string
          start_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_refill?: boolean | null
          created_at?: string
          dripfeed?: boolean | null
          dripfeed_interval?: number | null
          id?: string
          link: string
          order_number: string
          price: number
          quantity: number
          remains?: number | null
          service_id: string
          start_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_refill?: boolean | null
          created_at?: string
          dripfeed?: boolean | null
          dripfeed_interval?: number | null
          id?: string
          link?: string
          order_number?: string
          price?: number
          quantity?: number
          remains?: number | null
          service_id?: string
          start_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string | null
          country_code: string | null
          created_at: string
          custom_multiplier: number | null
          email: string | null
          full_name: string | null
          id: string
          pricing_override: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
          vip_tier: string | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          custom_multiplier?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          pricing_override?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
          vip_tier?: string | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          custom_multiplier?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          pricing_override?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          vip_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_rate: number | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string | null
          total_earnings: number | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string | null
          total_earnings?: number | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string | null
          total_earnings?: number | null
        }
        Relationships: []
      }
      refills: {
        Row: {
          created_at: string
          id: string
          order_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refills_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_pricing: {
        Row: {
          countries: string[]
          created_at: string
          id: string
          multiplier: number
          region_code: string
          region_name: string
          updated_at: string
        }
        Insert: {
          countries?: string[]
          created_at?: string
          id?: string
          multiplier?: number
          region_code: string
          region_name: string
          updated_at?: string
        }
        Update: {
          countries?: string[]
          created_at?: string
          id?: string
          multiplier?: number
          region_code?: string
          region_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reseller_panels: {
        Row: {
          created_at: string
          custom_domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          panel_name: string
          pricing_margin: number | null
          subdomain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          panel_name: string
          pricing_margin?: number | null
          subdomain?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          panel_name?: string
          pricing_margin?: number | null
          subdomain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number
          category: string
          created_at: string
          description: string | null
          dripfeed_supported: boolean | null
          id: string
          is_active: boolean | null
          max_quantity: number
          min_quantity: number
          name: string
          platform: string
          refill_supported: boolean | null
          service_id: number
          speed_estimate: string | null
          updated_at: string
        }
        Insert: {
          base_price: number
          category: string
          created_at?: string
          description?: string | null
          dripfeed_supported?: boolean | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number
          min_quantity?: number
          name: string
          platform: string
          refill_supported?: boolean | null
          service_id: number
          speed_estimate?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          dripfeed_supported?: boolean | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number
          min_quantity?: number
          name?: string
          platform?: string
          refill_supported?: boolean | null
          service_id?: number
          speed_estimate?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean | null
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean | null
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_method: string | null
          payment_proof_url: string | null
          reference_id: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          reference_id?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          reference_id?: string | null
          status?: string
          type?: string
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
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_deposited: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
