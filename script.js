/**
 * YASSIN AHMED — EDITORIAL GRAPHIC DESIGN PORTFOLIO
 * Core Script Engine:
 * 1. Continuous Cinematic Portrait Animation (Fixed throughout entire page)
 * 2. 5 Distinct Category Sections with 3-Column Grid
 * 3. Certificate Gallery & Full-View Modal
 * 4. "Start a Project" Contact-Choice Modal
 * 5. Refined Viewport Entrance Animations & Number Counters
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. CONTINUOUS CINEMATIC PORTRAIT SCROLL ENGINE
     ========================================================================== */
  const TOTAL_FRAMES = 102;
  const FRAME_PREFIX = 'Portrait_head_rotation_animation_20260924213046_';
  const heroRunner = document.getElementById('heroRunner');
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const loader = document.getElementById('siteLoader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderMeta = document.getElementById('loaderMeta');

  let dirPrefix = 'frames/';
  const images = new Array(TOTAL_FRAMES);
  const loadingPromises = new Map();
  let loadedImagesCount = 0;
  let renderedFrameIndex = -1;

  let targetProgress = 0;
  let currentProgress = 0;
  const LERP_FACTOR = 0.08;

  function formatFrameName(idx) {
    return `${FRAME_PREFIX}${String(idx).padStart(3, '0')}.png`;
  }

  function getFrameUrl(idx) {
    return `${dirPrefix}${formatFrameName(idx)}`;
  }

  function detectFramePath() {
    return new Promise((resolve) => {
      const testImg = new Image();
      testImg.src = 'frames/' + formatFrameName(0);
      testImg.onload = () => {
        dirPrefix = 'frames/';
        resolve();
      };
      testImg.onerror = () => {
        dirPrefix = '';
        resolve();
      };
    });
  }

  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    if (renderedFrameIndex >= 0) {
      drawFrame(renderedFrameIndex);
    }
  }

  function drawFrame(frameIdx) {
    if (!ctx || !canvas) return;
    let img = images[frameIdx];

    if (!img || !img.complete || img.naturalWidth === 0) {
      const fallback = getClosestLoadedFrame(frameIdx);
      if (fallback !== -1) {
        img = images[fallback];
      } else {
        return;
      }
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    if (iw === 0 || ih === 0) return;

    const canvasAspect = cw / ch;
    const imgAspect = iw / ih;

    let dw, dh, dx, dy;

    if (canvasAspect > imgAspect) {
      dw = cw;
      dh = cw / imgAspect;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * imgAspect;
      dy = 0;
      dx = (cw - dw) / 2;
    }

    ctx.drawImage(img, dx, dy, dw, dh);
    renderedFrameIndex = frameIdx;
  }

  function getClosestLoadedFrame(index) {
    if (images[index] && images[index].complete && images[index].naturalWidth > 0) {
      return index;
    }
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = index - offset;
      if (prev >= 0 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return prev;
      }
      const next = index + offset;
      if (next < TOTAL_FRAMES && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return next;
      }
    }
    return -1;
  }

  function loadFrame(idx) {
    if (idx < 0 || idx >= TOTAL_FRAMES) return Promise.resolve(null);
    if (images[idx] && images[idx].complete) {
      return Promise.resolve(images[idx]);
    }
    if (loadingPromises.has(idx)) {
      return loadingPromises.get(idx);
    }

    const promise = new Promise((resolve) => {
      const img = new Image();
      img.src = getFrameUrl(idx);
      img.onload = () => {
        images[idx] = img;
        loadedImagesCount++;

        const pct = Math.round((loadedImagesCount / TOTAL_FRAMES) * 100);
        if (loaderFill) loaderFill.style.width = pct + '%';
        if (loaderMeta) loaderMeta.textContent = pct + '%';

        if (loadedImagesCount >= 2 && loader && !loader.classList.contains('hidden')) {
          loader.classList.add('hidden');
        }

        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
    });

    loadingPromises.set(idx, promise);
    return promise;
  }

  function prioritizeSurroundingFrames(targetIndex) {
    const range = 5;
    for (let i = -range; i <= range; i++) {
      const f = targetIndex + i;
      if (f >= 0 && f < TOTAL_FRAMES) {
        loadFrame(f);
      }
    }
  }

  /**
   * CONTINUOUS PORTRAIT EXPERIENCE ACROSS ENTIRE PAGE:
   * 1. In Hero (0 -> heroRunner height): head rotates smoothly from frame 0 to frame 95.
   * 2. In Content Sections (About -> Contact):
   *    - Portrait remains visually active in the background!
   *    - CSS class .in-content-sections applies subtle atmospheric shift & contrast.
   *    - Frame gently micro-scrubs / breathes based on scroll depth so it is NEVER frozen!
   */
  function updateScrollProgress() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const heroHeight = heroRunner ? heroRunner.offsetHeight - window.innerHeight : window.innerHeight;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight
    ) - window.innerHeight;

    // Toggle content-sections state to keep portrait visually integrated with high contrast
    if (scrollY > heroHeight * 0.65) {
      document.body.classList.add('in-content-sections');
    } else {
      document.body.classList.remove('in-content-sections');
    }

    if (scrollY <= heroHeight) {
      // In Hero: scrub through the signature rotation (0.0 -> 0.95)
      const heroRatio = heroHeight > 0 ? scrollY / heroHeight : 0;
      targetProgress = Math.min(Math.max(heroRatio * 0.95, 0), 0.95);
    } else {
      // In Content Sections: subtly continue micro-scrubbing between 0.85 and 1.0
      // based on overall page scroll, keeping the portrait dynamically alive!
      const contentScrollRatio = docHeight > heroHeight
        ? (scrollY - heroHeight) / (docHeight - heroHeight)
        : 0;
      targetProgress = 0.90 + Math.min(Math.max(contentScrollRatio * 0.10, 0), 0.10);
    }

    const activeIndex = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(targetProgress * (TOTAL_FRAMES - 1)))
    );
    prioritizeSurroundingFrames(activeIndex);
    requestRender();
  }

  let renderLoopRunning = false;

  function requestRender() {
    if (!renderLoopRunning) {
      renderLoopRunning = true;
      requestAnimationFrame(renderLoop);
    }
  }

  function renderLoop() {
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) < 0.0001) {
      currentProgress = targetProgress;
    } else {
      currentProgress += diff * LERP_FACTOR;
    }

    const frameIndex = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
    );

    if (frameIndex !== renderedFrameIndex) {
      drawFrame(frameIndex);
    }

    if (Math.abs(targetProgress - currentProgress) >= 0.0001) {
      requestAnimationFrame(renderLoop);
    } else {
      renderLoopRunning = false;
    }
  }

  async function preloadHeroFrames() {
    await loadFrame(0);
    drawFrame(0);

    // Initial keyframes for smooth early rotation
    for (let i = 0; i < TOTAL_FRAMES; i += 10) {
      loadFrame(i);
    }

    if (loader) {
      loader.classList.add('hidden');
    }

    // Schedule remaining background frame preloading cleanly when main thread is idle
    const loadRemaining = () => {
      let idx = 0;
      function loadNextBatch() {
        let count = 0;
        while (idx < TOTAL_FRAMES && count < 4) {
          loadFrame(idx);
          idx++;
          count++;
        }
        if (idx < TOTAL_FRAMES) {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadNextBatch, { timeout: 1000 });
          } else {
            setTimeout(loadNextBatch, 50);
          }
        }
      }
      loadNextBatch();
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadRemaining, { timeout: 2000 });
    } else {
      setTimeout(loadRemaining, 300);
    }
  }

  /* ==========================================================================
     2. SELECTED WORK (5 DISTINCT CATEGORY SECTIONS WITH 3-COL GRID)
     ========================================================================== */
  const projects = window.PORTFOLIO_PROJECTS || [];

  const CATEGORY_DEFINITIONS = [
    {
      id: "cat-branding",
      name: "BRANDING & VISUAL IDENTITY",
      categoryKey: "BRANDING & VISUAL IDENTITY",
      description: "Comprehensive visual systems, logo suites, typography rules, and strategic brand architecture."
    },
    {
      id: "cat-social",
      name: "SOCIAL MEDIA DESIGN",
      categoryKey: "SOCIAL MEDIA DESIGN",
      description: "Editorial carousels, dynamic campaign visuals, high-impact digital content, and marketing collateral."
    },
    {
      id: "cat-video",
      name: "VIDEO EDITING",
      categoryKey: "VIDEO EDITING",
      description: "Rhythmic commercial video cutdowns, color grading, and dynamic social reels."
    }
  ];

  function createProjectCardElement(project, pIdx, isPriority = false) {
    const card = document.createElement('article');
    card.className = 'project-card-rect';
    card.dataset.projectId = project.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View ${project.title} project details`);

    const indexNum = String(pIdx + 1).padStart(2, '0');
    const loadingAttr = isPriority ? 'eager' : 'lazy';
    const fetchPriorityAttr = isPriority ? ' fetchpriority="high"' : '';

    const coverSrc = project.coverThumbnail || project.cover;

    card.innerHTML = `
      <div class="card-media-wrap">
        <img class="card-cover-img" src="${coverSrc}" alt="${project.title} cover" loading="${loadingAttr}"${fetchPriorityAttr} decoding="async">
        <div class="card-media-overlay"></div>
      </div>
      <div class="card-body">
        <div class="card-header-meta">
          <span class="card-index">${indexNum}</span>
          <span class="card-year">${project.year || ''}</span>
        </div>
        <h4 class="card-title">${project.title}</h4>
        <span class="card-tag">${project.tag || project.category}</span>
        <p class="card-summary">${project.summary}</p>
        <div class="card-cta">
          <span>View Project</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openCaseStudy(project.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCaseStudy(project.id);
      }
    });

    return card;
  }

  function renderCategorySections() {
    const container = document.getElementById('selectedWorkCategories');
    if (!container) return;
    container.innerHTML = '';

    CATEGORY_DEFINITIONS.forEach((def, catIdx) => {
      const catProjects = projects.filter((p) => p.category.toUpperCase() === def.categoryKey);
      if (catProjects.length === 0) return;

      const groupSection = document.createElement('div');
      groupSection.className = 'work-category-group reveal';
      groupSection.id = def.id;

      groupSection.innerHTML = `
        <div class="category-group-header">
          <div>
            <h3 class="category-group-title">${def.name}</h3>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 6px;">${def.description}</p>
          </div>
          <span class="category-group-count">${String(catProjects.length).padStart(2, '0')} ${catProjects.length === 1 ? 'PROJECT' : 'PROJECTS'}</span>
        </div>
        
        <div class="project-grid-3col reveal-stagger" id="grid-${def.id}">
        </div>
      `;

      container.appendChild(groupSection);
      const grid = groupSection.querySelector(`#grid-${def.id}`);

      // Initial batch (first 3 cards) rendered immediately.
      // First category section's initial cards are marked priority (eager + fetchpriority="high")
      const initialBatch = catProjects.slice(0, 3);
      const remainingBatch = catProjects.slice(3);

      initialBatch.forEach((project, pIdx) => {
        const isPriority = (catIdx === 0 && pIdx < 3);
        grid.appendChild(createProjectCardElement(project, pIdx, isPriority));
      });

      // Render remaining cards smoothly on subsequent idle cycles
      if (remainingBatch.length > 0) {
        let rIdx = 0;
        const appendRemaining = () => {
          if (rIdx < remainingBatch.length) {
            grid.appendChild(createProjectCardElement(remainingBatch[rIdx], rIdx + 3, false));
            rIdx++;
            if ('requestIdleCallback' in window) {
              requestIdleCallback(appendRemaining, { timeout: 200 });
            } else {
              requestAnimationFrame(appendRemaining);
            }
          }
        };
        if ('requestIdleCallback' in window) {
          requestIdleCallback(appendRemaining, { timeout: 200 });
        } else {
          requestAnimationFrame(appendRemaining);
        }
      }
    });
  }

  /* ==========================================================================
     3. EDITORIAL CASE STUDY VIEW / MODAL
     ========================================================================== */
  const caseStudyModal = document.getElementById('caseStudyModal');
  const caseStudyContent = document.getElementById('caseStudyContent');

  function openCaseStudy(projectId) {
    const projectIndex = projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1 || !caseStudyModal || !caseStudyContent) return;

    const project = projects[projectIndex];
    const prevProject = projectIndex > 0 ? projects[projectIndex - 1] : null;
    const nextProject = projectIndex < projects.length - 1 ? projects[projectIndex + 1] : null;

    let paletteHtml = '';
    if (project.palette && project.palette.length) {
      paletteHtml = `
        <div class="case-study-section">
          <h4 class="case-study-sec-title">Brand Color Palette</h4>
          <div class="cs-palette-grid">
            ${project.palette.map((c) => `
              <div class="cs-color-swatch" style="background-color: ${c.hex}; color: ${c.hex === '#ffffff' || c.hex === '#f8fafc' || c.hex === '#fef3c7' || c.hex === '#e0f2fe' ? '#09090b' : '#ffffff'};">
                <span class="cs-color-name">${c.name}</span>
                <span class="cs-color-hex">${c.hex}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    let scopeHtml = '';
    if (project.scope && project.scope.length) {
      scopeHtml = `
        <div class="case-study-section">
          <h4 class="case-study-sec-title">Scope of Work</h4>
          <div class="cs-scope-grid">
            ${project.scope.map((s) => `<span class="cs-scope-pill">${s}</span>`).join('')}
          </div>
        </div>
      `;
    }

    let typoHtml = '';
    if (project.typography) {
      typoHtml = `
        <div class="case-study-section">
          <h4 class="case-study-sec-title">Typography System</h4>
          <div class="case-study-body">
            <p><strong>Headlines:</strong> ${project.typography.headline}</p>
            <p><strong>Body:</strong> ${project.typography.body}</p>
          </div>
        </div>
      `;
    }

    // --- Media strip (Behance-style, 0px gaps) ---
    let mediaStripHtml = '';
    if (project.media && project.media.length) {
      // Count image-type items only for lightbox index tracking
      let imgLightboxIdx = 0;
      const mediaItems = project.media.map((item, mIdx) => {
        if (item.type === 'video') {
          // preload="none" + data-src for true lazy video loading
          // vertical: true triggers 9:16 centered layout
          const verticalClass = item.vertical ? ' cs-media-vertical' : '';
          return `
            <div class="cs-media-item cs-media-video-item${verticalClass}">
              <video data-video-src="${item.src}" muted loop playsinline preload="none" class="cs-media-video"></video>
            </div>
          `;
        }
        // First 2 images load eagerly so the modal appears instantly with initial content;
        // all subsequent images are truly lazy-loaded as the user scrolls
        const isPriority = (mIdx < 2);
        const loadAttr = isPriority ? 'eager' : 'lazy';
        const fetchPriorityAttr = isPriority ? ' fetchpriority="high"' : '';
        const thisLbIdx = imgLightboxIdx++;
        const isBannerGrid = project.galleryType === 'banner-grid';
        const isGrid = project.galleryType === 'grid';
        const isBannerItem = isBannerGrid && mIdx === 0;
        const itemClass = isBannerItem ? 'cs-media-item cs-banner-item' : (isBannerGrid || isGrid ? 'cs-media-item cs-grid-item' : 'cs-media-item');
        return `
          <div class="${itemClass}">
            <img src="${item.src}" alt="${project.title} — image ${thisLbIdx + 1}" loading="${loadAttr}"${fetchPriorityAttr} decoding="async" class="cs-media-img" data-lightbox-src="${item.src}" data-lightbox-idx="${thisLbIdx}">
          </div>
        `;
      }).join('');
      let stripClass = 'cs-media-strip';
      if (project.galleryType === 'banner-grid') {
        stripClass = 'cs-media-strip cs-media-banner-grid';
      } else if (project.galleryType === 'grid') {
        stripClass = 'cs-media-strip cs-media-grid';
      }
      mediaStripHtml = `<div class="${stripClass}">${mediaItems}</div>`;
    } else if (project.gallery && project.gallery.length) {
      // Fallback for projects using the old gallery array
      const galleryItems = project.gallery.map((g, gIdx) => `
        <div class="cs-media-item">
          <img src="${g.src || g.url}" alt="${g.caption || project.title}" loading="${gIdx === 0 ? 'eager' : 'lazy'}" decoding="async" class="cs-media-img" data-lightbox-src="${g.src || g.url}" data-lightbox-idx="${gIdx}">
        </div>
      `).join('');
      mediaStripHtml = `<div class="cs-media-strip">${galleryItems}</div>`;
    }

    caseStudyContent.innerHTML = `
      <div class="case-study-container">
        <div class="case-study-topbar">
          <button class="case-study-back-btn" type="button" id="closeCaseStudyBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Work</span>
          </button>
          <span style="font-family: var(--font-display); font-size: 0.875rem; color: var(--accent-cyan); font-weight: 700;">
            ${String(projectIndex + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}
          </span>
        </div>

        <header class="case-study-hero">
          <span class="section-tag">${project.category}</span>
          <h2 class="case-study-title">${project.title}</h2>
        </header>

        ${project.overview || project.summary ? `
        <section class="case-study-section">
          <h4 class="case-study-sec-title">Project Overview</h4>
          <div class="case-study-body">
            <p>${project.overview || project.summary}</p>
          </div>
        </section>
        ` : ''}

        ${project.objective ? `
        <section class="case-study-section">
          <h4 class="case-study-sec-title">The Objective</h4>
          <div class="case-study-body">
            <p>${project.objective}</p>
          </div>
        </section>
        ` : ''}

        ${project.concept ? `
        <section class="case-study-section">
          <h4 class="case-study-sec-title">Creative Concept</h4>
          <div class="case-study-body">
            <p>${project.concept}</p>
          </div>
        </section>
        ` : ''}

        ${scopeHtml}
        ${paletteHtml}
        ${typoHtml}

        ${mediaStripHtml}

        <!-- Bottom Back to Work — appears after all project media -->
        <div class="cs-bottom-back-row">
          <button class="case-study-back-btn" type="button" id="closeCaseStudyBtnBottom">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Work</span>
          </button>
        </div>

        <footer class="case-study-nav">
          ${prevProject ? `
            <button class="cs-nav-btn" type="button" id="prevProjectBtn" data-id="${prevProject.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span>Previous: ${prevProject.title}</span>
            </button>
          ` : '<div></div>'}

          ${nextProject ? `
            <button class="cs-nav-btn" type="button" id="nextProjectBtn" data-id="${nextProject.id}">
              <span>Next: ${nextProject.title}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          ` : '<div></div>'}
        </footer>
      </div>
    `;

    caseStudyModal.classList.add('open');
    // Lock BOTH body AND html to prevent the html-level scrollbar appearing
    // while the modal's own scrollbar is the single visible one
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    caseStudyModal.scrollTop = 0;

    const closeBtn = document.getElementById('closeCaseStudyBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeCaseStudy);

    // Bottom Back to Work button
    const closeBtnBottom = document.getElementById('closeCaseStudyBtnBottom');
    if (closeBtnBottom) closeBtnBottom.addEventListener('click', closeCaseStudy);

    const prevBtn = document.getElementById('prevProjectBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => openCaseStudy(prevBtn.dataset.id));

    const nextBtn = document.getElementById('nextProjectBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => openCaseStudy(nextBtn.dataset.id));

    // Wire up lightbox on images in the media strip
    caseStudyContent.querySelectorAll('.cs-media-img[data-lightbox-src]').forEach((img) => {
      img.addEventListener('click', () => openLightbox(img.dataset.lightboxSrc, parseInt(img.dataset.lightboxIdx || '-1', 10)));
    });

    // Wire up inline videos & video modal
    setupProjectVideos();
  }

  function closeCaseStudy() {
    closeVideoModal();
    if (_videoIntersectionObserver) {
      _videoIntersectionObserver.disconnect();
      _videoIntersectionObserver = null;
    }
    if (caseStudyContent) {
      // Pause all videos and clear their src to release playback resources
      caseStudyContent.querySelectorAll('.cs-media-video').forEach((v) => {
        v.pause();
        v.removeAttribute('src');
        try { v.load(); } catch (_) {}
      });
    }
    if (!caseStudyModal) return;
    caseStudyModal.classList.remove('open');
    // Restore scroll on both body and html
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  /* ==========================================================================
     LIGHTBOX — fullscreen image viewer
     ========================================================================== */
  let _lightboxImgSrcs = [];
  let _lightboxCurrentIdx = -1;

  function buildLightbox() {
    if (document.getElementById('portfolioLightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'portfolioLightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = `
      <div class="lb-backdrop"></div>
      <button class="lb-close" id="lbClose" aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <button class="lb-nav lb-prev" id="lbPrev" aria-label="Previous image">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="lb-img-wrap">
        <img class="lb-img" id="lbImg" src="" alt="">
      </div>
      <button class="lb-nav lb-next" id="lbNext" aria-label="Next image">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    `;
    document.body.appendChild(lb);

    document.getElementById('lbClose').addEventListener('click', closeLightbox);
    lb.querySelector('.lb-backdrop').addEventListener('click', closeLightbox);
    document.getElementById('lbPrev').addEventListener('click', () => shiftLightbox(-1));
    document.getElementById('lbNext').addEventListener('click', () => shiftLightbox(1));
  }

  function openLightbox(src, idx) {
    buildLightbox();
    // Collect all image srcs currently shown in the case study
    _lightboxImgSrcs = Array.from(
      caseStudyContent.querySelectorAll('.cs-media-img[data-lightbox-src]')
    ).map((el) => el.dataset.lightboxSrc);
    _lightboxCurrentIdx = idx >= 0 ? idx : _lightboxImgSrcs.indexOf(src);
    if (_lightboxCurrentIdx === -1) _lightboxCurrentIdx = 0;
    _setLightboxImage(src);
    const lb = document.getElementById('portfolioLightbox');
    lb.classList.add('open');
  }

  function _setLightboxImage(src) {
    const img = document.getElementById('lbImg');
    const prevBtn = document.getElementById('lbPrev');
    const nextBtn = document.getElementById('lbNext');
    if (!img) return;
    img.style.opacity = '0';
    img.src = src;
    img.onload = () => { img.style.opacity = '1'; };
    if (prevBtn) prevBtn.style.display = _lightboxCurrentIdx <= 0 ? 'none' : '';
    if (nextBtn) nextBtn.style.display = _lightboxCurrentIdx >= _lightboxImgSrcs.length - 1 ? 'none' : '';
  }

  function shiftLightbox(dir) {
    const next = _lightboxCurrentIdx + dir;
    if (next < 0 || next >= _lightboxImgSrcs.length) return;
    _lightboxCurrentIdx = next;
    _setLightboxImage(_lightboxImgSrcs[next]);
  }

  function closeLightbox() {
    const lb = document.getElementById('portfolioLightbox');
    if (lb) lb.classList.remove('open');
  }

  function isLightboxOpen() {
    const lb = document.getElementById('portfolioLightbox');
    return lb && lb.classList.contains('open');
  }

  /* ==========================================================================
     VIDEO SYSTEM — Behance-style inline muted autoplay & modal player with sound
     ========================================================================== */
  let _activeInlineVideo = null;
  let _videoIntersectionObserver = null;

  function buildVideoModal() {
    if (document.getElementById('portfolioVideoModal')) return;
    const vm = document.createElement('div');
    vm.id = 'portfolioVideoModal';
    vm.setAttribute('role', 'dialog');
    vm.setAttribute('aria-modal', 'true');
    vm.setAttribute('aria-label', 'Video Player');
    vm.innerHTML = `
      <div class="vm-backdrop"></div>
      <button class="vm-close" id="vmClose" type="button" aria-label="Close video player">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="vm-content">
        <video id="vmVideo" class="vm-video" playsinline controls preload="auto"></video>
      </div>
    `;
    document.body.appendChild(vm);

    document.getElementById('vmClose').addEventListener('click', closeVideoModal);
    vm.querySelector('.vm-backdrop').addEventListener('click', closeVideoModal);
  }

  function isVideoModalOpen() {
    const vm = document.getElementById('portfolioVideoModal');
    return vm && vm.classList.contains('open');
  }

  function openVideoModal(src, startTime) {
    buildVideoModal();
    const vm = document.getElementById('portfolioVideoModal');
    const vmVideo = document.getElementById('vmVideo');
    if (!vm || !vmVideo) return;

    vmVideo.src = src;
    vmVideo.currentTime = startTime || 0;
    vmVideo.muted = false;
    vmVideo.volume = 1.0;
    vmVideo.controls = true;

    vm.classList.add('open');

    const playPromise = vmVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }

  function closeVideoModal() {
    const vm = document.getElementById('portfolioVideoModal');
    const vmVideo = document.getElementById('vmVideo');
    if (!vm || !vm.classList.contains('open')) return;

    if (vmVideo) {
      vmVideo.pause();
      if (_activeInlineVideo) {
        try {
          _activeInlineVideo.currentTime = vmVideo.currentTime;
        } catch (err) {}
      }
      vmVideo.removeAttribute('src');
      vmVideo.load();
    }

    vm.classList.remove('open');

    // Return to the inline gallery & resume muted autoplay for visible video
    if (_activeInlineVideo) {
      _activeInlineVideo.muted = true;
      _activeInlineVideo.defaultMuted = true;
      _activeInlineVideo.removeAttribute('controls');
      _activeInlineVideo = null;
    }
    checkInlineVideosScroll();
  }

  function setupProjectVideos() {
    if (_videoIntersectionObserver) {
      _videoIntersectionObserver.disconnect();
      _videoIntersectionObserver = null;
    }

    const inlineVideos = caseStudyContent.querySelectorAll('.cs-media-video');
    if (!inlineVideos.length) return;

    inlineVideos.forEach((vid) => {
      vid.muted = true;
      vid.defaultMuted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.removeAttribute('controls');

      // Click to open fullscreen/modal viewer with sound
      vid.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        _activeInlineVideo = vid;
        const currentPos = vid.currentTime || 0;
        vid.pause();
        const src = vid.getAttribute('src') || vid.dataset.videoSrc;
        openVideoModal(src, currentPos);
      });
    });

    // Viewport-aware: load src + autoplay when entering, pause + release src when leaving far
    if ('IntersectionObserver' in window) {
      _videoIntersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (_activeInlineVideo === v && isVideoModalOpen()) return;

          const dataSrc = v.dataset.videoSrc;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            // Lazy-load: assign src only when approaching viewport
            if (dataSrc && !v.getAttribute('src')) {
              v.src = dataSrc;
              v.load();
            }
            v.muted = true;
            const p = v.play();
            if (p !== undefined) p.catch(() => {});
          } else if (!entry.isIntersecting && entry.intersectionRatio === 0) {
            // Fully out of view: pause and release src to free memory
            v.pause();
            if (dataSrc && v.getAttribute('src')) {
              v.removeAttribute('src');
              try { v.load(); } catch (_) {}
            }
          } else {
            // Partially visible: just pause
            v.pause();
          }
        });
      }, {
        root: caseStudyModal,
        threshold: [0, 0.2, 0.5],
        rootMargin: '200px 0px 200px 0px' // pre-load when within 200px
      });

      inlineVideos.forEach((v) => _videoIntersectionObserver.observe(v));
    }

    // Scroll listener on caseStudyModal for additional responsiveness
    caseStudyModal.removeEventListener('scroll', checkInlineVideosScroll);
    caseStudyModal.addEventListener('scroll', checkInlineVideosScroll, { passive: true });

    // Initial check after DOM settles
    setTimeout(checkInlineVideosScroll, 150);
  }

  function checkInlineVideosScroll() {
    if (!caseStudyModal || !caseStudyModal.classList.contains('open')) return;
    const inlineVideos = caseStudyContent ? caseStudyContent.querySelectorAll('.cs-media-video') : [];
    if (!inlineVideos.length) return;
    const modalRect = caseStudyModal.getBoundingClientRect();

    inlineVideos.forEach((v) => {
      if (_activeInlineVideo === v && isVideoModalOpen()) return;
      const rect = v.getBoundingClientRect();
      const visibleHeight = Math.min(rect.bottom, modalRect.bottom) - Math.max(rect.top, modalRect.top);
      const isSufficientlyVisible = visibleHeight > (rect.height * 0.2) && rect.top < modalRect.bottom && rect.bottom > modalRect.top;
      const dataSrc = v.dataset.videoSrc;

      if (isSufficientlyVisible) {
        if (dataSrc && !v.getAttribute('src')) {
          v.src = dataSrc;
          v.load();
        }
        v.muted = true;
        const p = v.play();
        if (p !== undefined) p.catch(() => {});
      } else {
        v.pause();
      }
    });
  }

  /* ==========================================================================
     4. CERTIFICATES GALLERY & MODAL (REQUIREMENT 6)
     ========================================================================== */
  const CERTIFICATE_DATA = [
    {
      id: "cert-eg24-arabic-branding",
      title: "Arabic Branding Course",
      issuer: "EG24 Academy",
      date: "Verified Credential",
      badge: "Arabic Branding",
      category: "branding",
      thumb: "assets/certificates/eg24-arabic-branding-thumb.png",
      pages: ["assets/certificates/eg24-arabic-branding.png"],
      description: "Specialized training in Arabic branding systems, typography integration, cultural visual marks, and corporate identity."
    },
    {
      id: "cert-eg24-typography",
      title: "Typography Foundations of Graphic Design",
      issuer: "EG24 Academy",
      date: "Verified Credential",
      badge: "Typography",
      category: "typography",
      thumb: "assets/certificates/eg24-typography-foundations-thumb.png",
      pages: ["assets/certificates/eg24-typography-foundations.png"],
      description: "Advanced typographic anatomy, grid layout systems, hierarchical structure, and editorial type pairings."
    },
    {
      id: "cert-art-direction-2",
      title: "Art Direction — Level 2",
      issuer: "Specialized Academy",
      date: "Verified Credential",
      badge: "Art Direction",
      category: "art-direction",
      thumb: "assets/certificates/art-direction-level-2-thumb.png",
      pages: ["assets/certificates/art-direction-level-2.png"],
      description: "Commercial campaign creative direction, visual storytelling, aesthetic consistency, and photoshoot styling."
    },
    {
      id: "cert-art-direction-intro",
      title: "Introduction to Art Direction",
      issuer: "Specialized Academy",
      date: "Verified Credential",
      badge: "Art Direction",
      category: "art-direction",
      thumb: "assets/certificates/introduction-to-art-direction-thumb.png",
      pages: ["assets/certificates/introduction-to-art-direction.png"],
      description: "Core foundations of conceptual art direction, moodboards, visual narrative craft, and brand universe design."
    },
    {
      id: "cert-linkedin-brand-design",
      title: "Brand Design Foundations",
      issuer: "LinkedIn Learning",
      date: "Verified Credential",
      badge: "Brand Identity",
      category: "branding",
      thumb: "assets/certificates/linkedin-brand-design-foundations-thumb.png",
      pages: ["assets/certificates/linkedin-brand-design-foundations.png"],
      description: "Mastery of visual brand identity systems, guidelines manuals, mark geometry, and cohesive color psychology."
    },
    {
      id: "cert-linkedin-typography",
      title: "Graphic Design Foundations: Typography",
      issuer: "LinkedIn Learning",
      date: "Verified Credential",
      badge: "Typography",
      category: "typography",
      thumb: "assets/certificates/linkedin-typography-foundations-thumb.png",
      pages: ["assets/certificates/linkedin-typography-foundations.png"],
      description: "Typographic principles, kerning refinement, responsive editorial hierarchy, and modern layout balance."
    },
    {
      id: "cert-linkedin-intro",
      title: "Introduction to Graphic Design",
      issuer: "LinkedIn Learning",
      date: "Verified Credential",
      badge: "Design Tools",
      category: "software",
      thumb: "assets/certificates/linkedin-intro-graphic-design-thumb.png",
      pages: ["assets/certificates/linkedin-intro-graphic-design.png"],
      description: "Comprehensive foundation across Photoshop, Illustrator, and InDesign for commercial design execution."
    },
    {
      id: "cert-ecommerce-branding",
      title: "E-Commerce Branding",
      issuer: "Specialized Masterclass",
      date: "Verified Credential",
      badge: "E-Commerce",
      category: "branding",
      thumb: "assets/certificates/ecommerce-branding-thumb.png",
      pages: ["assets/certificates/ecommerce-branding.png"],
      description: "Digital retail identity architecture, customer trust design, product showcase framing, and storefront branding."
    },
    {
      id: "cert-colors-theory",
      title: "Color Theory & Applications",
      issuer: "Specialized Masterclass",
      date: "Verified Credential",
      badge: "Color Psychology",
      category: "art-direction",
      thumb: "assets/certificates/colors-participation-thumb.png",
      pages: ["assets/certificates/colors-participation.png"],
      description: "Color psychology in branding, contrast accessibility, harmonious palette generation, and emotional resonance."
    },
    {
      id: "cert-composition",
      title: "Visual Composition & Layout",
      issuer: "Specialized Masterclass",
      date: "Verified Credential",
      badge: "Composition",
      category: "art-direction",
      thumb: "assets/certificates/composition-participation-thumb.png",
      pages: ["assets/certificates/composition-participation.png"],
      description: "Visual weight, diagonal energy, framing dynamics, white space rhythm, and focal hierarchy."
    },
    {
      id: "cert-social-designs",
      title: "Social Media Designs",
      issuer: "Specialized Masterclass",
      date: "Verified Credential",
      badge: "Social Media",
      category: "social",
      thumb: "assets/certificates/social-media-designs-thumb.png",
      pages: ["assets/certificates/social-media-designs.png"],
      description: "Conversion-optimized social media artwork, multi-slide carousel design, and high-impact digital campaign visual assets."
    },
    {
      id: "cert-learning-social",
      title: "Social Media Design Basics",
      issuer: "Specialized Masterclass",
      date: "Verified Credential",
      badge: "Social Strategy",
      category: "social",
      thumb: "assets/certificates/learning-social-media-design-thumb.png",
      pages: ["assets/certificates/learning-social-media-design.png"],
      description: "Feed aesthetics, visual pacing, engagement layout architecture, and creative visual messaging."
    },
    {
      id: "cert-photoshop-basics",
      title: "Adobe Photoshop Basics",
      issuer: "Adobe Training Network",
      date: "Verified Credential",
      badge: "Photoshop",
      category: "software",
      thumb: "assets/certificates/photoshop-basics-thumb.png",
      pages: ["assets/certificates/photoshop-basics.png"],
      description: "Professional raster imaging, non-destructive editing, advanced masking, blending, and commercial mockup staging."
    },
    {
      id: "cert-illustrator-basics",
      title: "Adobe Illustrator Basics",
      issuer: "Adobe Training Network",
      date: "Verified Credential",
      badge: "Illustrator",
      category: "software",
      thumb: "assets/certificates/adobe-illustrator-basics-thumb.png",
      pages: ["assets/certificates/adobe-illustrator-basics.png"],
      description: "Scalable vector graphics, bezier pen mechanics, geometric logo construction, and print-ready vector preparation."
    },
    {
      id: "cert-indesign-basics",
      title: "Adobe InDesign Basics",
      issuer: "Adobe Training Network",
      date: "Verified Credential",
      badge: "InDesign",
      category: "software",
      thumb: "assets/certificates/adobe-indesign-basics-thumb.png",
      pages: ["assets/certificates/adobe-indesign-basics.png"],
      description: "Multi-page editorial publications, grid typesetting, paragraph styles, parent pages, and print output preflight."
    },
    {
      id: "cert-ui-ux",
      title: "UI/UX Design Fundamentals",
      issuer: "Professional Certification",
      date: "Verified Credential",
      badge: "UI/UX Design",
      category: "art-direction",
      thumb: "assets/certificates/ui-ux-fundamentals-thumb.png",
      pages: ["assets/certificates/ui-ux-fundamentals.png"],
      description: "User journey mapping, wireframing, component-based design systems, usability testing, and interactive prototyping."
    },
    {
      id: "cert-ms-freelancing",
      title: "Freelancing Training",
      issuer: "Microsoft Egypt",
      date: "Verified Credential",
      badge: "Freelance Mastery",
      category: "professional",
      thumb: "assets/certificates/microsoft-freelancing-thumb.png",
      pages: ["assets/certificates/microsoft-freelancing.png"],
      description: "Global freelance consulting, international client communication, value-based pricing, and professional contract execution."
    },
    {
      id: "cert-ms-entrepreneurship",
      title: "Entrepreneurship Training",
      issuer: "Microsoft Egypt",
      date: "Verified Credential",
      badge: "Business Strategy",
      category: "professional",
      thumb: "assets/certificates/microsoft-entrepreneurship-thumb.png",
      pages: ["assets/certificates/microsoft-entrepreneurship.png"],
      description: "Business model development, market positioning, financial viability modeling, and investor pitch deck strategy."
    },
    {
      id: "cert-ms-cybersecurity",
      title: "Cyber Security Training",
      issuer: "Microsoft Egypt",
      date: "Verified Credential",
      badge: "Cyber Security",
      category: "professional",
      thumb: "assets/certificates/microsoft-cyber-security-thumb.png",
      pages: ["assets/certificates/microsoft-cyber-security.png"],
      description: "Information security fundamentals, digital threat modeling, identity access protection, and secure data workflows."
    },
    {
      id: "cert-ms-programming",
      title: "Programming Level 2 Training",
      issuer: "Microsoft Egypt",
      date: "Verified Credential",
      badge: "Computer Science",
      category: "professional",
      thumb: "assets/certificates/microsoft-programming-level-2-thumb.png",
      pages: ["assets/certificates/microsoft-programming-level-2.png"],
      description: "Software logic structuring, algorithmic thinking, object-oriented concepts, and computational problem solving."
    }
  ];

  const certModal = document.getElementById('certModal');
  const certModalContent = document.getElementById('certModalContent');
  let currentCertFilter = 'all';

  function renderCertificates(filter = 'all') {
    const container = document.getElementById('certGalleryGrid');
    if (!container) return;
    container.innerHTML = '';

    const list = filter === 'all'
      ? CERTIFICATE_DATA
      : CERTIFICATE_DATA.filter((c) => c.category === filter);

    list.forEach((cert) => {
      const card = document.createElement('article');
      card.className = 'cert-card-item reveal';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `View ${cert.title} certificate`);

      const pagesBadgeHtml = cert.pages.length > 1
        ? `<span class="cert-card-pages-badge">
             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
             ${cert.pages.length} pages
           </span>`
        : '';

      card.innerHTML = `
        <!-- Icon -->
        <div class="cert-card-icon-wrap" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="13" x2="15" y2="13"/>
            <line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
        </div>

        <!-- Text block -->
        <div class="cert-card-body">
          <span class="cert-card-tag">${cert.badge}</span>
          <h4 class="cert-card-title">${cert.title}</h4>
          <span class="cert-card-issuer">${cert.issuer}</span>
          ${pagesBadgeHtml}
        </div>

        <!-- Arrow -->
        <span class="cert-card-action" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      `;

      card.addEventListener('click', () => openCertViewer(cert, 0));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCertViewer(cert, 0);
        }
      });

      container.appendChild(card);
    });

    // Trigger reveal observer for new cards
    initScrollReveals();
  }

  // Filter Buttons Wiring
  const certFilterBar = document.getElementById('certFilterBar');
  if (certFilterBar) {
    certFilterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.cert-filter-btn');
      if (!btn) return;
      certFilterBar.querySelectorAll('.cert-filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCertFilter = btn.getAttribute('data-filter') || 'all';
      renderCertificates(currentCertFilter);
    });
  }

  /* ==========================================================================
     FULL-SCREEN HIGH-RES CERTIFICATE LIGHTBOX VIEWER (ZOOM & PAN ENGINE)
     ========================================================================== */
  let activeViewerCert = null;
  let activeViewerPageIndex = 0;
  let viewerZoom = 1.0;
  let viewerPanX = 0;
  let viewerPanY = 0;
  let viewerIsDragging = false;
  let viewerDragStartX = 0;
  let viewerDragStartY = 0;
  let viewerInitialPinchDist = 0;
  let viewerKeyHandler = null;

  function openCertViewer(cert, pageIndex = 0) {
    if (!certModal || !certModalContent) return;

    activeViewerCert = cert;
    activeViewerPageIndex = pageIndex;
    viewerZoom = 1.0;
    viewerPanX = 0;
    viewerPanY = 0;

    renderViewerModal();
    certModal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Global Key Listener for Viewer
    if (viewerKeyHandler) {
      document.removeEventListener('keydown', viewerKeyHandler);
    }
    viewerKeyHandler = (e) => {
      if (e.key === 'Escape') {
        closeCertViewer();
      } else if (e.key === 'ArrowRight') {
        if (activeViewerCert && activeViewerCert.pages.length > 1) {
          e.preventDefault();
          nextViewerPage();
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeViewerCert && activeViewerCert.pages.length > 1) {
          e.preventDefault();
          prevViewerPage();
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        changeViewerZoom(0.25);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        changeViewerZoom(-0.25);
      } else if (e.key === '0') {
        e.preventDefault();
        resetViewerZoom();
      }
    };
    document.addEventListener('keydown', viewerKeyHandler);
  }

  function renderViewerModal() {
    if (!activeViewerCert || !certModalContent) return;

    const cert = activeViewerCert;
    const totalPages = cert.pages.length;
    const curPage = activeViewerPageIndex;
    const currentImgSrc = cert.pages[curPage];

    const pageCountText = totalPages > 1 ? ` · Page ${curPage + 1} of ${totalPages}` : '';

    const navArrowsHtml = totalPages > 1 ? `
      <button class="cert-nav-arrow cert-nav-prev" id="certNavPrev" type="button" aria-label="Previous Page" ${curPage === 0 ? 'disabled' : ''}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="cert-nav-arrow cert-nav-next" id="certNavNext" type="button" aria-label="Next Page" ${curPage === totalPages - 1 ? 'disabled' : ''}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    ` : '';

    const pagerDotsHtml = totalPages > 1 ? `
      <footer class="cert-viewer-pager">
        <div class="cert-pager-dots">
          ${cert.pages.map((_, idx) => `
            <button class="cert-pager-dot ${idx === curPage ? 'active' : ''}" data-page="${idx}" type="button" aria-label="Go to Page ${idx + 1}">
              ${idx + 1}
            </button>
          `).join('')}
        </div>
      </footer>
    ` : '';

    certModalContent.innerHTML = `
      <div class="cert-viewer-modal-card" id="certViewerCard">
        <!-- Top Bar -->
        <header class="cert-viewer-topbar">
          <div class="cert-viewer-info">
            <div class="cert-viewer-meta-row">
              <span class="cert-viewer-tag">${cert.badge}</span>
              <span class="cert-viewer-sub">${cert.issuer}${pageCountText}</span>
            </div>
            <h3 class="cert-viewer-title">${cert.title}</h3>
          </div>

          <div class="cert-viewer-actions">
            <!-- Zoom Toolbar -->
            <div class="cert-zoom-toolbar" role="group" aria-label="Zoom Controls">
              <button class="cert-viewer-btn" id="certZoomOutBtn" type="button" title="Zoom Out (-)" aria-label="Zoom out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </button>
              <button class="cert-zoom-indicator" id="certZoomLevelIndicator" type="button" title="Click to Reset Zoom" aria-label="Current zoom level">
                100%
              </button>
              <button class="cert-viewer-btn" id="certZoomInBtn" type="button" title="Zoom In (+)" aria-label="Zoom in">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </button>
              <button class="cert-viewer-btn" id="certResetZoomBtn" type="button" title="Fit to Screen" aria-label="Fit to screen">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </button>
            </div>

            <!-- Close Button -->
            <button class="cert-viewer-close" id="closeCertViewerBtn" type="button" aria-label="Close certificate viewer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- Stage Viewport -->
        <div class="cert-viewer-stage" id="certViewerStage">
          <div class="cert-viewer-canvas" id="certViewerCanvas">
            <img
              src="${currentImgSrc}"
              alt="${cert.title}${pageCountText}"
              class="cert-viewer-img"
              id="certViewerImg"
              draggable="false"
              oncontextmenu="return false;"
              loading="eager"
            />
          </div>

          ${navArrowsHtml}

          <div class="cert-zoom-hint" id="certZoomHint">
            Scroll or pinch to zoom · Drag to pan
          </div>
        </div>

        ${pagerDotsHtml}
      </div>
    `;

    attachViewerEvents();
  }

  function attachViewerEvents() {
    const stage = document.getElementById('certViewerStage');
    const canvas = document.getElementById('certViewerCanvas');
    const img = document.getElementById('certViewerImg');
    const closeBtn = document.getElementById('closeCertViewerBtn');
    const zoomInBtn = document.getElementById('certZoomInBtn');
    const zoomOutBtn = document.getElementById('certZoomOutBtn');
    const resetBtn = document.getElementById('certResetZoomBtn');
    const zoomIndicator = document.getElementById('certZoomLevelIndicator');
    const prevBtn = document.getElementById('certNavPrev');
    const nextBtn = document.getElementById('certNavNext');

    if (closeBtn) closeBtn.addEventListener('click', closeCertViewer);
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => changeViewerZoom(0.3));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => changeViewerZoom(-0.3));
    if (resetBtn) resetBtn.addEventListener('click', resetViewerZoom);
    if (zoomIndicator) zoomIndicator.addEventListener('click', resetViewerZoom);

    if (prevBtn) prevBtn.addEventListener('click', prevViewerPage);
    if (nextBtn) nextBtn.addEventListener('click', nextViewerPage);

    // Page dots
    const dots = certModalContent.querySelectorAll('.cert-pager-dot');
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const p = parseInt(dot.getAttribute('data-page'), 10);
        if (!isNaN(p)) goToViewerPage(p);
      });
    });

    // Close when clicking modal backdrop
    certModal.onclick = (e) => {
      if (e.target === certModal) {
        closeCertViewer();
      }
    };

    // Zoom on Mouse Wheel
    if (stage) {
      stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        changeViewerZoom(delta);
      }, { passive: false });

      // Double Click Toggle Zoom
      stage.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (viewerZoom > 1.2) {
          resetViewerZoom();
        } else {
          setViewerZoom(2.2);
        }
      });

      // Mouse Drag to Pan
      stage.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Left click only
        if (viewerZoom <= 1.0) return;
        viewerIsDragging = true;
        viewerDragStartX = e.clientX - viewerPanX;
        viewerDragStartY = e.clientY - viewerPanY;
        if (canvas) canvas.classList.add('is-dragging');
        e.preventDefault();
      });

      window.addEventListener('mousemove', onViewerMouseMove);
      window.addEventListener('mouseup', onViewerMouseUp);

      // Touch Events for Mobile (Drag Pan & Pinch Zoom)
      stage.addEventListener('touchstart', onViewerTouchStart, { passive: false });
      stage.addEventListener('touchmove', onViewerTouchMove, { passive: false });
      stage.addEventListener('touchend', onViewerTouchEnd, { passive: false });
    }

    applyViewerTransform();
  }

  function onViewerMouseMove(e) {
    if (!viewerIsDragging) return;
    viewerPanX = e.clientX - viewerDragStartX;
    viewerPanY = e.clientY - viewerDragStartY;
    applyViewerTransform();
  }

  function onViewerMouseUp() {
    if (viewerIsDragging) {
      viewerIsDragging = false;
      const canvas = document.getElementById('certViewerCanvas');
      if (canvas) canvas.classList.remove('is-dragging');
    }
  }

  function onViewerTouchStart(e) {
    if (e.touches.length === 1) {
      if (viewerZoom > 1.0) {
        viewerIsDragging = true;
        viewerDragStartX = e.touches[0].clientX - viewerPanX;
        viewerDragStartY = e.touches[0].clientY - viewerPanY;
      }
    } else if (e.touches.length === 2) {
      viewerIsDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      viewerInitialPinchDist = Math.hypot(dx, dy);
    }
  }

  function onViewerTouchMove(e) {
    if (e.touches.length === 1 && viewerIsDragging) {
      e.preventDefault();
      viewerPanX = e.touches[0].clientX - viewerDragStartX;
      viewerPanY = e.touches[0].clientY - viewerDragStartY;
      applyViewerTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      if (viewerInitialPinchDist > 0) {
        const factor = currentDist / viewerInitialPinchDist;
        setViewerZoom(viewerZoom * factor);
        viewerInitialPinchDist = currentDist;
      }
    }
  }

  function onViewerTouchEnd(e) {
    if (e.touches.length < 2) {
      viewerInitialPinchDist = 0;
    }
    if (e.touches.length === 0) {
      viewerIsDragging = false;
    }
  }

  function setViewerZoom(newZoom) {
    viewerZoom = Math.min(3.5, Math.max(1.0, newZoom));
    if (viewerZoom <= 1.0) {
      viewerPanX = 0;
      viewerPanY = 0;
    }
    applyViewerTransform();
  }

  function changeViewerZoom(delta) {
    setViewerZoom(viewerZoom + delta);
  }

  function resetViewerZoom() {
    viewerZoom = 1.0;
    viewerPanX = 0;
    viewerPanY = 0;
    applyViewerTransform();
  }

  function applyViewerTransform() {
    const canvas = document.getElementById('certViewerCanvas');
    const zoomIndicator = document.getElementById('certZoomLevelIndicator');
    const zoomInBtn = document.getElementById('certZoomInBtn');
    const zoomOutBtn = document.getElementById('certZoomOutBtn');

    if (canvas) {
      canvas.style.transform = `translate(calc(-50% + ${viewerPanX}px), calc(-50% + ${viewerPanY}px)) scale(${viewerZoom})`;
      canvas.style.cursor = viewerZoom > 1.0 ? 'grab' : 'default';
    }

    if (zoomIndicator) {
      zoomIndicator.textContent = `${Math.round(viewerZoom * 100)}%`;
    }

    if (zoomInBtn) zoomInBtn.disabled = viewerZoom >= 3.5;
    if (zoomOutBtn) zoomOutBtn.disabled = viewerZoom <= 1.0;
  }

  function prevViewerPage() {
    if (!activeViewerCert || activeViewerPageIndex <= 0) return;
    goToViewerPage(activeViewerPageIndex - 1);
  }

  function nextViewerPage() {
    if (!activeViewerCert || activeViewerPageIndex >= activeViewerCert.pages.length - 1) return;
    goToViewerPage(activeViewerPageIndex + 1);
  }

  function goToViewerPage(index) {
    if (!activeViewerCert || index < 0 || index >= activeViewerCert.pages.length) return;
    activeViewerPageIndex = index;
    viewerZoom = 1.0;
    viewerPanX = 0;
    viewerPanY = 0;
    renderViewerModal();
  }

  function closeCertViewer() {
    if (!certModal) return;
    certModal.classList.remove('open');
    document.body.style.overflow = '';
    activeViewerCert = null;

    if (viewerKeyHandler) {
      document.removeEventListener('keydown', viewerKeyHandler);
      viewerKeyHandler = null;
    }
    window.removeEventListener('mousemove', onViewerMouseMove);
    window.removeEventListener('mouseup', onViewerMouseUp);
  }

  /* ==========================================================================
     5. "START A PROJECT" CHOICE MODAL (REQUIREMENT 7)
     ========================================================================== */
  const choiceModal = document.getElementById('choiceModal');
  const closeChoiceBtn = document.getElementById('closeChoiceBtn');

  function openChoiceModal() {
    if (!choiceModal) return;
    choiceModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeChoiceModal() {
    if (!choiceModal) return;
    choiceModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeChoiceBtn) {
    closeChoiceBtn.addEventListener('click', closeChoiceModal);
  }

  // Hook all "Start a Project" and "Let's Work Together" triggers
  document.querySelectorAll('[data-open-choice-modal]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openChoiceModal();
    });
  });

  /* ==========================================================================
     6. REFINED VIEWPORT ENTRANCE ANIMATIONS & NUMBER COUNTERS (REQUIREMENT 2 & 3)
     ========================================================================== */
  function initScrollReveals() {
    const revealElements = document.querySelectorAll('.reveal:not(.is-visible), .reveal-stagger:not(.is-visible)');
    
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.01,
        rootMargin: '100px 0px 100px 0px'
      });

      revealElements.forEach((el) => revealObserver.observe(el));
    } else {
      revealElements.forEach((el) => el.classList.add('is-visible'));
    }
  }

  function initCapabilityAnimations() {
    const cards = document.querySelectorAll('.service-card[data-service-card]');
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      cards.forEach((card) => card.classList.add('is-animated'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const index = Array.from(cards).indexOf(card);
          // Sequential staggered delay: 01 first, 02 slightly after, etc.
          const delay = Math.max(0, index * 100);
          setTimeout(() => {
            card.classList.add('is-animated');
          }, delay);
          obs.unobserve(card);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    cards.forEach((card) => observer.observe(card));
  }

  function initNumberCounters() {
    const counterElements = document.querySelectorAll('[data-count-to]');
    
    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targetEl = entry.target;
            const targetVal = parseInt(targetEl.getAttribute('data-count-to'), 10) || 0;
            animateCounter(targetEl, targetVal);
            obs.unobserve(targetEl);
          }
        });
      }, { threshold: 0.2 });

      counterElements.forEach((el) => counterObserver.observe(el));
    } else {
      counterElements.forEach((el) => {
        el.textContent = el.getAttribute('data-count-to');
      });
    }
  }

  function animateCounter(element, target) {
    const duration = 1200; // ms
    const startTime = performance.now();

    function updateNumber(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeVal = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeVal * target);
      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = target;
      }
    }

    requestAnimationFrame(updateNumber);
  }

  /* ==========================================================================
     7. GLOBAL KEYBOARD & BACKDROP EVENTS
     ========================================================================== */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isVideoModalOpen()) {
        closeVideoModal();
        return;
      }
      if (isLightboxOpen()) {
        closeLightbox();
        return;
      }
      closeCaseStudy();
      closeCertModal();
      closeChoiceModal();
    }
    if (e.key === 'ArrowLeft') shiftLightbox(-1);
    if (e.key === 'ArrowRight') shiftLightbox(1);
  });

  if (caseStudyModal) {
    caseStudyModal.addEventListener('click', (e) => {
      if (e.target === caseStudyModal) closeCaseStudy();
    });
  }

  if (certModal) {
    certModal.addEventListener('click', (e) => {
      if (e.target === certModal) closeCertModal();
    });
  }

  if (choiceModal) {
    choiceModal.addEventListener('click', (e) => {
      if (e.target === choiceModal) closeChoiceModal();
    });
  }

  /* ==========================================================================
     8. NAVIGATION & MOBILE MENU
     ========================================================================== */
  const navLinks = document.querySelectorAll('.nav-link');
  const menuToggle = document.getElementById('menuToggle');
  const navLinksList = document.getElementById('navLinks');
  const backToTopBtn = document.getElementById('backToTopBtn');

  if (menuToggle && navLinksList) {
    menuToggle.addEventListener('click', () => {
      navLinksList.classList.toggle('open');
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#' || this.hasAttribute('data-open-choice-modal')) return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        if (navLinksList) navLinksList.classList.remove('open');
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const observedSections = document.querySelectorAll('section[id]');
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-25% 0px -65% 0px' });

    observedSections.forEach((sec) => navObserver.observe(sec));
  }

  /* ==========================================================================
     9. INITIALIZATION
     ========================================================================== */
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', resizeCanvas, { passive: true });

  detectFramePath().then(() => {
    resizeCanvas();
    updateScrollProgress();
    preloadHeroFrames();
    requestRender();
  });

  renderCategorySections();
  renderCertificates();
  initScrollReveals();
  initNumberCounters();
  initCapabilityAnimations();
})();
