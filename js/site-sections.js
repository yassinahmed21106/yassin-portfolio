// Renders the CMS-managed "Sections" onto the public site:
//  1. Built-in sections (hero, about, skills, work, experience,
//     services, philosophy, direction, contact) — hidden if toggled
//     off in the admin, and their heading/subtitle/body text
//     overridden via [data-cms="key.field"] attributes already on
//     the existing markup. The layout, CSS, and design never change.
//  2. Custom sections created in the admin — rendered generically
//     into #dynamic-sections, styled to match the rest of the site.
// If Supabase isn't reachable, this silently does nothing and the
// site shows exactly its static fallback content — same pattern as
// js/site-projects.js.
(function () {
  'use strict';

  const BUILTIN_SELECTOR = {
    hero: '#home', about: '#about', skills: '#skills', work: '#work',
    experience: '#experience', services: '#services',
    philosophy: '#philosophy', direction: '#direction', contact: '#contact'
  };

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function applyBuiltIns(rows) {
    const visibleKeys = new Set(rows.filter(r => r.type === 'built-in').map(r => r.key));
    Object.entries(BUILTIN_SELECTOR).forEach(([key, sel]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (!visibleKeys.has(key)) { el.style.display = 'none'; }
    });
    rows.filter(r => r.type === 'built-in').forEach(row => {
      ['title', 'subtitle', 'content'].forEach(field => {
        const value = row[field];
        if (!value) return;
        const target = document.querySelector(`[data-cms="${row.key}.${field}"]`);
        if (target) target.textContent = value;
      });
    });
  }

  function mediaNode(item) {
    if (item.media_type === 'video') {
      const v = document.createElement('video');
      v.className = 'dynsec-media-item';
      v.src = item.url; v.controls = true; v.playsInline = true; v.preload = 'metadata';
      return v;
    }
    const img = document.createElement('img');
    img.className = 'dynsec-media-item';
    img.src = item.url; img.loading = 'lazy'; img.alt = '';
    return img;
  }

  // Section "type" (set in the admin) picks the media layout only —
  // same building blocks (eyebrow/title/content/media/button), just
  // arranged to fit what the type implies. No new visual language.
  function buildCustomSection(row, mediaItems) {
    const type = row.type || 'mixed';
    const section = document.createElement('section');
    section.className = 'dynamic-section dynamic-section--' + type;
    section.id = row.key || ('section-' + row.id);

    const inner = document.createElement('div');
    inner.className = 'section-inner';

    if (row.subtitle) {
      const p = document.createElement('p');
      p.className = 'eyebrow reveal';
      p.textContent = row.subtitle;
      inner.appendChild(p);
    }
    if (row.title) {
      const h2 = document.createElement('h2');
      h2.className = 'section-title reveal';
      h2.textContent = row.title;
      inner.appendChild(h2);
    }
    // "text" sections are copy-only — media, if any was attached
    // anyway, is intentionally skipped so the layout stays clean.
    if (row.content && type !== 'image' && type !== 'video') {
      const p = document.createElement('p');
      p.className = 'dynsec-content reveal';
      p.textContent = row.content;
      inner.appendChild(p);
    }
    const items = type === 'text' ? [] : (mediaItems || []);
    if (items.length) {
      const grid = document.createElement('div');
      // "image"/"video" show a single large hero asset; "gallery" and
      // "mixed" keep the responsive multi-item grid.
      const isHero = type === 'image' || type === 'video';
      grid.className = 'dynsec-media-grid' + (isHero ? ' dynsec-media-grid--hero' : '');
      (isHero ? items.slice(0, 1) : items).forEach(m => grid.appendChild(mediaNode(m)));
      inner.appendChild(grid);
      // A hero image/video can still carry its caption below the media.
      if (isHero && row.content) {
        const p = document.createElement('p');
        p.className = 'dynsec-content reveal';
        p.textContent = row.content;
        inner.appendChild(p);
      }
    }
    if (row.link_url && row.link_label) {
      const a = document.createElement('a');
      a.className = 'btn btn-primary magnetic';
      a.href = row.link_url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = row.link_label;
      inner.appendChild(a);
    }

    section.appendChild(inner);
    return section;
  }

  async function render() {
    let client;
    try {
      client = await window.YASupabase.getClient();
    } catch (e) {
      return; // Supabase not configured — keep static fallback markup.
    }

    const { data, error } = await client
      .from('sections')
      .select('*')
      .eq('visible', true)
      .order('sort_order', { ascending: true });

    if (error || !data) return;

    applyBuiltIns(data);

    const customRows = data.filter(r => r.type !== 'built-in');
    const host = document.getElementById('dynamic-sections');
    if (!host || !customRows.length) return;

    const ids = customRows.map(r => r.id);
    const { data: mediaLinks } = await client
      .from('section_media')
      .select('section_id, sort_order, media(url, media_type)')
      .in('section_id', ids)
      .order('sort_order', { ascending: true });

    const mediaBySection = {};
    (mediaLinks || []).forEach(link => {
      if (!link.media) return;
      (mediaBySection[link.section_id] = mediaBySection[link.section_id] || []).push(link.media);
    });

    host.innerHTML = '';
    customRows.forEach(row => host.appendChild(buildCustomSection(row, mediaBySection[row.id])));

    document.dispatchEvent(new CustomEvent('ya:sections-rendered'));
  }

  render();
})();
