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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          id: string
          industry: string | null
          name: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry?: string | null
          name: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      active_tasks: {
        Row: {
          agente_criador: string | null
          created_at: string
          id: string
          responsavel: string | null
          status: string | null
        }
        Insert: {
          agente_criador?: string | null
          created_at?: string
          id: string
          responsavel?: string | null
          status?: string | null
        }
        Update: {
          agente_criador?: string | null
          created_at?: string
          id?: string
          responsavel?: string | null
          status?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          type?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_notes: {
        Row: {
          created_at: string | null
          created_by_ai: boolean | null
          entity_id: string
          entity_type: string
          id: string
          note: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_ai?: boolean | null
          entity_id: string
          entity_type: string
          id?: string
          note: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_ai?: boolean | null
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_context: {
        Row: {
          created_at: string
          embedding: string | null
          historico_interacoes: string | null
          id: string
          nome_empresa: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          historico_interacoes?: string | null
          id: string
          nome_empresa?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          historico_interacoes?: string | null
          id?: string
          nome_empresa?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_intelligence: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string | null
          deleted_at: string | null
          id: string
          install_end_date: string | null
          install_start_date: string | null
          installed_by: string | null
          is_active: boolean | null
          last_maintenance_date: string | null
          lead_id: string | null
          monthly_generation_kwh: number | null
          next_maintenance_date: string | null
          system_size_kw: number | null
          total_savings_brl: number | null
          updated_at: string | null
          user_id: string | null
          utility_account: string | null
          utility_login: Json | null
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          install_end_date?: string | null
          install_start_date?: string | null
          installed_by?: string | null
          is_active?: boolean | null
          last_maintenance_date?: string | null
          lead_id?: string | null
          monthly_generation_kwh?: number | null
          next_maintenance_date?: string | null
          system_size_kw?: number | null
          total_savings_brl?: number | null
          updated_at?: string | null
          user_id?: string | null
          utility_account?: string | null
          utility_login?: Json | null
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          install_end_date?: string | null
          install_start_date?: string | null
          installed_by?: string | null
          is_active?: boolean | null
          last_maintenance_date?: string | null
          lead_id?: string | null
          monthly_generation_kwh?: number | null
          next_maintenance_date?: string | null
          system_size_kw?: number | null
          total_savings_brl?: number | null
          updated_at?: string | null
          user_id?: string | null
          utility_account?: string | null
          utility_login?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "client_intelligence_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_intelligence_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_users: {
        Row: {
          address: string | null
          auth_user_id: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          id: string
          install_date: string | null
          is_active: boolean | null
          last_login: string | null
          lead_id: string | null
          monthly_avg_kwh: number | null
          name: string
          notes: string | null
          opportunity_id: string | null
          phone: string | null
          quark_points: number | null
          referral_code: string | null
          state: string | null
          system_size_kw: number | null
          user_id: string | null
          utility_account: string | null
          utility_company: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          id?: string
          install_date?: string | null
          is_active?: boolean | null
          last_login?: string | null
          lead_id?: string | null
          monthly_avg_kwh?: number | null
          name: string
          notes?: string | null
          opportunity_id?: string | null
          phone?: string | null
          quark_points?: number | null
          referral_code?: string | null
          state?: string | null
          system_size_kw?: number | null
          user_id?: string | null
          utility_account?: string | null
          utility_company?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          install_date?: string | null
          is_active?: boolean | null
          last_login?: string | null
          lead_id?: string | null
          monthly_avg_kwh?: number | null
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          phone?: string | null
          quark_points?: number | null
          referral_code?: string | null
          state?: string | null
          system_size_kw?: number | null
          user_id?: string | null
          utility_account?: string | null
          utility_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      client_referrals: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          points_credited: boolean | null
          referred_city: string | null
          referred_name: string
          referred_phone: string
          referrer_client_id: string | null
          reward_points: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          points_credited?: boolean | null
          referred_city?: string | null
          referred_name: string
          referred_phone: string
          referrer_client_id?: string | null
          reward_points?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          points_credited?: boolean | null
          referred_city?: string | null
          referred_name?: string
          referred_phone?: string
          referrer_client_id?: string | null
          reward_points?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_referrals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signers: {
        Row: {
          cpf: string | null
          created_at: string | null
          document_id: string
          id: string
          ip: string | null
          name: string
          phone: string | null
          role: string
          signature: string | null
          signed_at: string | null
          signed_cpf: string | null
          signed_name: string | null
          token: string
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          ip?: string | null
          name: string
          phone?: string | null
          role?: string
          signature?: string | null
          signed_at?: string | null
          signed_cpf?: string | null
          signed_name?: string | null
          token: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          ip?: string | null
          name?: string
          phone?: string | null
          role?: string
          signature?: string | null
          signed_at?: string | null
          signed_cpf?: string | null
          signed_name?: string | null
          token?: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data: Json
          deleted_at: string | null
          hash: string | null
          id: string
          kind: string
          lead_id: string | null
          opportunity_id: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json
          deleted_at?: string | null
          hash?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          opportunity_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json
          deleted_at?: string | null
          hash?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          opportunity_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_products: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          delivery_days: number | null
          description: string | null
          id: string
          image_url: string | null
          includes_installation: boolean | null
          is_active: boolean | null
          name: string
          overload_percentage: number | null
          price: number
          promo_price: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_days?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          includes_installation?: boolean | null
          is_active?: boolean | null
          name: string
          overload_percentage?: number | null
          price: number
          promo_price?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_days?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          includes_installation?: boolean | null
          is_active?: boolean | null
          name?: string
          overload_percentage?: number | null
          price?: number
          promo_price?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      evolution_connections: {
        Row: {
          created_at: string
          id: string
          instance: string
          state: string | null
          status_reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instance: string
          state?: string | null
          status_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instance?: string
          state?: string | null
          status_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evolution_messages: {
        Row: {
          body: string
          contact_id: string
          from_me: boolean | null
          id: string
          message_type: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          contact_id: string
          from_me?: boolean | null
          id?: string
          message_type?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          contact_id?: string
          from_me?: boolean | null
          id?: string
          message_type?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string
          created_at: string | null
          date: string
          deleted_at: string | null
          description: string
          id: string
          note: string | null
          opportunity_id: string | null
          payment_method: string | null
          proposal_id: string | null
          status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category: string
          created_at?: string | null
          date: string
          deleted_at?: string | null
          description: string
          id?: string
          note?: string | null
          opportunity_id?: string | null
          payment_method?: string | null
          proposal_id?: string | null
          status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          description?: string
          id?: string
          note?: string | null
          opportunity_id?: string | null
          payment_method?: string | null
          proposal_id?: string | null
          status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_financial_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_campaigns: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          keyword: string
          name: string
          reply_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword: string
          name: string
          reply_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          name?: string
          reply_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_logs: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          status: string
          username: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status: string
          username: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "instagram_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_leads: {
        Row: {
          city: string | null
          consumption: string | null
          created_at: string | null
          email: string | null
          form_type: string | null
          id: string
          name: string | null
          payment_method: string | null
          phone: string | null
        }
        Insert: {
          city?: string | null
          consumption?: string | null
          created_at?: string | null
          email?: string | null
          form_type?: string | null
          id?: string
          name?: string | null
          payment_method?: string | null
          phone?: string | null
        }
        Update: {
          city?: string | null
          consumption?: string | null
          created_at?: string | null
          email?: string | null
          form_type?: string | null
          id?: string
          name?: string | null
          payment_method?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      lead_pipelines: {
        Row: {
          id: string
          lead_id: string
          pipeline_id: string
          stage: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          pipeline_id: string
          stage?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          pipeline_id?: string
          stage?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_pipelines_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipelines_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipelines_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
          user_id: string | null
        }
        Insert: {
          lead_id: string
          tag_id: string
          user_id?: string | null
        }
        Update: {
          lead_id?: string
          tag_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_tags_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          data: Json
          deleted_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          deleted_at?: string | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          deleted_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      maintenance_alerts: {
        Row: {
          alert_type: string | null
          channel: string | null
          created_at: string | null
          error_reason: string | null
          id: string
          intelligence_id: string | null
          message: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          alert_type?: string | null
          channel?: string | null
          created_at?: string | null
          error_reason?: string | null
          id?: string
          intelligence_id?: string | null
          message?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string | null
          channel?: string | null
          created_at?: string | null
          error_reason?: string | null
          id?: string
          intelligence_id?: string | null
          message?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_alerts_intelligence_id_fkey"
            columns: ["intelligence_id"]
            isOneToOne: false
            referencedRelation: "client_intelligence"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_services: {
        Row: {
          after_photos: Json | null
          before_photos: Json | null
          client_id: string | null
          completed_date: string | null
          cost: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          opportunity_id: string | null
          price: number | null
          scheduled_date: string | null
          service_type: string | null
          status: string | null
          technician: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          after_photos?: Json | null
          before_photos?: Json | null
          client_id?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          price?: number | null
          scheduled_date?: string | null
          service_type?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          after_photos?: Json | null
          before_photos?: Json | null
          client_id?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          price?: number | null
          scheduled_date?: string | null
          service_type?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          address: string | null
          amount: number | null
          avg_bill: number | null
          birth_date: string | null
          city: string | null
          connection_type: string | null
          consumption_kwh: number | null
          cpf_cnpj: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          installation_date: string | null
          latitude: number | null
          longitude: number | null
          loss_reason: string | null
          next_action_date: string | null
          next_action_text: string | null
          notes: string | null
          phone: string | null
          roof_type: string | null
          segment: string | null
          services: string[] | null
          source: string | null
          status: string | null
          system_power: number | null
          tariff: number | null
          temperature: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          amount?: number | null
          avg_bill?: number | null
          birth_date?: string | null
          city?: string | null
          connection_type?: string | null
          consumption_kwh?: number | null
          cpf_cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          installation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          loss_reason?: string | null
          next_action_date?: string | null
          next_action_text?: string | null
          notes?: string | null
          phone?: string | null
          roof_type?: string | null
          segment?: string | null
          services?: string[] | null
          source?: string | null
          status?: string | null
          system_power?: number | null
          tariff?: number | null
          temperature?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          amount?: number | null
          avg_bill?: number | null
          birth_date?: string | null
          city?: string | null
          connection_type?: string | null
          consumption_kwh?: number | null
          cpf_cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          installation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          loss_reason?: string | null
          next_action_date?: string | null
          next_action_text?: string | null
          notes?: string | null
          phone?: string | null
          roof_type?: string | null
          segment?: string | null
          services?: string[] | null
          source?: string | null
          status?: string | null
          system_power?: number | null
          tariff?: number | null
          temperature?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      opportunity_tasks: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          opportunity_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          opportunity_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          opportunity_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          stages: Json
          type: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          stages?: Json
          type?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          stages?: Json
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          data: Json
          deleted_at: string | null
          description: string | null
          id: string
          image: string | null
          name: string | null
          power: number | null
          power_unit: string | null
          price: number | null
          stock: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          data: Json
          deleted_at?: string | null
          description?: string | null
          id: string
          image?: string | null
          name?: string | null
          power?: number | null
          power_unit?: string | null
          price?: number | null
          stock?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json
          deleted_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          name?: string | null
          power?: number | null
          power_unit?: string | null
          price?: number | null
          stock?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_initials: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_initials?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_initials?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_tracking: {
        Row: {
          client_id: string | null
          completed_at: string | null
          deleted_at: string | null
          id: string
          is_current: boolean | null
          notes: string | null
          opportunity_id: string | null
          phase: string
          phase_label: string
          project_id: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          phase: string
          phase_label: string
          project_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          deleted_at?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          phase?: string
          phase_label?: string
          project_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tracking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tracking_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tracking_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          data: Json
          deleted_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          deleted_at?: string | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          deleted_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      proposal_versions: {
        Row: {
          blocks: Json | null
          city: string | null
          client_name: string | null
          created_at: string | null
          data: Json
          final_price: number | null
          id: string
          proposal_id: string | null
          system_size_kw: number | null
          theme: Json | null
          user_id: string | null
          version: number
        }
        Insert: {
          blocks?: Json | null
          city?: string | null
          client_name?: string | null
          created_at?: string | null
          data?: Json
          final_price?: number | null
          id?: string
          proposal_id?: string | null
          system_size_kw?: number | null
          theme?: Json | null
          user_id?: string | null
          version: number
        }
        Update: {
          blocks?: Json | null
          city?: string | null
          client_name?: string | null
          created_at?: string | null
          data?: Json
          final_price?: number | null
          id?: string
          proposal_id?: string | null
          system_size_kw?: number | null
          theme?: Json | null
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_views: {
        Row: {
          device: string | null
          duration_seconds: number | null
          id: string
          internal: boolean | null
          last_seen_at: string
          proposal_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          device?: string | null
          duration_seconds?: number | null
          id?: string
          internal?: boolean | null
          last_seen_at?: string
          proposal_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          device?: string | null
          duration_seconds?: number | null
          id?: string
          internal?: boolean | null
          last_seen_at?: string
          proposal_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          address: string | null
          blocks: Json | null
          city: string | null
          client_name: string | null
          commission_value: number | null
          cpf_cnpj: string | null
          created_at: string | null
          created_by: string | null
          data: Json | null
          deleted_at: string | null
          direct_cost: number | null
          email: string | null
          final_price: number | null
          id: string
          inputs: Json | null
          installation_cost: number | null
          lead_id: string | null
          monthly_generation: number | null
          number: number
          opportunity_id: string | null
          pdf_url: string | null
          phone: string | null
          power_kwp: number | null
          profit_value: number | null
          public_token: string
          roof_type: string | null
          sent_at: string | null
          state: string | null
          status: string | null
          system_size_kw: number | null
          tax_value: number | null
          theme: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          valid_until: string | null
          version: number | null
          view_count: number | null
          viewed_at: string | null
          views: Json | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          address?: string | null
          blocks?: Json | null
          city?: string | null
          client_name?: string | null
          commission_value?: number | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          deleted_at?: string | null
          direct_cost?: number | null
          email?: string | null
          final_price?: number | null
          id?: string
          inputs?: Json | null
          installation_cost?: number | null
          lead_id?: string | null
          monthly_generation?: number | null
          number?: number
          opportunity_id?: string | null
          pdf_url?: string | null
          phone?: string | null
          power_kwp?: number | null
          profit_value?: number | null
          public_token?: string
          roof_type?: string | null
          sent_at?: string | null
          state?: string | null
          status?: string | null
          system_size_kw?: number | null
          tax_value?: number | null
          theme?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
          version?: number | null
          view_count?: number | null
          viewed_at?: string | null
          views?: Json | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          address?: string | null
          blocks?: Json | null
          city?: string | null
          client_name?: string | null
          commission_value?: number | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          deleted_at?: string | null
          direct_cost?: number | null
          email?: string | null
          final_price?: number | null
          id?: string
          inputs?: Json | null
          installation_cost?: number | null
          lead_id?: string | null
          monthly_generation?: number | null
          number?: number
          opportunity_id?: string | null
          pdf_url?: string | null
          phone?: string | null
          power_kwp?: number | null
          profit_value?: number | null
          public_token?: string
          roof_type?: string | null
          sent_at?: string | null
          state?: string | null
          status?: string | null
          system_size_kw?: number | null
          tax_value?: number | null
          theme?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
          version?: number | null
          view_count?: number | null
          viewed_at?: string | null
          views?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      quark_points_redemptions: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          points_spent: number
          reward_id: string
          reward_title: string
          scheduled_date: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          points_spent: number
          reward_id: string
          reward_title: string
          scheduled_date?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          points_spent?: number
          reward_id?: string
          reward_title?: string
          scheduled_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quark_points_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      quark_points_transactions: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string
          id: string
          points: number
          reference_id: string | null
          type: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          points: number
          reference_id?: string | null
          type?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          points?: number
          reference_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quark_points_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          data: Json
          id: number
        }
        Insert: {
          data?: Json
          id?: number
        }
        Update: {
          data?: Json
          id?: number
        }
        Relationships: []
      }
      solar_kits: {
        Row: {
          created_at: string | null
          id: string
          inverter_brand: string | null
          inverter_count: number | null
          inverter_image_url: string | null
          inverter_size_kw: number
          margin_percentage: number | null
          module_brand: string | null
          module_image_url: string | null
          module_power: number | null
          modules_count: number
          name: string
          price: number
          system_size_kw: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inverter_brand?: string | null
          inverter_count?: number | null
          inverter_image_url?: string | null
          inverter_size_kw: number
          margin_percentage?: number | null
          module_brand?: string | null
          module_image_url?: string | null
          module_power?: number | null
          modules_count: number
          name: string
          price: number
          system_size_kw: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inverter_brand?: string | null
          inverter_count?: number | null
          inverter_image_url?: string | null
          inverter_size_kw?: number
          margin_percentage?: number | null
          module_brand?: string | null
          module_image_url?: string | null
          module_power?: number | null
          modules_count?: number
          name?: string
          price?: number
          system_size_kw?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          client_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          opportunity_id: string | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          opportunity_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          opportunity_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          completed: boolean | null
          created_at: string | null
          data: Json
          deadline: string | null
          deleted_at: string | null
          id: string
          priority: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assignee?: string | null
          completed?: boolean | null
          created_at?: string | null
          data: Json
          deadline?: string | null
          deleted_at?: string | null
          id: string
          priority?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assignee?: string | null
          completed?: boolean | null
          created_at?: string | null
          data?: Json
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          priority?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          message: string
          sender_id: string | null
          sender_type: string | null
          ticket_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message: string
          sender_id?: string | null
          sender_type?: string | null
          ticket_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          sender_id?: string | null
          sender_type?: string | null
          ticket_id?: string | null
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
      tool_documents: {
        Row: {
          created_at: string
          data: Json
          deleted_at: string | null
          id: string
          kind: string
          number: string | null
          opportunity_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          deleted_at?: string | null
          id?: string
          kind: string
          number?: string | null
          opportunity_id?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          deleted_at?: string | null
          id?: string
          kind?: string
          number?: string | null
          opportunity_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_daily: {
        Row: {
          day: string
          last_ping: string | null
          minutes: number
          user_id: string
        }
        Insert: {
          day: string
          last_ping?: string | null
          minutes?: number
          user_id: string
        }
        Update: {
          day?: string
          last_ping?: string | null
          minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_invoices: {
        Row: {
          amount_brl: number | null
          captured_at: string | null
          consumption_kwh: number | null
          generation_kwh: number | null
          id: string
          intelligence_id: string | null
          month_ref: string
          pdf_url: string | null
          savings_brl: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount_brl?: number | null
          captured_at?: string | null
          consumption_kwh?: number | null
          generation_kwh?: number | null
          id?: string
          intelligence_id?: string | null
          month_ref: string
          pdf_url?: string | null
          savings_brl?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount_brl?: number | null
          captured_at?: string | null
          consumption_kwh?: number | null
          generation_kwh?: number | null
          id?: string
          intelligence_id?: string | null
          month_ref?: string
          pdf_url?: string | null
          savings_brl?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_invoices_intelligence_id_fkey"
            columns: ["intelligence_id"]
            isOneToOne: false
            referencedRelation: "client_intelligence"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string
          chat_id: string | null
          chat_name: string | null
          created_at: string | null
          from_me: boolean
          from_user: string
          id: string
          is_group: boolean
          status: string | null
          timestamp: number
          to_user: string
          user_id: string | null
        }
        Insert: {
          body: string
          chat_id?: string | null
          chat_name?: string | null
          created_at?: string | null
          from_me?: boolean
          from_user: string
          id?: string
          is_group?: boolean
          status?: string | null
          timestamp: number
          to_user: string
          user_id?: string | null
        }
        Update: {
          body?: string
          chat_id?: string | null
          chat_name?: string | null
          created_at?: string | null
          from_me?: boolean
          from_user?: string
          id?: string
          is_group?: boolean
          status?: string | null
          timestamp?: number
          to_user?: string
          user_id?: string | null
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          id: number
          kind: string
          lead_id: string | null
          points: number
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          lead_id?: string | null
          points: number
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          lead_id?: string | null
          points?: number
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_public_proposal: {
        Args: { p_name: string; p_token: string }
        Returns: Json
      }
      award_xp: {
        Args: {
          p_kind: string
          p_lead?: string
          p_points: number
          p_ref: string
          p_user: string
        }
        Returns: undefined
      }
      check_cpf_exists: { Args: { p_cpf: string }; Returns: Json }
      create_crm_lead: { Args: { p: Json }; Returns: Json }
      create_public_lead: { Args: { p: Json }; Returns: Json }
      create_tenant_policy: { Args: { table_name: string }; Returns: undefined }
      credit_referral_points: {
        Args: { p_referral_id: string }
        Returns: boolean
      }
      get_client_profile_id: { Args: never; Returns: string }
      get_financial_dre_summary: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: Json
      }
      get_public_company: { Args: never; Returns: Json }
      get_public_document: { Args: { p_token: string }; Returns: Json }
      get_public_proposal: { Args: { p_token: string }; Returns: Json }
      get_webhook_url: { Args: never; Returns: string }
      is_member: { Args: never; Returns: boolean }
      leaderboard: {
        Args: { p_from?: string }
        Returns: {
          active_days: number
          email: string
          followups: number
          full_name: string
          leads: number
          minutes: number
          proposals: number
          role: string
          sales: number
          sent: number
          total_xp: number
          user_id: string
          xp: number
        }[]
      }
      link_client_portal_user: {
        Args: {
          p_auth_id: string
          p_cpf: string
          p_email: string
          p_name: string
        }
        Returns: boolean
      }
      ping_proposal_view: {
        Args: { p_seconds: number; p_view: string }
        Returns: undefined
      }
      redeem_quark_points: {
        Args: {
          p_client_id: string
          p_notes?: string
          p_points_spent: number
          p_reward_id: string
          p_reward_title: string
        }
        Returns: Json
      }
      register_proposal_view: {
        Args: {
          p_device: string
          p_internal: boolean
          p_referrer: string
          p_session: string
          p_token: string
          p_user_agent: string
        }
        Returns: string
      }
      sign_public_document: {
        Args: {
          p_cpf: string
          p_ip?: string
          p_name: string
          p_signature: string
          p_token: string
          p_ua?: string
        }
        Returns: Json
      }
      track_proposal_view: { Args: { p_token: string }; Returns: Json }
      track_usage: { Args: never; Returns: number }
      view_public_document: { Args: { p_token: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
