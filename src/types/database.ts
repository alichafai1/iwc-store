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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_processing_jobs: {
        Row: {
          collection_keywords: Json
          collection_name: string | null
          collection_url: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_products: number
          id: string
          keywords_evaluated: number
          processed_products: number
          scrape_job_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["ai_processing_status"]
          total_products: number
          updated_at: string
        }
        Insert: {
          collection_keywords?: Json
          collection_name?: string | null
          collection_url: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_products?: number
          id?: string
          keywords_evaluated?: number
          processed_products?: number
          scrape_job_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_processing_status"]
          total_products?: number
          updated_at?: string
        }
        Update: {
          collection_keywords?: Json
          collection_name?: string | null
          collection_url?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_products?: number
          id?: string
          keywords_evaluated?: number
          processed_products?: number
          scrape_job_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_processing_status"]
          total_products?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_processing_jobs_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: true
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_product_runs: {
        Row: {
          attempts: number
          completed_at: string | null
          coverage_percent: number | null
          created_at: string
          error_message: string | null
          final_output: Json
          id: string
          primary_keyword: string | null
          processing_job_id: string
          product_id: string | null
          raw_product_id: string
          selected_keywords: Json
          status: Database["public"]["Enums"]["ai_product_run_status"]
          unused_relevant_keywords: Json
          used_keywords: Json
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          coverage_percent?: number | null
          created_at?: string
          error_message?: string | null
          final_output?: Json
          id?: string
          primary_keyword?: string | null
          processing_job_id: string
          product_id?: string | null
          raw_product_id: string
          selected_keywords?: Json
          status?: Database["public"]["Enums"]["ai_product_run_status"]
          unused_relevant_keywords?: Json
          used_keywords?: Json
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          coverage_percent?: number | null
          created_at?: string
          error_message?: string | null
          final_output?: Json
          id?: string
          primary_keyword?: string | null
          processing_job_id?: string
          product_id?: string | null
          raw_product_id?: string
          selected_keywords?: Json
          status?: Database["public"]["Enums"]["ai_product_run_status"]
          unused_relevant_keywords?: Json
          used_keywords?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_product_runs_processing_job_id_fkey"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "ai_processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_product_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_product_runs_raw_product_id_fkey"
            columns: ["raw_product_id"]
            isOneToOne: false
            referencedRelation: "raw_products"
            referencedColumns: ["id"]
          },
        ]
      }
      article_faqs: {
        Row: {
          answer: string
          article_id: string
          id: string
          position: number
          question: string
        }
        Insert: {
          answer: string
          article_id: string
          id?: string
          position?: number
          question: string
        }
        Update: {
          answer?: string
          article_id?: string
          id?: string
          position?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_faqs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_products: {
        Row: {
          article_id: string
          id: string
          position: number
          product_id: string
          section_label: string | null
        }
        Insert: {
          article_id: string
          id?: string
          position?: number
          product_id: string
          section_label?: string | null
        }
        Update: {
          article_id?: string
          id?: string
          position?: number
          product_id?: string
          section_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_products_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      article_relations: {
        Row: {
          article_id: string
          id: string
          position: number
          related_article_id: string
        }
        Insert: {
          article_id: string
          id?: string
          position?: number
          related_article_id: string
        }
        Update: {
          article_id?: string
          id?: string
          position?: number
          related_article_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_relations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_relations_related_article_id_fkey"
            columns: ["related_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category: string | null
          content: Json
          created_at: string
          featured: boolean
          hero_image_alt: string | null
          hero_image_path: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          title: string
          type: Database["public"]["Enums"]["article_type"]
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category?: string | null
          content?: Json
          created_at?: string
          featured?: boolean
          hero_image_alt?: string | null
          hero_image_path?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title: string
          type: Database["public"]["Enums"]["article_type"]
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category?: string | null
          content?: Json
          created_at?: string
          featured?: boolean
          hero_image_alt?: string | null
          hero_image_path?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title?: string
          type?: Database["public"]["Enums"]["article_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          image_alt: string | null
          image_path: string | null
          instagram_url: string | null
          linkedin_url: string | null
          name: string
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      collection_comparisons: {
        Row: {
          body: string | null
          collection_id: string
          compared_collection_id: string
          position: number
        }
        Insert: {
          body?: string | null
          collection_id: string
          compared_collection_id: string
          position?: number
        }
        Update: {
          body?: string | null
          collection_id?: string
          compared_collection_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_comparisons_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_comparisons_compared_collection_id_fkey"
            columns: ["compared_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_faqs: {
        Row: {
          answer: string
          collection_id: string
          created_at: string
          id: string
          position: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          collection_id: string
          created_at?: string
          id?: string
          position?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          collection_id?: string
          created_at?: string
          id?: string
          position?: number
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_faqs_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_features: {
        Row: {
          collection_id: string
          created_at: string
          feature_text: string
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          feature_text: string
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          feature_text?: string
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_features_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_internal_links: {
        Row: {
          collection_id: string
          created_at: string
          href: string
          id: string
          label: string
          position: number
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          href: string
          id?: string
          label: string
          position?: number
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          href?: string
          id?: string
          label?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_internal_links_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_keywords: {
        Row: {
          collection_id: string
          created_at: string
          keyword_id: string
          position: number
          role: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          keyword_id: string
          position?: number
          role?: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          keyword_id?: string
          position?: number
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_keywords_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_popular_models: {
        Row: {
          collection_id: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          position?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_popular_models_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_popular_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_related_collections: {
        Row: {
          anchor_text: string | null
          collection_id: string
          context: string | null
          position: number
          related_collection_id: string
        }
        Insert: {
          anchor_text?: string | null
          collection_id: string
          context?: string | null
          position?: number
          related_collection_id: string
        }
        Update: {
          anchor_text?: string | null
          collection_id?: string
          context?: string | null
          position?: number
          related_collection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_related_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_related_collections_related_collection_id_fkey"
            columns: ["related_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          about_content: string | null
          buying_guide_content: string | null
          comparison_content: string | null
          created_at: string
          description: string | null
          faq_heading: string | null
          featured: boolean
          h1: string | null
          history_content: string | null
          id: string
          image_alt: string | null
          image_path: string | null
          meta_description: string | null
          meta_title: string | null
          models_guide_content: string | null
          models_guide_heading: string | null
          name: string
          overview_content: string | null
          published_at: string | null
          related_intro: string | null
          seo_content: string | null
          seo_intro: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          why_choose_content: string | null
          why_choose_heading: string | null
        }
        Insert: {
          about_content?: string | null
          buying_guide_content?: string | null
          comparison_content?: string | null
          created_at?: string
          description?: string | null
          faq_heading?: string | null
          featured?: boolean
          h1?: string | null
          history_content?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          meta_description?: string | null
          meta_title?: string | null
          models_guide_content?: string | null
          models_guide_heading?: string | null
          name: string
          overview_content?: string | null
          published_at?: string | null
          related_intro?: string | null
          seo_content?: string | null
          seo_intro?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          why_choose_content?: string | null
          why_choose_heading?: string | null
        }
        Update: {
          about_content?: string | null
          buying_guide_content?: string | null
          comparison_content?: string | null
          created_at?: string
          description?: string | null
          faq_heading?: string | null
          featured?: boolean
          h1?: string | null
          history_content?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          meta_description?: string | null
          meta_title?: string | null
          models_guide_content?: string | null
          models_guide_heading?: string | null
          name?: string
          overview_content?: string | null
          published_at?: string | null
          related_intro?: string | null
          seo_content?: string | null
          seo_intro?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          why_choose_content?: string | null
          why_choose_heading?: string | null
        }
        Relationships: []
      }
      customer_review_screenshots: {
        Row: {
          alt: string
          created_at: string
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      keyword_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          duplicate_rows: number
          file_name: string
          file_type: string
          id: string
          imported_rows: number
          status: string
          total_rows: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_rows?: number
          file_name: string
          file_type: string
          id?: string
          imported_rows?: number
          status?: string
          total_rows?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_rows?: number
          file_name?: string
          file_type?: string
          id?: string
          imported_rows?: number
          status?: string
          total_rows?: number
        }
        Relationships: []
      }
      keywords: {
        Row: {
          cpc: number | null
          created_at: string
          id: string
          intent: string | null
          keyword: string
          keyword_difficulty: number | null
          normalized_keyword: string | null
          position: number | null
          raw_metrics: Json
          search_volume: number | null
          source_import_id: string | null
          updated_at: string
        }
        Insert: {
          cpc?: number | null
          created_at?: string
          id?: string
          intent?: string | null
          keyword: string
          keyword_difficulty?: number | null
          normalized_keyword?: string | null
          position?: number | null
          raw_metrics?: Json
          search_volume?: number | null
          source_import_id?: string | null
          updated_at?: string
        }
        Update: {
          cpc?: number | null
          created_at?: string
          id?: string
          intent?: string | null
          keyword?: string
          keyword_difficulty?: number | null
          normalized_keyword?: string | null
          position?: number | null
          raw_metrics?: Json
          search_volume?: number | null
          source_import_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keywords_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "keyword_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          collection_id: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          position?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          product_id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          position?: number
          product_id: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_features: {
        Row: {
          created_at: string
          feature_text: string
          id: string
          position: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_text: string
          id?: string
          position?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_text?: string
          id?: string
          position?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          position: number
          product_id: string
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          product_id: string
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          product_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_qualities: {
        Row: {
          compare_at_price: number | null
          created_at: string
          id: string
          price: number | null
          product_id: string
          quality: string
          updated_at: string
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          price?: number | null
          product_id: string
          quality: string
          updated_at?: string
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          price?: number | null
          product_id?: string
          quality?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_qualities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          position: number
          product_id: string
          rating: number
          review_date: string
          review_text: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          position?: number
          product_id: string
          rating: number
          review_date: string
          review_text: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          position?: number
          product_id?: string
          rating?: number
          review_date?: string
          review_text?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specs: {
        Row: {
          id: string
          label: string
          position: number
          product_id: string
          value: string
        }
        Insert: {
          id?: string
          label: string
          position?: number
          product_id: string
          value: string
        }
        Update: {
          id?: string
          label?: string
          position?: number
          product_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          about_heading: string | null
          best_seller: boolean
          canonical_url: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          meta_description: string | null
          meta_title: string | null
          primary_collection_id: string | null
          published_at: string | null
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          about_heading?: string | null
          best_seller?: boolean
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          primary_collection_id?: string | null
          published_at?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          about_heading?: string | null
          best_seller?: boolean
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          primary_collection_id?: string | null
          published_at?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_primary_collection_id_fkey"
            columns: ["primary_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_products: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          processed_product_id: string | null
          raw_data: Json
          scrape_job_id: string | null
          scrape_status: Database["public"]["Enums"]["scrape_status"]
          scraped_at: string | null
          source_additional_information: Json
          source_brand: string | null
          source_breadcrumbs: Json
          source_category: string | null
          source_collection_name: string | null
          source_collection_url: string | null
          source_currency: string | null
          source_description: string | null
          source_domain: string | null
          source_features: Json
          source_model: string | null
          source_price: number | null
          source_primary_specs: Json
          source_specifications: Json
          source_title: string | null
          source_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          processed_product_id?: string | null
          raw_data?: Json
          scrape_job_id?: string | null
          scrape_status?: Database["public"]["Enums"]["scrape_status"]
          scraped_at?: string | null
          source_additional_information?: Json
          source_brand?: string | null
          source_breadcrumbs?: Json
          source_category?: string | null
          source_collection_name?: string | null
          source_collection_url?: string | null
          source_currency?: string | null
          source_description?: string | null
          source_domain?: string | null
          source_features?: Json
          source_model?: string | null
          source_price?: number | null
          source_primary_specs?: Json
          source_specifications?: Json
          source_title?: string | null
          source_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          processed_product_id?: string | null
          raw_data?: Json
          scrape_job_id?: string | null
          scrape_status?: Database["public"]["Enums"]["scrape_status"]
          scraped_at?: string | null
          source_additional_information?: Json
          source_brand?: string | null
          source_breadcrumbs?: Json
          source_category?: string | null
          source_collection_name?: string | null
          source_collection_url?: string | null
          source_currency?: string | null
          source_description?: string | null
          source_domain?: string | null
          source_features?: Json
          source_model?: string | null
          source_price?: number | null
          source_primary_specs?: Json
          source_specifications?: Json
          source_title?: string | null
          source_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_products_processed_product_id_fkey"
            columns: ["processed_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_products_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_status: Database["public"]["Enums"]["scrape_job_status"]
          products_completed: number
          products_discovered: number
          products_failed: number
          source_collection_name: string | null
          source_collection_url: string
          source_domain: string | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["scrape_job_status"]
          products_completed?: number
          products_discovered?: number
          products_failed?: number
          source_collection_name?: string | null
          source_collection_url: string
          source_domain?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["scrape_job_status"]
          products_completed?: number
          products_discovered?: number
          products_failed?: number
          source_collection_name?: string | null
          source_collection_url?: string
          source_domain?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_images: {
        Row: {
          alt: string
          created_at: string
          height: number | null
          id: string
          slot: string
          status: Database["public"]["Enums"]["content_status"]
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt: string
          created_at?: string
          height?: number | null
          id?: string
          slot: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number | null
          id?: string
          slot?: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      normalize_keyword: { Args: { value: string }; Returns: string }
      upsert_global_keyword: {
        Args: {
          p_cpc?: number
          p_intent?: string
          p_keyword: string
          p_keyword_difficulty?: number
          p_position?: number
          p_raw_metrics?: Json
          p_search_volume?: number
          p_source_import_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      ai_processing_status:
        | "pending"
        | "processing"
        | "completed"
        | "completed_with_errors"
        | "failed"
      ai_product_run_status: "pending" | "processing" | "completed" | "failed"
      article_type: "blog" | "guide"
      content_status: "draft" | "review" | "published" | "archived"
      scrape_job_status: "pending" | "running" | "completed" | "failed"
      scrape_status: "pending" | "scraped" | "failed" | "processed"
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
      ai_processing_status: [
        "pending",
        "processing",
        "completed",
        "completed_with_errors",
        "failed",
      ],
      ai_product_run_status: ["pending", "processing", "completed", "failed"],
      article_type: ["blog", "guide"],
      content_status: ["draft", "review", "published", "archived"],
      scrape_job_status: ["pending", "running", "completed", "failed"],
      scrape_status: ["pending", "scraped", "failed", "processed"],
    },
  },
} as const
