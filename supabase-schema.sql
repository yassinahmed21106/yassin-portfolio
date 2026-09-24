-- Yassin Ahmed Portfolio — Supabase schema
-- Run this once in the Supabase SQL editor for your project.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text not null default '',
  section      text not null default 'branding' check (section in ('branding', 'social')),
  description  text not null default '',
  cover_image  text,
  images       jsonb not null default '[]'::jsonb,
  project_url  text,
  year         text,
  tags         text[] not null default '{}',
  slug         text not null unique,
  published    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists projects_published_order_idx
  on public.projects (published, section, sort_order);

-- Keep updated_at current on every edit.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

-- Admin allowlist — edit emails ONLY in this function.
-- Frontend ADMIN_EMAILS in admin/admin.js must match.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower((auth.jwt() ->> 'email')) = any (array[
      lower('yassinahmed21106@gmail.com')
    ]),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Anyone can read published projects.
drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
  on public.projects for select
  to anon, authenticated
  using (published = true);

-- Allowlisted admin can see everything, including drafts.
drop policy if exists "Admin can read all projects" on public.projects;
create policy "Admin can read all projects"
  on public.projects for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admin can insert projects" on public.projects;
create policy "Admin can insert projects"
  on public.projects for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admin can update projects" on public.projects;
create policy "Admin can update projects"
  on public.projects for update
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin can delete projects" on public.projects;
create policy "Admin can delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------
-- Storage: a public bucket for project images.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view project images" on storage.objects;
create policy "Public can view project images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-images');

drop policy if exists "Admin can upload project images" on storage.objects;
create policy "Admin can upload project images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "Admin can update project images" on storage.objects;
create policy "Admin can update project images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "Admin can delete project images" on storage.objects;
create policy "Admin can delete project images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

-- ---------------------------------------------------------------
-- Seed: migrate the existing hardcoded projects so nothing is lost.
-- Cover images point at the asset files already shipped in /assets —
-- no re-upload needed. Add real Supabase Storage images later from
-- the admin dashboard whenever you want to replace them.
-- ---------------------------------------------------------------
insert into public.projects
  (title, category, section, description, cover_image, images, project_url, year, tags, slug, published, sort_order)
values
  ('Shefaa Clinic', 'Brand Identity', 'branding',
   'A complete visual identity built around trust, care, accessibility, and a warm healthcare experience.',
   '/assets/covers/shefaa-clinic.jpg', '[]'::jsonb,
   'https://www.behance.net/gallery/255041039/Shefaa-Clinic-Brand-Identity', '', '{}', 'shefaa-clinic', true, 0),

  ('High Level Center', 'Brand Identity', 'branding',
   'A visual identity system created for an educational brand with a clear, structured, and approachable visual language.',
   '/assets/covers/high-level-center.jpg', '[]'::jsonb,
   'https://www.behance.net/gallery/207929043/High-Level-Center-Brand-Identity', '', '{}', 'high-level-center', true, 1),

  ('Brave Store', 'Brand Identity', 'branding',
   'A bold identity designed for a modern retail brand, combining strong typography, visual consistency, and a distinctive personality.',
   '/assets/covers/brave-store.jpg', '[]'::jsonb,
   'https://www.behance.net/gallery/204635207/Brand-Identity-For-Brave-Store', '', '{}', 'brave-store', true, 2),

  ('Nokia', 'Brand Concept / Personal Project', 'branding',
   'An experimental brand identity concept exploring how a familiar technology brand could be reinterpreted through a contemporary visual system.',
   '/assets/covers/nokia.jpg', '[]'::jsonb,
   'https://www.behance.net/gallery/172268101/Brand-Identity-For-Nokia', '', '{}', 'nokia', true, 3),

  ('Orvix Marketing Agency', 'Social Media Design', 'social',
   'Social media content and campaign visuals developed for Orvix''s client roster with a consistent, agency-grade visual language.',
   null, '[]'::jsonb, null, '', '{}', 'orvix', true, 0),

  ('Meow & Woof', 'Social Media Design', 'social',
   'Playful, brand-consistent social content for a pet-care brand, built around a warm and approachable visual identity.',
   null, '[]'::jsonb, null, '', '{}', 'meow-woof', true, 1),

  ('Suzy Kitchen', 'Social Media Design', 'social',
   'Food and recipe-led social content designed for clarity, appetite appeal, and consistent visual rhythm.',
   null, '[]'::jsonb, null, '', '{}', 'suzy-kitchen', true, 2),

  ('Perfect Bite', 'Social Media Design', 'social',
   'Promotional and everyday content for a food brand, balancing product focus with a clean editorial feed.',
   null, '[]'::jsonb, null, '', '{}', 'perfect-bite', true, 3)
