-- Ominira init migration — concatenated from models-spec.md in the order
-- its own "Full Migration" section lists. Paste this whole file into the
-- Supabase Dashboard's SQL Editor and run it once.

create extension if not exists pgcrypto;

-- ============================================================
-- public.readers
-- ============================================================
create table public.readers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  pseudonym text not null,
  city text,
  country text,
  interests jsonb not null default '[]'::jsonb,
  survey_read_material_ids jsonb not null default '[]'::jsonb,
  onboarding_status text not null default 'pending_survey'
    check (onboarding_status in ('pending_survey', 'pending_welcome', 'active')),
  current_reading jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint readers_pseudonym_unique unique (pseudonym)
);

create index readers_onboarding_status_idx on public.readers (onboarding_status);

-- ============================================================
-- public.materials
-- ============================================================
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  material_type text not null default 'book',
  title text not null,
  author text not null,
  description text,
  cover_url text,
  language text,
  published_year int,
  page_count_estimate int,
  categories jsonb not null default '[]'::jsonb,
  narrator_count int not null default 0,
  toc jsonb not null default '[]'::jsonb,
  toc_titles text not null default '',
  spine jsonb not null default '[]'::jsonb,
  json_storage_path text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(toc_titles, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'D')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_slug_unique unique (slug)
);

create index materials_status_idx on public.materials (status);
create index materials_material_type_idx on public.materials (material_type);
create index materials_search_vector_idx on public.materials using gin (search_vector);

-- ============================================================
-- public.highlights
-- ============================================================
create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.readers(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  ranges jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index highlights_reader_material_idx on public.highlights (reader_id, material_id);

-- ============================================================
-- public.notes
-- ============================================================
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.readers(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  parent_id uuid references public.notes(id) on delete cascade,
  replying_to_id uuid references public.notes(id) on delete set null,
  ranges jsonb not null,
  content_kind text not null check (content_kind in ('text', 'voice')),
  content_text text,
  content_audio_url text,
  content_audio_duration_ms int,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  reaction_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_content_shape check (
    (content_kind = 'text' and content_text is not null and content_audio_url is null)
    or
    (content_kind = 'voice' and content_audio_url is not null and content_text is null)
  )
);

create index notes_material_idx on public.notes (material_id, created_at desc);
create index notes_parent_idx on public.notes (parent_id);
create index notes_reader_idx on public.notes (reader_id);
create index notes_feed_recent_idx on public.notes (created_at desc)
  where parent_id is null and visibility = 'public';
create index notes_feed_top_idx on public.notes (reaction_count desc, created_at desc)
  where parent_id is null and visibility = 'public';

-- ============================================================
-- public.note_reactions
-- ============================================================
create table public.note_reactions (
  note_id uuid not null references public.notes(id) on delete cascade,
  reader_id uuid not null references public.readers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, reader_id)
);

-- ============================================================
-- Triggers & Functions
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger readers_touch_updated_at before update on public.readers
  for each row execute function public.touch_updated_at();
create trigger materials_touch_updated_at before update on public.materials
  for each row execute function public.touch_updated_at();
create trigger highlights_touch_updated_at before update on public.highlights
  for each row execute function public.touch_updated_at();
create trigger notes_touch_updated_at before update on public.notes
  for each row execute function public.touch_updated_at();

create or replace function public.sync_note_reaction_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.notes set reaction_count = reaction_count + 1 where id = new.note_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.notes set reaction_count = greatest(reaction_count - 1, 0) where id = old.note_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger note_reactions_sync_count
  after insert or delete on public.note_reactions
  for each row execute function public.sync_note_reaction_count();

create or replace function public.sync_reader_email()
returns trigger language plpgsql as $$
begin
  update public.readers set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger auth_users_sync_reader_email
  after update of email on auth.users
  for each row execute function public.sync_reader_email();

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.readers enable row level security;
alter table public.materials enable row level security;
alter table public.highlights enable row level security;
alter table public.notes enable row level security;
alter table public.note_reactions enable row level security;

create policy readers_select_own on public.readers
  for select using (auth.uid() = id);
create policy readers_update_own on public.readers
  for update using (auth.uid() = id);

create policy materials_select_published on public.materials
  for select using (status = 'published');

create policy highlights_select_own on public.highlights
  for select using (auth.uid() = reader_id);
create policy highlights_insert_own on public.highlights
  for insert with check (auth.uid() = reader_id);
create policy highlights_delete_own on public.highlights
  for delete using (auth.uid() = reader_id);

create policy notes_select_visible on public.notes
  for select using (visibility = 'public' or auth.uid() = reader_id);
create policy notes_insert_own on public.notes
  for insert with check (auth.uid() = reader_id);
create policy notes_update_own on public.notes
  for update using (auth.uid() = reader_id);
create policy notes_delete_own on public.notes
  for delete using (auth.uid() = reader_id);

create policy note_reactions_select_own on public.note_reactions
  for select using (auth.uid() = reader_id);
create policy note_reactions_insert_own on public.note_reactions
  for insert with check (auth.uid() = reader_id);
create policy note_reactions_delete_own on public.note_reactions
  for delete using (auth.uid() = reader_id);

-- ============================================================
-- Storage buckets (plan.md Phase 2)
-- ============================================================
-- `library` — published book JSON/covers/audio, written only by the admin
-- publish pipeline (scripts/publish-book.ts). Already referenced by
-- lib/storage/config.ts's STORAGE_BUCKET before this migration existed.
insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do nothing;

-- `voice-notes` — reader-generated voice note audio, written by any
-- authenticated reader via POST /api/community/voice-notes. Deliberately
-- separate from `library` — see models-spec.md's note on the trust boundary.
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', true)
on conflict (id) do nothing;
