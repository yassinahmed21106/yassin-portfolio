// Renders CMS-managed sections onto the public site.
// Built-ins: visibility + text overrides via [data-cms]. Layout unchanged.
// Custom sections: rendered into #dynamic-sections.
// If Supabase is unreachable, static HTML stays as-is.
(function () {
  'use strict';

  const BUILTIN_SELECTOR = {
    hero: '#home', about: '#about', skills: '#skills', work: '#work',
    experience: '#experience', services: '#services',
    philosophy: '#philosophy', direction: '#direction', contact: '#contact'
  };

  function applyBuiltIns(rows) {
    const builtIns = rows.filter(r => r.type === 'built-in');
    // Only hide when seed data is present — otherwise keep static markup.
    if (builtIns.length) {
      const visibleKeys = new Set(builtIns.map(r => r.key));
      Object.entries(BUILTIN_SELECTOR).forEach(([key, sel]) => {
        const el = document.querySelector(sel);
        if (!el) return;
        if (!visibleKeys.has(key)) {
          el.style.display = 'none';
          document.querySelectorAll('a[href="' + sel + '"]').forEach(a => {
            const li = a.closest('li');
            if (li) li.style.display = 'none';
            else a.style.display = 'none';
          });
        }
      });
    }

    builtIns.forEach(row => {
      ['title', 'subtitle', 'content'].forEach(field => {
        const value = row[field];
        if (!value) return;
        const target = document.querySelector('[data-cms="' + row.key + '.' + field + '"]');
        if (!target) return;
        if (target.children.length > 0) {
          // Containers (e.g. about.body): replace with plain paragraphs.
          // Skip rich markup targets (e.g. philosophy .outline).
          if (field === 'content' && !target.querySelector('.outline')) {
            const parts = String(value).split(/\n\n+/).map(s => s.trim()).filter(Boolean);
            target.textContent = '';
            (parts.length ? parts : [String(value)]).forEach(part => {
              const p = document.createElement('p');
              p.textContent = part;
              target.appendChild(p);
            });
          }
          return;
        }
        target.textContent = value;
      });
    });
  }

  function mediaNode(item) {
    if (item.media_type === 'video') {
      const v = document.createElement('video');
      v.className = 'dynsec-media-item';
      v.src = item.url;
      v.controls = true;
      v.playsInline = true;
      v.preload = 'metadata';
      return v;
    }
    const img = document.createElement('img');
    img.className = 'dynsec-media-item';
    img.src = item.url;
    img.loading = 'lazy';
    img.alt = '';
    return img;
  }

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
    if (row.content && type !== 'image' && type !== 'video') {
      const p = document.createElement('p');
      p.className = 'dynsec-content reveal';
      p.textContent = row.content;
      inner.appendChild(p);
    }
    const items = type === 'text' ? [] : (mediaItems || []);
    if (items.length) {
      const grid = document.createElement('div');
      const isHero = type === 'image' || type === 'video';
      grid.className = 'dynsec-media-grid' + (isHero ? ' dynsec-media-grid--hero' : '');
      (isHero ? items.slice(0, 1) : items).forEach(m => grid.appendChild(mediaNode(m)));
      inner.appendChild(grid);
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
      return;
    }

    try {
      const { data, error } = await client
        .from('sections')
        .select('*')
        .eq('visible', true)
        .order('sort_order', { ascending: true });

      if (error || !data) return;

      applyBuiltIns(data);

      const customRows = data.filter(r => r.type !== 'built-in');
      const host = document.getElementById('dynamic-sections');
      if (!host || !customRows.length) {
        document.dispatchEvent(new CustomEvent('ya:sections-rendered'));
        return;
      }

      const ids = customRows.map(r => r.id);
      const { data: mediaLinks, error: mediaError } = await client
        .from('section_media')
        .select('section_id, sort_order, media(url, media_type)')
        .in('section_id', ids)
        .order('sort_order', { ascending: true });

      if (mediaError) {
        console.warn('Section media could not be loaded:', mediaError.message);
      }

      const mediaBySection = {};
      (mediaLinks || []).forEach(link => {
        if (!link.media) return;
        (mediaBySection[link.section_id] = mediaBySection[link.section_id] || []).push(link.media);
      });

      host.innerHTML = '';
      customRows.forEach(row => host.appendChild(buildCustomSection(row, mediaBySection[row.id])));

      document.dispatchEvent(new CustomEvent('ya:sections-rendered'));
    } catch (e) {
      console.warn('Sections could not be loaded:', e.message || e);
    }
  }

  render();
})();
