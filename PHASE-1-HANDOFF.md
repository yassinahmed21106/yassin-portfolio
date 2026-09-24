# Phase 1 — Portfolio + Admin CMS

## Structure
```
/
  index.html, style.css, script.js
  assets/          profile + branding covers
  js/
    supabase-client.js   shared client (/api/config)
    site-sections.js     CMS sections → public site
    site-projects.js     CMS projects → public site
  admin/             login + CMS UI
  api/
    config.js        public Supabase URL + anon key
    contact.js       contact form proxy (Web3Forms)
  .env.example
  supabase-schema.sql
```

## Env (Vercel)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `WEB3FORMS_ACCESS_KEY` (server-only; contact form)

## Setup
1. Run `supabase-schema.sql` in the Supabase SQL editor.
2. Set the env vars above, redeploy.
3. Create the admin Auth user as `yassinahmed21106@gmail.com` (must match `is_admin()` / `ADMIN_EMAILS`).
4. Disable public signup in Supabase Auth settings.

## Behavior notes
- Public site keeps static HTML as fallback if Supabase is down.
- Custom project groups render under Work; social uses in-page overlays.
- No service-role key in the frontend.
- Admin writes require allowlisted email (RLS via `public.is_admin()`).

## Deploy checklist
- **Vercel env vars** (Project → Settings → Environment Variables), then redeploy:
  - `SUPABASE_URL` — Supabase → Project Settings → API → Project URL
  - `SUPABASE_ANON_KEY` — same page → `anon` `public` key (not service_role)
  - `WEB3FORMS_ACCESS_KEY` — Web3Forms dashboard access key (server-only)
- Confirm Supabase Auth → Providers/settings: **sign-ups disabled** (invite/create users only).
- After deploy, test:
  1. `/admin` login as `yassinahmed21106@gmail.com` succeeds; a non-allowlisted user is rejected.
  2. Add / edit / delete a project; confirm it updates on the public site.
  3. Submit the contact form; confirm the email arrives.
  4. Open DevTools console on `/` and `/admin` — no unexpected errors on load.
