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
      age_color_map: {
        Row: {
          age_value: string
          barn_id: string
          color: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          updated_at: string
          version: number
        }
        Insert: {
          age_value: string
          barn_id: string
          color: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          age_value?: string
          barn_id?: string
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "age_color_map_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
      animal: {
        Row: {
          age_designation: string | null
          age_value: string | null
          animal_type_id: string | null
          barn_id: string
          breed: string | null
          buyer_load_id: string | null
          color: string | null
          consignment_lot_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          pen: string | null
          preg_status: string | null
          preg_timing: string | null
          quick_notes: string[]
          sale_day_id: string
          updated_at: string
          version: number
        }
        Insert: {
          age_designation?: string | null
          age_value?: string | null
          animal_type_id?: string | null
          barn_id: string
          breed?: string | null
          buyer_load_id?: string | null
          color?: string | null
          consignment_lot_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          pen?: string | null
          preg_status?: string | null
          preg_timing?: string | null
          quick_notes?: string[]
          sale_day_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          age_designation?: string | null
          age_value?: string | null
          animal_type_id?: string | null
          barn_id?: string
          breed?: string | null
          buyer_load_id?: string | null
          color?: string | null
          consignment_lot_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          pen?: string | null
          preg_status?: string | null
          preg_timing?: string | null
          quick_notes?: string[]
          sale_day_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "animal_animal_type_id_fkey"
            columns: ["animal_type_id"]
            isOneToOne: false
            referencedRelation: "animal_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_buyer_load_id_fkey"
            columns: ["buyer_load_id"]
            isOneToOne: false
            referencedRelation: "buyer_load"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_consignment_lot_id_fkey"
            columns: ["consignment_lot_id"]
            isOneToOne: false
            referencedRelation: "consignment_lot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_type: {
        Row: {
          active: boolean
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          barn_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          barn_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "animal_type_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
      barn: {
        Row: {
          admin_fee_rate: number
          age_encoding_method: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          official_id_type: string
          sales_tax_rate: number
          updated_at: string
          version: number
        }
        Insert: {
          admin_fee_rate?: number
          age_encoding_method?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          official_id_type?: string
          sales_tax_rate?: number
          updated_at?: string
          version?: number
        }
        Update: {
          admin_fee_rate?: number
          age_encoding_method?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          official_id_type?: string
          sales_tax_rate?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      barn_member: {
        Row: {
          barn_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          barn_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          barn_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barn_member_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_load: {
        Row: {
          admin_total: number | null
          animal_type_id: string | null
          barn_id: string
          buyer_number_id: string | null
          buyer_number_text: string | null
          buyer_party_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          destination: string | null
          destination_state: string | null
          expected_head: number | null
          frozen_admin_rate: number | null
          frozen_sol_charge: number | null
          frozen_tax_rate: number | null
          frozen_vet_charge: number | null
          head_billed: number | null
          health_complete: boolean
          id: string
          notes: string | null
          pen: string | null
          sale_day_id: string
          sol_total: number | null
          total_customer_charge: number | null
          updated_at: string
          version: number
          vet_total: number | null
          work_complete: boolean
          work_type_id: string | null
        }
        Insert: {
          admin_total?: number | null
          animal_type_id?: string | null
          barn_id: string
          buyer_number_id?: string | null
          buyer_number_text?: string | null
          buyer_party_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination?: string | null
          destination_state?: string | null
          expected_head?: number | null
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head_billed?: number | null
          health_complete?: boolean
          id?: string
          notes?: string | null
          pen?: string | null
          sale_day_id: string
          sol_total?: number | null
          total_customer_charge?: number | null
          updated_at?: string
          version?: number
          vet_total?: number | null
          work_complete?: boolean
          work_type_id?: string | null
        }
        Update: {
          admin_total?: number | null
          animal_type_id?: string | null
          barn_id?: string
          buyer_number_id?: string | null
          buyer_number_text?: string | null
          buyer_party_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination?: string | null
          destination_state?: string | null
          expected_head?: number | null
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head_billed?: number | null
          health_complete?: boolean
          id?: string
          notes?: string | null
          pen?: string | null
          sale_day_id?: string
          sol_total?: number | null
          total_customer_charge?: number | null
          updated_at?: string
          version?: number
          vet_total?: number | null
          work_complete?: boolean
          work_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_load_animal_type_id_fkey"
            columns: ["animal_type_id"]
            isOneToOne: false
            referencedRelation: "animal_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_load_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_load_buyer_number_id_fkey"
            columns: ["buyer_number_id"]
            isOneToOne: false
            referencedRelation: "buyer_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_load_buyer_party_id_fkey"
            columns: ["buyer_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_load_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_load_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_type"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_number: {
        Row: {
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          needs: string | null
          number: string
          party_id: string
          typical_destination: string | null
          typical_state: string | null
          updated_at: string
          version: number
        }
        Insert: {
          barn_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          needs?: string | null
          number: string
          party_id: string
          typical_destination?: string | null
          typical_state?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          barn_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          needs?: string | null
          number?: string
          party_id?: string
          typical_destination?: string | null
          typical_state?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "buyer_number_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_number_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_lot: {
        Row: {
          admin_total: number | null
          animal_type_id: string | null
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expected_head: number | null
          frozen_admin_rate: number | null
          frozen_sol_charge: number | null
          frozen_tax_rate: number | null
          frozen_vet_charge: number | null
          head_billed: number | null
          health_complete: boolean
          id: string
          notes: string | null
          pen: string | null
          people_names: string | null
          sale_day_id: string
          seller_party_id: string | null
          sol_total: number | null
          total_customer_charge: number | null
          updated_at: string
          version: number
          vet_total: number | null
          work_complete: boolean
          work_type_id: string | null
        }
        Insert: {
          admin_total?: number | null
          animal_type_id?: string | null
          barn_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expected_head?: number | null
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head_billed?: number | null
          health_complete?: boolean
          id?: string
          notes?: string | null
          pen?: string | null
          people_names?: string | null
          sale_day_id: string
          seller_party_id?: string | null
          sol_total?: number | null
          total_customer_charge?: number | null
          updated_at?: string
          version?: number
          vet_total?: number | null
          work_complete?: boolean
          work_type_id?: string | null
        }
        Update: {
          admin_total?: number | null
          animal_type_id?: string | null
          barn_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expected_head?: number | null
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head_billed?: number | null
          health_complete?: boolean
          id?: string
          notes?: string | null
          pen?: string | null
          people_names?: string | null
          sale_day_id?: string
          seller_party_id?: string | null
          sol_total?: number | null
          total_customer_charge?: number | null
          updated_at?: string
          version?: number
          vet_total?: number | null
          work_complete?: boolean
          work_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignment_lot_animal_type_id_fkey"
            columns: ["animal_type_id"]
            isOneToOne: false
            referencedRelation: "animal_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_lot_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_lot_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_lot_seller_party_id_fkey"
            columns: ["seller_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_lot_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_type"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          barn_id: string
          buyer_load_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          destination: string | null
          destination_state: string | null
          gvl_reference: string | null
          id: string
          status: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          barn_id: string
          buyer_load_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination?: string | null
          destination_state?: string | null
          gvl_reference?: string | null
          id?: string
          status?: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          barn_id?: string
          buyer_load_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination?: string | null
          destination_state?: string | null
          gvl_reference?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_buyer_load_id_fkey"
            columns: ["buyer_load_id"]
            isOneToOne: false
            referencedRelation: "buyer_load"
            referencedColumns: ["id"]
          },
        ]
      }
      identifier: {
        Row: {
          animal_id: string
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_official: boolean
          type: string
          updated_at: string
          value: string
          version: number
        }
        Insert: {
          animal_id: string
          barn_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_official?: boolean
          type: string
          updated_at?: string
          value: string
          version?: number
        }
        Update: {
          animal_id?: string
          barn_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_official?: boolean
          type?: string
          updated_at?: string
          value?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "identifier_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identifier_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
      party: {
        Row: {
          address: string | null
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          updated_at: string
          version: number
        }
        Insert: {
          address?: string | null
          barn_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          address?: string | null
          barn_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "party_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_day: {
        Row: {
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          sale_date: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          barn_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          sale_date: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          barn_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          sale_date?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_day_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
      special_charge: {
        Row: {
          admin_total: number
          barn_id: string
          created_at: string
          created_by: string | null
          customer_charge: number
          deleted_at: string | null
          description: string | null
          head: number
          id: string
          party_id: string | null
          role: string
          sale_day_id: string
          sol_total: number
          updated_at: string
          version: number
          vet_total: number
        }
        Insert: {
          admin_total?: number
          barn_id: string
          created_at?: string
          created_by?: string | null
          customer_charge?: number
          deleted_at?: string | null
          description?: string | null
          head?: number
          id?: string
          party_id?: string | null
          role?: string
          sale_day_id: string
          sol_total?: number
          updated_at?: string
          version?: number
          vet_total?: number
        }
        Update: {
          admin_total?: number
          barn_id?: string
          created_at?: string
          created_by?: string | null
          customer_charge?: number
          deleted_at?: string | null
          description?: string | null
          head?: number
          id?: string
          party_id?: string | null
          role?: string
          sale_day_id?: string
          sol_total?: number
          updated_at?: string
          version?: number
          vet_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "special_charge_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_charge_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_charge_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
        ]
      }
      work_type: {
        Row: {
          active: boolean
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          sol_charge: number
          updated_at: string
          version: number
          vet_charge: number
        }
        Insert: {
          active?: boolean
          barn_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          sol_charge?: number
          updated_at?: string
          version?: number
          vet_charge: number
        }
        Update: {
          active?: boolean
          barn_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          sol_charge?: number
          updated_at?: string
          version?: number
          vet_charge?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_type_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_barn_ids: { Args: never; Returns: string[] }
      user_is_barn_admin: { Args: { b: string }; Returns: boolean }
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