on conflict (slug) do nothing;

-- =================================================================
-- PHASE 1 — CMS: sections, media library, project extensions
-- =================================================================

-- Projects no longer restricted to a hardcoded enum — the Sections
-- builder can introduce new project groups later.
alter table public.projects drop constraint if exists projects_section_check;
alter table public.projects add column if not exists videos jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------
-- Media Library — every uploaded file (image or video), reusable
-- across sections and projects. One upload system, one table.
-- ---------------------------------------------------------------
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,
  storage_path  text not null,
  media_type    text not null check (media_type in ('image', 'video')),
  filename      text not null default '',
  created_at    timestamptz not null default now()
);

alter table public.media enable row level security;

drop policy if exists "Public can read media" on public.media;
create policy "Public can read media"
  on public.media for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can write media" on public.media;
create policy "Admin can write media"
  on public.media for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- Sections — the flexible Section Builder. Rows with a non-null
-- `key` are the site's existing built-in sections (hero, about,
-- skills, work, experience, services, philosophy, direction,
-- contact) — seeded below so their visibility/title/subtitle can
-- be managed from the CMS without touching their frontend markup.
-- Rows with `key` null are brand-new sections created in the admin.
-- ---------------------------------------------------------------
create table if not exists public.sections (
  id           uuid primary key default gen_random_uuid(),
  key          text unique,
  type         text not null default 'text'
               check (type in ('built-in', 'text', 'image', 'video', 'gallery', 'mixed')),
  title        text,
  subtitle     text,
  content      text,
  link_label   text,
  link_url     text,
  settings     jsonb not null default '{}'::jsonb,
  visible      boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

alter table public.sections enable row level security;

drop policy if exists "Public can read visible sections" on public.sections;
create policy "Public can read visible sections"
  on public.sections for select
  to anon, authenticated
  using (visible = true);

drop policy if exists "Admin can read all sections" on public.sections;
create policy "Admin can read all sections"
  on public.sections for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admin can write sections" on public.sections;
create policy "Admin can write sections"
  on public.sections for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admin can update sections" on public.sections;
create policy "Admin can update sections"
  on public.sections for update
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin can delete sections" on public.sections;
create policy "Admin can delete sections"
  on public.sections for delete
  to authenticated
  using (public.is_admin());

-- Built-in sections: seeded once so they show up in the CMS as
-- manageable rows. `type` = 'built-in' marks them as un-deletable
-- and tied to existing frontend markup (matched by `key`).
insert into public.sections (key, type, sort_order, visible)
values
  ('hero', 'built-in', 0, true),
  ('about', 'built-in', 1, true),
  ('skills', 'built-in', 2, true),
  ('work', 'built-in', 3, true),
  ('experience', 'built-in', 4, true),
  ('services', 'built-in', 5, true),
  ('philosophy', 'built-in', 6, true),
  ('direction', 'built-in', 7, true),
  ('contact', 'built-in', 8, true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- Section <-> media junction. A section can hold any number of
-- media items (0, 1, 2, 10...), in order.
-- ---------------------------------------------------------------
create table if not exists public.section_media (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.sections(id) on delete cascade,
  media_id     uuid not null references public.media(id) on delete cascade,
  caption      text,
  sort_order   integer not null default 0
);

create index if not exists section_media_section_idx on public.section_media (section_id, sort_order);

alter table public.section_media enable row level security;

drop policy if exists "Public can read section media" on public.section_media;
create policy "Public can read section media"
  on public.section_media for select
  to anon, authenticated
  using (exists (select 1 from public.sections s where s.id = section_id and s.visible = true));

drop policy if exists "Admin can read all section media" on public.section_media;
create policy "Admin can read all section media"
  on public.section_media for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admin can write section media" on public.section_media;
create policy "Admin can write section media"
  on public.section_media for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- Storage: one shared bucket for every new upload (media library,
-- section media, project videos). The original "project-images"
-- bucket keeps serving existing project cover/gallery images —
-- no migration needed, both buckets are public-read.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "Public can view site media" on storage.objects;
create policy "Public can view site media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-media');

drop policy if exists "Admin can upload site media" on storage.objects;
create policy "Admin can upload site media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admin can update site media" on storage.objects;
create policy "Admin can update site media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admin can delete site media" on storage.objects;
create policy "Admin can delete site media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin());
