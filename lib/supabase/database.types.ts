// Hand-written to match models-spec.md exactly — there's no `supabase gen types`
// step in this project (see plan.md's Phase 0 note on skipping the CLI entirely),
// so this is the one place that has to be kept in sync by hand whenever the schema
// changes. Passed as createClient<Database>()'s generic (lib/supabase/adminClient.ts)
// so every table read/write across the app is checked against real column names
// instead of silently collapsing to `never` (supabase-js's default-generic quirk).
//
// jsonb columns are typed as `Json` here, same as `supabase gen types` would do —
// callers cast to the real app-level shape (AnnotationRange[], TocSection[], etc.,
// both defined in api-spec.md) on read, and rely on structural compatibility with
// `Json` on write. Nothing here should leak into JSON API responses verbatim; that
// snake_case -> camelCase translation is the route handler's job (api-spec.md's
// Conventions).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      readers: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          pseudonym: string;
          city: string | null;
          country: string | null;
          interests: Json;
          survey_read_material_ids: Json;
          onboarding_status: "pending_survey" | "pending_welcome" | "active";
          current_reading: Json;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          pseudonym: string;
          city?: string | null;
          country?: string | null;
          interests?: Json;
          survey_read_material_ids?: Json;
          onboarding_status?: "pending_survey" | "pending_welcome" | "active";
          current_reading?: Json;
          joined_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["readers"]["Insert"]>;
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          slug: string;
          material_type: string;
          title: string;
          author: string;
          description: string | null;
          cover_url: string | null;
          language: string | null;
          published_year: number | null;
          page_count_estimate: number | null;
          categories: Json;
          narrator_count: number;
          toc: Json;
          toc_titles: string;
          spine: Json;
          json_storage_path: string;
          status: "draft" | "published";
          search_vector: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          slug: string;
          material_type?: string;
          title: string;
          author: string;
          description?: string | null;
          cover_url?: string | null;
          language?: string | null;
          published_year?: number | null;
          page_count_estimate?: number | null;
          categories?: Json;
          narrator_count?: number;
          toc?: Json;
          toc_titles?: string;
          spine?: Json;
          json_storage_path: string;
          status?: "draft" | "published";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["materials"]["Insert"]>;
        Relationships: [];
      };
      pending_materials: {
        Row: {
          id: string;
          submission_type: "upload" | "suggestion" | "external_url";
          title: string;
          author: string | null;
          reader_id: string | null;
          source_url: string | null;
          storage_path: string | null;
          original_filename: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          status: "pending" | "approved";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_type: "upload" | "suggestion" | "external_url";
          title: string;
          author?: string | null;
          reader_id?: string | null;
          source_url?: string | null;
          storage_path?: string | null;
          original_filename?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          status?: "pending" | "approved";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pending_materials"]["Insert"]>;
        Relationships: [];
      };
      highlights: {
        Row: {
          id: string;
          reader_id: string;
          material_id: string;
          ranges: Json;
        } & Timestamps;
        Insert: {
          id?: string;
          reader_id: string;
          material_id: string;
          ranges: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["highlights"]["Insert"]>;
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          reader_id: string;
          material_id: string;
          parent_id: string | null;
          replying_to_id: string | null;
          ranges: Json;
          content_kind: "text" | "voice";
          content_text: string | null;
          content_audio_url: string | null;
          content_audio_duration_ms: number | null;
          visibility: "public" | "private";
          reaction_count: number;
        } & Timestamps;
        Insert: {
          id?: string;
          reader_id: string;
          material_id: string;
          parent_id?: string | null;
          replying_to_id?: string | null;
          ranges: Json;
          content_kind: "text" | "voice";
          content_text?: string | null;
          content_audio_url?: string | null;
          content_audio_duration_ms?: number | null;
          visibility?: "public" | "private";
          reaction_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notes"]["Insert"]>;
        Relationships: [];
      };
      note_reactions: {
        Row: { note_id: string; reader_id: string; created_at: string };
        Insert: { note_id: string; reader_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["note_reactions"]["Insert"]>;
        Relationships: [];
      };
    };
    // Required by supabase-js's GenericSchema shape even though this project has
    // neither — omitting them collapses the whole schema (and every table's row
    // type) to `never` rather than erroring loudly, which is its own trap.
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
