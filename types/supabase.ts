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
      age_designation_option: {
        Row: {
          active: boolean
          age_code: string
          age_label: string
          age_max_years: number | null
          age_min_years: number | null
          barn_id: string
          created_at: string
          designation_value: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          age_code: string
          age_label: string
          age_max_years?: number | null
          age_min_years?: number | null
          barn_id: string
          created_at?: string
          designation_value: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          age_code?: string
          age_label?: string
          age_max_years?: number | null
          age_min_years?: number | null
          barn_id?: string
          created_at?: string
          designation_value?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "age_designation_option_barn_id_fkey"
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
          color: string | null
          created_at: string
          created_by: string | null
          current_pen_id: string | null
          deleted_at: string | null
          fetal_sex: string | null
          id: string
          notes: string | null
          pen: string | null
          pen_work_id: string | null
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
          color?: string | null
          created_at?: string
          created_by?: string | null
          current_pen_id?: string | null
          deleted_at?: string | null
          fetal_sex?: string | null
          id?: string
          notes?: string | null
          pen?: string | null
          pen_work_id?: string | null
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
          color?: string | null
          created_at?: string
          created_by?: string | null
          current_pen_id?: string | null
          deleted_at?: string | null
          fetal_sex?: string | null
          id?: string
          notes?: string | null
          pen?: string | null
          pen_work_id?: string | null
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
            foreignKeyName: "animal_current_pen_id_fkey"
            columns: ["current_pen_id"]
            isOneToOne: false
            referencedRelation: "pen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_pen_work_id_fkey"
            columns: ["pen_work_id"]
            isOneToOne: false
            referencedRelation: "pen_work"
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
          age_id_method: string
          age_numeric_enabled: boolean
          back_tag_auto_increment: boolean
          back_tag_barn_codes: string[]
          back_tag_state_codes: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          official_id_type: string
          preg_active_months: string[]
          preg_id_method: string
          preg_timing_format: string
          sales_tax_rate: number
          updated_at: string
          version: number
        }
        Insert: {
          admin_fee_rate?: number
          age_encoding_method?: string
          age_id_method?: string
          age_numeric_enabled?: boolean
          back_tag_auto_increment?: boolean
          back_tag_barn_codes?: string[]
          back_tag_state_codes?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          official_id_type?: string
          preg_active_months?: string[]
          preg_id_method?: string
          preg_timing_format?: string
          sales_tax_rate?: number
          updated_at?: string
          version?: number
        }
        Update: {
          admin_fee_rate?: number
          age_encoding_method?: string
          age_id_method?: string
          age_numeric_enabled?: boolean
          back_tag_auto_increment?: boolean
          back_tag_barn_codes?: string[]
          back_tag_state_codes?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          official_id_type?: string
          preg_active_months?: string[]
          preg_id_method?: string
          preg_timing_format?: string
          sales_tax_rate?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      barn_field_config: {
        Row: {
          barn_id: string
          created_at: string
          default_value: string | null
          display_label: string | null
          field_key: string
          id: string
          is_displayed: boolean
          is_required: boolean
          sort_order: number
          updated_at: string
          work_type_id: string | null
        }
        Insert: {
          barn_id: string
          created_at?: string
          default_value?: string | null
          display_label?: string | null
          field_key: string
          id?: string
          is_displayed?: boolean
          is_required?: boolean
          sort_order?: number
          updated_at?: string
          work_type_id?: string | null
        }
        Update: {
          barn_id?: string
          created_at?: string
          default_value?: string | null
          display_label?: string | null
          field_key?: string
          id?: string
          is_displayed?: boolean
          is_required?: boolean
          sort_order?: number
          updated_at?: string
          work_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barn_field_config_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barn_field_config_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_type"
            referencedColumns: ["id"]
          },
        ]
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
      document: {
        Row: {
          barn_id: string
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
        ]
      }
      field_value_option: {
        Row: {
          active: boolean
          barn_id: string
          code: string | null
          created_at: string
          field_key: string
          id: string
          is_pinned: boolean
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          active?: boolean
          barn_id: string
          code?: string | null
          created_at?: string
          field_key: string
          id?: string
          is_pinned?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          active?: boolean
          barn_id?: string
          code?: string | null
          created_at?: string
          field_key?: string
          id?: string
          is_pinned?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_value_option_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
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
          customer_number: string | null
          deleted_at: string | null
          email: string | null
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
          customer_number?: string | null
          deleted_at?: string | null
          email?: string | null
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
          customer_number?: string | null
          deleted_at?: string | null
          email?: string | null
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
      party_location: {
        Row: {
          address: string | null
          barn_id: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_default: boolean
          is_physical: boolean
          is_po_box: boolean
          label: string | null
          party_id: string
          premise_id: string | null
          state: string | null
          updated_at: string
          version: number
          zip: string | null
        }
        Insert: {
          address?: string | null
          barn_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          is_physical?: boolean
          is_po_box?: boolean
          label?: string | null
          party_id: string
          premise_id?: string | null
          state?: string | null
          updated_at?: string
          version?: number
          zip?: string | null
        }
        Update: {
          address?: string | null
          barn_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          is_physical?: boolean
          is_po_box?: boolean
          label?: string | null
          party_id?: string
          premise_id?: string | null
          state?: string | null
          updated_at?: string
          version?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_location_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_location_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      pen: {
        Row: {
          barn_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          pen_number: string
          sale_day_id: string | null
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
          pen_number: string
          sale_day_id?: string | null
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
          pen_number?: string
          sale_day_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pen_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
        ]
      }
      pen_session: {
        Row: {
          barn_id: string
          created_at: string
          field_defaults: Json
          id: string
          is_up: boolean
          pen_id: string
          sale_day_id: string
          up_at: string | null
          updated_at: string
        }
        Insert: {
          barn_id: string
          created_at?: string
          field_defaults?: Json
          id?: string
          is_up?: boolean
          pen_id: string
          sale_day_id: string
          up_at?: string | null
          updated_at?: string
        }
        Update: {
          barn_id?: string
          created_at?: string
          field_defaults?: Json
          id?: string
          is_up?: boolean
          pen_id?: string
          sale_day_id?: string
          up_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pen_session_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_session_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_session_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
        ]
      }
      pen_work: {
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
          frozen_admin_rate: number | null
          frozen_sol_charge: number | null
          frozen_tax_rate: number | null
          frozen_vet_charge: number | null
          head_billed: number | null
          head_expected: number | null
          head_returned: number | null
          head_started: number | null
          head_worked: number | null
          health_complete: boolean
          id: string
          is_hold: boolean
          line_status: string
          notes: string | null
          origin: string
          origin_location_id: string | null
          pen_id: string | null
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
          buyer_number_id?: string | null
          buyer_number_text?: string | null
          buyer_party_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination?: string | null
          destination_state?: string | null
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head_billed?: number | null
          head_expected?: number | null
          head_returned?: number | null
          head_started?: number | null
          head_worked?: number | null
          health_complete?: boolean
          id?: string
          is_hold?: boolean
          line_status?: string
          notes?: string | null
          origin?: string
          origin_location_id?: string | null
          pen_id?: string | null
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
          buyer_number_id?: string | null
          buyer_number_text?: string | null
          buyer_party_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination?: string | null
          destination_state?: string | null
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head_billed?: number | null
          head_expected?: number | null
          head_returned?: number | null
          head_started?: number | null
          head_worked?: number | null
          health_complete?: boolean
          id?: string
          is_hold?: boolean
          line_status?: string
          notes?: string | null
          origin?: string
          origin_location_id?: string | null
          pen_id?: string | null
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
            foreignKeyName: "pen_work_animal_type_id_fkey"
            columns: ["animal_type_id"]
            isOneToOne: false
            referencedRelation: "animal_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_buyer_number_id_fkey"
            columns: ["buyer_number_id"]
            isOneToOne: false
            referencedRelation: "buyer_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_buyer_party_id_fkey"
            columns: ["buyer_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "party_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_seller_party_id_fkey"
            columns: ["seller_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_type"
            referencedColumns: ["id"]
          },
        ]
      }
      pen_work_adjustment: {
        Row: {
          barn_id: string
          created_at: string
          created_by: string | null
          from_value: string | null
          head_delta: number | null
          id: string
          kind: string
          pen_work_id: string
          reason: string | null
          sale_day_id: string | null
          source_pen_work_id: string | null
          to_value: string | null
        }
        Insert: {
          barn_id: string
          created_at?: string
          created_by?: string | null
          from_value?: string | null
          head_delta?: number | null
          id?: string
          kind: string
          pen_work_id: string
          reason?: string | null
          sale_day_id?: string | null
          source_pen_work_id?: string | null
          to_value?: string | null
        }
        Update: {
          barn_id?: string
          created_at?: string
          created_by?: string | null
          from_value?: string | null
          head_delta?: number | null
          id?: string
          kind?: string
          pen_work_id?: string
          reason?: string | null
          sale_day_id?: string | null
          source_pen_work_id?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pen_work_adjustment_pen_work_id_fkey"
            columns: ["pen_work_id"]
            isOneToOne: false
            referencedRelation: "pen_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_adjustment_source_pen_work_id_fkey"
            columns: ["source_pen_work_id"]
            isOneToOne: false
            referencedRelation: "pen_work"
            referencedColumns: ["id"]
          },
        ]
      }
      preg_stage_config: {
        Row: {
          active: boolean
          barn_id: string
          created_at: string
          display_label: string
          id: string
          sort_order: number
          stage_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          barn_id: string
          created_at?: string
          display_label: string
          id?: string
          sort_order?: number
          stage_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          barn_id?: string
          created_at?: string
          display_label?: string
          id?: string
          sort_order?: number
          stage_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preg_stage_config_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_note_definition: {
        Row: {
          active: boolean
          barn_id: string
          created_at: string
          id: string
          is_flag: boolean
          label: string
          sale_day_id: string | null
          scope: string
          sort_priority: number
          updated_at: string
          use_count: number
        }
        Insert: {
          active?: boolean
          barn_id: string
          created_at?: string
          id?: string
          is_flag?: boolean
          label: string
          sale_day_id?: string | null
          scope?: string
          sort_priority?: number
          updated_at?: string
          use_count?: number
        }
        Update: {
          active?: boolean
          barn_id?: string
          created_at?: string
          id?: string
          is_flag?: boolean
          label?: string
          sale_day_id?: string | null
          scope?: string
          sort_priority?: number
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quick_note_definition_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_note_definition_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
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
          frozen_admin_rate: number | null
          frozen_sol_charge: number | null
          frozen_tax_rate: number | null
          frozen_vet_charge: number | null
          head: number
          id: string
          party_id: string | null
          pen_work_id: string | null
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
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head?: number
          id?: string
          party_id?: string | null
          pen_work_id?: string | null
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
          frozen_admin_rate?: number | null
          frozen_sol_charge?: number | null
          frozen_tax_rate?: number | null
          frozen_vet_charge?: number | null
          head?: number
          id?: string
          party_id?: string | null
          pen_work_id?: string | null
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
          includes_preg_check: boolean
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
          includes_preg_check?: boolean
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
          includes_preg_check?: boolean
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
      buyer_rollup: {
        Row: {
          admin_total: number | null
          barn_id: string | null
          buyer_party_id: string | null
          head_worked: number | null
          pen_work_count: number | null
          sale_day_id: string | null
          sol_total: number | null
          total_customer_charge: number | null
          vet_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pen_work_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_buyer_party_id_fkey"
            columns: ["buyer_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_rollup: {
        Row: {
          admin_total: number | null
          barn_id: string | null
          head_worked: number | null
          pen_work_count: number | null
          sale_day_id: string | null
          seller_party_id: string | null
          sol_total: number | null
          total_customer_charge: number | null
          vet_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pen_work_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_sale_day_id_fkey"
            columns: ["sale_day_id"]
            isOneToOne: false
            referencedRelation: "sale_day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_work_seller_party_id_fkey"
            columns: ["seller_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
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
