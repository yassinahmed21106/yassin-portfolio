// Renders portfolio projects from Supabase into Behance-style internal project pages.
// Project cards remain lightweight; opening one reveals a full editorial scroll with
// images and videos presented as a clean vertical case-study feed.
(function () {
  'use strict';

  const LEGACY_GRADIENT_SLUGS = new Set(['orvix', 'meow-woof', 'suzy-kitchen', 'perfect-bite']);

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function label(g) {
    return String(g || '').replace(/[-_]/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
  }

  function slugify(value) {
    return String(value || 'project')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'project';
  }

  function normalizeMedia(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map(entry => {
        if (typeof entry === 'string') return { url: entry, type: 'image' };
        if (!entry || !entry.url) return null;
        return { url: entry.url, type: entry.type === 'video' ? 'video' : 'image' };
      })
      .filter(Boolean);
  }

  function projectMedia(project) {
    const coverUrl = project.cover_image || '';
    const images = normalizeMedia(project.images);
    const videos = normalizeMedia(project.videos);
    // The cover is a hero-only asset. Legacy projects may still have it in
    // their gallery data, so filter it at the data/render boundary as well.
    return images.concat(videos).filter(entry => !coverUrl || entry.url !== coverUrl);
  }

  function coverNode(project, extraClass) {
    if (project.cover_image) {
      const img = document.createElement('img');
      img.className = 'project-cover-img' + (extraClass ? ' ' + extraClass : '');
      img.src = project.cover_image;
      img.alt = (project.title || 'Project') + ' cover';
      img.loading = 'lazy';
      return img;
    }
    const span = document.createElement('span');
    span.className = 'project-cover' + (extraClass ? ' ' + extraClass : '');
    if (LEGACY_GRADIENT_SLUGS.has(project.slug)) span.dataset.cover = project.slug;
    return span;
  }

  function buildProjectCard(project, index) {
    const article = document.createElement('article');
    article.className = 'project-card' + (index === 0 ? ' is-featured' : '');
    article.dataset.category = project.section || 'branding';

    const btn = document.createElement('button');
    btn.className = 'project-media';
    btn.type = 'button';
    btn.dataset.openProject = project.slug;
    btn.setAttribute('aria-label', 'Open ' + project.title + ' project');
    btn.appendChild(coverNode(project));
    const overlay = document.createElement('span');
    overlay.className = 'media-overlay';
    btn.appendChild(overlay);

    const info = document.createElement('div');
    info.className = 'project-info';
    info.innerHTML =
      '<span class="project-num">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<h3 class="project-title">' + esc(project.title) + '</h3>' +
      '<span class="project-cat">' + esc(project.category) + '</span>' +
      '<p class="project-desc">' + esc(project.description) + '</p>' +
      '<button class="project-link" type="button" data-open-project="' + esc(project.slug) + '">View Project <span aria-hidden="true">→</span></button>';

    article.appendChild(btn);
    article.appendChild(info);
    return article;
  }

  function mediaElement(project, entry, index) {
    const item = document.createElement('figure');
    item.className = 'project-gallery-item' + (entry.type === 'video' ? ' is-video' : '');

    if (entry.type === 'video') {
      const video = document.createElement('video');
      video.className = 'project-page-video';
      video.src = entry.url;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = index < 2 ? 'metadata' : 'none';
      item.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.className = 'project-page-image';
      img.src = entry.url;
      img.alt = project.title + ' project image ' + (index + 1);
      img.loading = index < 2 ? 'eager' : 'lazy';
      item.appendChild(img);
    }

    return item;
  }

  function buildProjectPage(project, index) {
    const section = document.createElement('section');
    section.className = 'project-page';
    section.id = 'page-' + project.slug;
    section.dataset.project = project.slug;
    section.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('div');
    inner.className = 'project-page-inner';

    const topbar = document.createElement('div');
    topbar.className = 'project-page-topbar';
    topbar.innerHTML =
      '<button class="project-back" type="button" data-close-project><span aria-hidden="true">←</span> Back to Projects</button>' +
      '<span class="project-page-index">' + String(index + 1).padStart(2, '0') + '</span>';
    inner.appendChild(topbar);

    const coverWrap = document.createElement('div');
    coverWrap.className = 'project-page-cover';
    coverWrap.appendChild(coverNode(project));
    inner.appendChild(coverWrap);

    const head = document.createElement('div');
    head.className = 'project-page-head';
    head.innerHTML =
      '<span class="project-num">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<h2>' + esc(project.title) + '</h2>' +
      '<span class="project-cat">' + esc(project.category) + '</span>' +
      '<p>' + esc(project.description) + '</p>';

    if (project.project_url) {
      const external = document.createElement('a');
      external.className = 'project-page-external';
      external.href = project.project_url;
      external.target = '_blank';
      external.rel = 'noopener noreferrer';
      external.textContent = /behance\.net/i.test(project.project_url) ? 'View on Behance ↗' : 'Open project link ↗';
      head.appendChild(external);
    }
    inner.appendChild(head);

    const gallery = document.createElement('div');
    gallery.className = 'project-gallery';
    if (Number.isFinite(Number(project.content_spacing))) {
      const spacing = Math.max(0, Math.min(120, Number(project.content_spacing)));
      gallery.style.setProperty('--project-content-gap', spacing + 'px');
    }

    const entries = projectMedia(project);
    entries.forEach((entry, i) => gallery.appendChild(mediaElement(project, entry, i)));


    inner.appendChild(gallery);

    const bottom = document.createElement('div');
    bottom.className = 'project-page-bottom';
    bottom.innerHTML = '<button class="project-back project-back--bottom" type="button" data-close-project><span aria-hidden="true">↑</span> Back to all projects</button>';
    inner.appendChild(bottom);

    section.appendChild(inner);
    return section;
  }

  function ensureCategoryGrid(sectionKey) {
    const id = 'work-' + sectionKey;
    let cat = document.getElementById(id);
    if (cat) return cat.querySelector('.project-grid');

    const workInner = document.querySelector('#work .section-inner');
    if (!workInner) return null;

    cat = document.createElement('div');
    cat.className = 'work-category';
    cat.id = id;

    const title = document.createElement('h3');
    title.className = 'work-category-title reveal';
    title.textContent = label(sectionKey);

    const grid = document.createElement('div');
    grid.className = 'project-grid';

    cat.appendChild(title);
    cat.appendChild(grid);
    workInner.appendChild(cat);
    return grid;
  }

  // Converts the four built-in branding cards into the same internal case-study
  // interaction before Supabase responds, so the fallback site behaves consistently.
  function upgradeStaticBranding() {
    const cards = Array.from(document.querySelectorAll('#work-branding .project-card'));
    if (!cards.length) return [];

    return cards.map((card, index) => {
      const media = card.querySelector('.project-media');
      const title = card.querySelector('.project-title')?.textContent?.trim() || 'Project';
      const slug = slugify(title);
      const projectUrl = media?.getAttribute('href') || card.querySelector('.project-link')?.getAttribute('href') || '';
      const cover = card.querySelector('.project-cover-img')?.getAttribute('src') || '';
      const category = card.querySelector('.project-cat')?.textContent?.trim() || 'Brand Identity';
      const description = card.querySelector('.project-desc')?.textContent?.trim() || '';

      if (media && media.tagName === 'A') {
        const btn = document.createElement('button');
        btn.className = media.className;
        btn.type = 'button';
        btn.dataset.openProject = slug;
        btn.setAttribute('aria-label', 'Open ' + title + ' project');
        while (media.firstChild) btn.appendChild(media.firstChild);
        media.replaceWith(btn);
      }

      const link = card.querySelector('.project-link');
      if (link && link.tagName === 'A') {
        const btn = document.createElement('button');
        btn.className = link.className;
        btn.type = 'button';
        btn.dataset.openProject = slug;
        btn.innerHTML = link.innerHTML;
        link.replaceWith(btn);
      }

      return {
        title, slug, project_url: projectUrl, cover_image: cover,
        category, description, section: 'branding', images: [], videos: [], index
      };
    });
  }

  function renderPages(projects, replace = true) {
    const host = document.getElementById('project-pages');
    if (!host) return;
    if (replace) host.innerHTML = '';
    projects.forEach((project, i) => {
      if (!document.querySelector('.project-page[data-project="' + project.slug + '"]')) {
        host.appendChild(buildProjectPage(project, i));
      }
    });
  }

  async function render() {
    const fallbackBranding = upgradeStaticBranding();
    let client;
    try {
      client = await window.YASupabase.getClient();
    } catch (e) {
      renderPages(fallbackBranding, false);
      document.dispatchEvent(new CustomEvent('ya:projects-rendered'));
      return;
    }

    try {
      const { data, error } = await client
        .from('projects')
        .select('*')
        .eq('published', true)
        .order('section', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error || !data || !data.length) {
        renderPages(fallbackBranding, false);
        document.dispatchEvent(new CustomEvent('ya:projects-rendered'));
        return;
      }

      const bySection = {};
      data.forEach(p => {
        const key = p.section || 'branding';
        (bySection[key] = bySection[key] || []).push(p);
      });

      const pages = [];
      Object.keys(bySection).forEach(key => {
        const list = bySection[key];
        const grid = ensureCategoryGrid(key);
        if (!grid) return;
        grid.innerHTML = '';
        list.forEach((p, i) => {
          grid.appendChild(buildProjectCard(p, i));
          pages.push(p);
        });
      });

      renderPages(pages);
      document.dispatchEvent(new CustomEvent('ya:projects-rendered'));
    } catch (e) {
      console.warn('Projects could not be loaded:', e.message || e);
      renderPages(fallbackBranding, false);
      document.dispatchEvent(new CustomEvent('ya:projects-rendered'));
    }
  }

  render();
})();
