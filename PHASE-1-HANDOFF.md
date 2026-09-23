# Phase 1 — Admin CMS — Handoff

## Status
Audited end-to-end against the fix request. No code changes were needed —
full CRUD for existing projects and sections, "new project → existing
section" flow, and the shared Media Library were already implemented and
wired correctly (verified by static/syntax check, not live Supabase).

## What the Admin supports
- **Projects tab**: edit/delete/publish-toggle/duplicate/drag-reorder every
  existing project (title, group, category, description, year, tags,
  Behance URL); cover upload/replace/delete with preview; gallery
  add/delete/drag-reorder, unlimited images or videos.
- **New Project**: "Group" dropdown picks an existing section (Branding /
  Social) — no new section required.
- **Sections tab**: edit/hide-show/drag-reorder/delete custom sections;
  built-in sections (hero…contact) get visibility + text overrides only
  (layout untouched, per "no redesign"). "+ New Section" stays for
  genuinely new sections. Media add/delete/drag-reorder per section.
- **Media Library**: one shared `media` table + `site-media` bucket used
  by projects, sections, and direct uploads. JPG/JPEG/PNG/WEBP/SVG/MP4/WEBM,
  unlimited files.
- **Supabase**: existing schema/RLS reused; anon key only, no service role
  key anywhere in the frontend.

## Setup
1. Run `supabase-schema.sql` in the Supabase SQL editor (idempotent).
2. Set `SUPABASE_URL` / `SUPABASE_ANON_KEY` (see `.env.example`) in your
   host env, redeploy.
3. Create an admin user in Supabase Auth to sign in at `/admin`.

## Files
Everything unchanged from the uploaded project — see inline comments in
`admin/admin.js`, `js/site-sections.js`, `js/site-projects.js`,
`supabase-schema.sql` for behavior details.
