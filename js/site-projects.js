// Renders projects from Supabase into the existing project-grid /
// project-page markup. If Supabase isn't reachable or configured yet,
// this silently does nothing and the static HTML already in index.html
// (the original hardcoded projects) stays exactly as it is — that's
// the fallback, no extra caching system needed.
(function () {
  'use strict';

  // Cover-art gradients already defined in style.css for the four
  // original social-media example projects (no real image uploaded).
  const LEGACY_GRADIENT_SLUGS = new Set(['orvix', 'meow-woof', 'suzy-kitchen', 'perfect-bite']);

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function coverNode(project, extraClass) {
    if (project.cover_image) {
      const img = document.createElement('img');
      img.className = 'project-cover-img' + (extraClass ? ' ' + extraClass : '');
      img.src = project.cover_image;
      img.alt = project.title + ' cover';
      img.loading = 'lazy';
      return img;
    }
    const span = document.createElement('span');
    span.className = 'project-cover' + (extraClass ? ' ' + extraClass : '');
    if (LEGACY_GRADIENT_SLUGS.has(project.slug)) span.dataset.cover = project.slug;
    return span;
  }

  function buildBrandingCard(project, index) {
    const article = document.createElement('article');
    article.className = 'project-card' + (index === 0 ? ' is-featured' : '');
    article.dataset.category = 'branding';

    const a = document.createElement('a');
    a.className = 'project-media';
    a.href = project.project_url || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', `View ${project.title} on Behance`);
    a.appendChild(coverNode(project));
    const overlay = document.createElement('span');
    overlay.className = 'media-overlay';
    a.appendChild(overlay);

    const info = document.createElement('div');
    info.className = 'project-info';
    info.innerHTML = `
      <span class="project-num">${String(index + 1).padStart(2, '0')}</span>
      <h3 class="project-title">${esc(project.title)}</h3>
      <span class="project-cat">${esc(project.category)}</span>
      <p class="project-desc">${esc(project.description)}</p>
      <a class="project-link" href="${esc(project.project_url || '#')}" target="_blank" rel="noopener noreferrer">View Project <span aria-hidden="true">→</span></a>
    `;

    article.appendChild(a);
    article.appendChild(info);
    return article;
  }

  function buildSocialCard(project, index) {
    const article = document.createElement('article');
    article.className = 'project-card';
    article.dataset.category = 'social';

    const btn = document.createElement('button');
    btn.className = 'project-media';
    btn.type = 'button';
    btn.dataset.openProject = project.slug;
    btn.setAttribute('aria-label', `Open ${project.title} project page`);
    btn.appendChild(coverNode(project));
    const overlay = document.createElement('span');
    overlay.className = 'media-overlay';
    btn.appendChild(overlay);

    const info = document.createElement('div');
    info.className = 'project-info';
    info.innerHTML = `
      <span class="project-num">${String(index + 1).padStart(2, '0')}</span>
      <h3 class="project-title">${esc(project.title)}</h3>
      <span class="project-cat">${esc(project.category)}</span>
      <p class="project-desc">${esc(project.description)}</p>
      <button class="project-link" type="button" data-open-project="${esc(project.slug)}">View Project <span aria-hidden="true">→</span></button>
    `;

    article.appendChild(btn);
    article.appendChild(info);
    return article;
  }

  function buildProjectPage(project, index) {
    const section = document.createElement('section');
    section.className = 'project-page';
    section.id = 'page-' + project.slug;
    section.dataset.project = project.slug;
    section.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('div');
    inner.className = 'project-page-inner';

    const back = document.createElement('button');
    back.className = 'project-back';
    back.type = 'button';
    back.dataset.closeProject = '';
    back.innerHTML = '<span aria-hidden="true">←</span> Back to Social Media';
    inner.appendChild(back);

    const coverWrap = document.createElement('div');
    coverWrap.className = 'project-page-cover';
    coverWrap.appendChild(coverNode(project));
    inner.appendChild(coverWrap);

    const head = document.createElement('div');
    head.className = 'project-page-head';
    head.innerHTML = `
      <span class="project-num">${String(index + 1).padStart(2, '0')}</span>
      <h2>${esc(project.title)}</h2>
      <span class="project-cat">${esc(project.category)}</span>
      <p>${esc(project.description)}</p>
    `;
    inner.appendChild(head);

    const gallery = document.createElement('div');
    gallery.className = 'project-gallery';
    const rawImages = Array.isArray(project.images) ? project.images : [];
    // Gallery items are either legacy plain URL strings (images only) or
    // { url, type: 'image' | 'video' } objects — support both.
    const images = rawImages.map(entry => typeof entry === 'string' ? { url: entry, type: 'image' } : entry);
    if (images.length) {
      images.forEach((entry, i) => {
        const item = document.createElement('div');
        item.className = 'project-gallery-item';
        if (entry.type === 'video') {
          const video = document.createElement('video');
          video.className = 'project-cover-img';
          video.src = entry.url;
          video.controls = true;
          video.playsInline = true;
          video.preload = 'metadata';
          item.appendChild(video);
        } else {
          const img = document.createElement('img');
          img.className = 'project-cover-img';
          img.src = entry.url;
          img.alt = `${project.title} gallery image ${i + 1}`;
          img.loading = 'lazy';
          item.appendChild(img);
        }
        gallery.appendChild(item);
      });
    } else {
      const item = document.createElement('div');
      item.className = 'project-gallery-item';
      item.appendChild(coverNode(project));
      gallery.appendChild(item);
    }
    inner.appendChild(gallery);

    section.appendChild(inner);
    return section;
  }

  async function render() {
    let client;
    try {
      client = await window.YASupabase.getClient();
    } catch (e) {
      return; // Supabase not configured — keep the static fallback markup.
    }

    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('published', true)
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error || !data || !data.length) return; // keep static fallback markup

    const branding = data.filter(p => p.section === 'branding');
    const social = data.filter(p => p.section === 'social');

    const brandingGrid = document.querySelector('#work-branding .project-grid');
    const socialGrid = document.querySelector('#work-social .project-grid');
    const pagesHost = document.getElementById('project-pages');

    if (brandingGrid && branding.length) {
      brandingGrid.innerHTML = '';
      branding.forEach((p, i) => brandingGrid.appendChild(buildBrandingCard(p, i)));
    }
    if (socialGrid && social.length) {
      socialGrid.innerHTML = '';
      social.forEach((p, i) => socialGrid.appendChild(buildSocialCard(p, i)));
    }
    if (pagesHost && social.length) {
      pagesHost.innerHTML = '';
      social.forEach((p, i) => pagesHost.appendChild(buildProjectPage(p, i)));
    }

    document.dispatchEvent(new CustomEvent('ya:projects-rendered'));
  }

  render();
})();
