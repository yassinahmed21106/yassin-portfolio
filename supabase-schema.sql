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

-- Anyone can read published projects.
drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
  on public.projects for select
  to anon, authenticated
  using (published = true);

-- Only a signed-in user (the admin) can see everything, including drafts.
drop policy if exists "Admin can read all projects" on public.projects;
create policy "Admin can read all projects"
  on public.projects for select
  to authenticated
  using (true);

drop policy if exists "Admin can insert projects" on public.projects;
create policy "Admin can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update projects" on public.projects;
create policy "Admin can update projects"
  on public.projects for update
  to authenticated
  using (true) with check (true);

drop policy if exists "Admin can delete projects" on public.projects;
create policy "Admin can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

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
  with check (bucket_id = 'project-images');

drop policy if exists "Admin can update project images" on storage.objects;
create policy "Admin can update project images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images');

drop policy if exists "Admin can delete project images" on storage.objects;
create policy "Admin can delete project images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');

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
