(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------------------------------------------------------
     Theme toggle (persisted via localStorage)
  --------------------------------------------------------- */
  (function initTheme(){
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    let stored = null;
    try { stored = localStorage.getItem('ya-theme'); } catch (e) { /* storage unavailable */ }

    if (stored === 'light' || stored === 'dark') {
      root.setAttribute('data-theme', stored);
    }

    const isLight = () => root.getAttribute('data-theme') === 'light';
    btn.setAttribute('aria-pressed', String(isLight()));

    btn.addEventListener('click', () => {
      const next = isLight() ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      btn.setAttribute('aria-pressed', String(next === 'light'));
      try { localStorage.setItem('ya-theme', next); } catch (e) { /* ignore */ }
    });
  })();

  /* ---------------------------------------------------------
     Mobile menu
  --------------------------------------------------------- */
  (function initMenu(){
    const toggle = document.getElementById('menu-toggle');
    const links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    const close = () => {
      links.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    };
    const open = () => {
      links.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
    };

    toggle.addEventListener('click', () => {
      links.classList.contains('is-open') ? close() : open();
    });

    links.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) close();
    });
  })();

  /* ---------------------------------------------------------
     Active nav link on scroll
  --------------------------------------------------------- */
  (function initActiveNav(){
    const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
    const sections = navLinks
      .map(link => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (!('IntersectionObserver' in window) || !sections.length) return;

    const map = new Map();
    navLinks.forEach((link, i) => map.set(sections[i], link));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = map.get(entry.target);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));
  })();

  /* ---------------------------------------------------------
     Scroll reveal
  --------------------------------------------------------- */
  (function initReveal(){
    const items = document.querySelectorAll('.reveal, .reveal-line');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => observer.observe(el));

    // Hero reveal-line elements should animate immediately on load, staggered.
    document.querySelectorAll('.hero .reveal-line').forEach((el, i) => {
      setTimeout(() => el.classList.add('is-visible'), 150 + i * 120);
    });
  })();

  /* ---------------------------------------------------------
     Custom cursor (desktop only)
  --------------------------------------------------------- */
  (function initCursor(){
    if (isTouch || prefersReducedMotion) return;
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    function loop(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const interactive = 'a, button, input, select, textarea, .project-card, [data-cursor-active]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactive)) ring.classList.add('is-active');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactive)) ring.classList.remove('is-active');
    });
  })();

  /* ---------------------------------------------------------
     Hero atmosphere — mouse-following glow
  --------------------------------------------------------- */
  (function initHeroGlow(){
    if (prefersReducedMotion) return;
    const hero = document.querySelector('.hero');
    const atmosphere = document.getElementById('hero-atmosphere');
    if (!hero || !atmosphere) return;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      atmosphere.style.setProperty('--mx', `${x}%`);
      atmosphere.style.setProperty('--my', `${y}%`);
    });
  })();

  /* ---------------------------------------------------------
     Hero portrait parallax — subtle tilt on mousemove,
     subtle drift on scroll
  --------------------------------------------------------- */
  (function initPortraitParallax(){
    if (isTouch || prefersReducedMotion) return;
    const frame = document.getElementById('hero-frame');
    if (!frame) return;

    frame.addEventListener('mousemove', (e) => {
      const rect = frame.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      frame.style.transform = `rotateY(${px * 6}deg) rotateX(${py * -6}deg)`;
    });
    frame.addEventListener('mouseleave', () => {
      frame.style.transform = '';
    });
  })();

  (function initScrollParallax(){
    if (prefersReducedMotion) return;
    const portrait = document.querySelector('.hero-portrait');
    const hero = document.querySelector('.hero');
    if (!portrait || !hero) return;

    let ticking = false;
    function update(){
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(Math.max(-rect.top / (rect.height || 1), 0), 1);
      portrait.style.setProperty('--parallax-y', `${progress * 26}px`);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---------------------------------------------------------
     Floating background particles
  --------------------------------------------------------- */
  (function initParticles(){
    if (prefersReducedMotion) return;
    const host = document.getElementById('bg-particles');
    if (!host) return;

    const count = window.innerWidth < 720 ? 10 : 20;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      const size = 2 + Math.random() * 3;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.bottom = `${-10 - Math.random() * 20}%`;
      p.style.setProperty('--drift', `${(Math.random() - 0.5) * 60}px`);
      p.style.animationDuration = `${18 + Math.random() * 22}s`;
      p.style.animationDelay = `-${Math.random() * 30}s`;
      frag.appendChild(p);
    }
    host.appendChild(frag);
  })();

  /* ---------------------------------------------------------
     Animated counters (e.g. "5+" years of experience)
  --------------------------------------------------------- */
  (function initCounters(){
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    function animateCounter(el){
      const target = parseFloat(el.dataset.countTo || '0');
      if (prefersReducedMotion || !target) {
        el.textContent = target;
        return;
      }
      const duration = 900;
      const start = performance.now();
      function tick(now){
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => observer.observe(el));
  })();

  /* ---------------------------------------------------------
     Magnetic buttons
  --------------------------------------------------------- */
  (function initMagnetic(){
    if (isTouch || prefersReducedMotion) return;
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  })();

  /* ---------------------------------------------------------
     Social Media project pages — internal hash router
     (#project/orvix, #project/meow-woof, #project/suzy-kitchen,
     #project/perfect-bite). No external navigation involved.
  --------------------------------------------------------- */
  (function initProjectRouter(){
    const pages = document.querySelectorAll('.project-page');
    if (!pages.length) return;

    const pageMap = new Map();
    pages.forEach(page => pageMap.set(page.dataset.project, page));

    let lastScrollY = 0;
    let openPage = null;

    function open(slug){
      const page = pageMap.get(slug);
      if (!page) return;
      lastScrollY = window.scrollY;
      openPage = page;
      page.classList.add('is-open');
      page.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      page.scrollTop = 0;
      const backBtn = page.querySelector('.project-back');
      if (backBtn) backBtn.focus({ preventScroll: true });
    }

    function close(){
      if (!openPage) return;
      openPage.classList.remove('is-open');
      openPage.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      openPage = null;
      window.scrollTo({ top: lastScrollY, behavior: prefersReducedMotion ? 'auto' : 'instant' in window ? 'instant' : 'auto' });
    }

    function syncToHash(){
      const match = /^#project\/(.+)$/.exec(window.location.hash);
      if (match && pageMap.has(match[1])) {
        open(match[1]);
      } else if (openPage) {
        close();
      }
    }

    document.querySelectorAll('[data-open-project]').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const slug = trigger.dataset.openProject;
        window.location.hash = `project/${slug}`;
      });
    });

    document.querySelectorAll('[data-close-project]').forEach(btn => {
      btn.addEventListener('click', () => {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#work');
        close();
      });
    });

    window.addEventListener('hashchange', syncToHash);
    syncToHash();
  })();

  /* ---------------------------------------------------------
     Experience accordion
  --------------------------------------------------------- */
  (function initTimeline(){
    document.querySelectorAll('.timeline-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.timeline-item');
        const isOpen = item.classList.contains('is-open');
        item.classList.toggle('is-open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  })();

  /* ---------------------------------------------------------
     Contact form validation (frontend only, no backend)
  --------------------------------------------------------- */
  (function initForm(){
    const form = document.getElementById('contact-form');
    if (!form) return;
    const status = document.getElementById('form-status');

    const rules = {
      name: v => v.trim().length >= 2 || 'Please enter your name.',
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Please enter a valid email address.',
      projectType: v => v.trim().length > 0 || 'Please select a project type.',
      message: v => v.trim().length >= 10 || 'Please add a short message (10+ characters).'
    };

    function validateField(field){
      const input = form.elements[field];
      const wrap = input.closest('.field');
      const errorEl = document.getElementById(`err-${field === 'projectType' ? 'type' : field}`);
      const result = rules[field](input.value);
      if (result === true) {
        wrap.classList.remove('has-error');
        if (errorEl) errorEl.textContent = '';
        return true;
      }
      wrap.classList.add('has-error');
      if (errorEl) errorEl.textContent = result;
      return false;
    }

    Object.keys(rules).forEach(field => {
      const input = form.elements[field];
      if (!input) return;
      input.addEventListener('blur', () => validateField(field));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const validations = Object.keys(rules).map(validateField);
      const allValid = validations.every(Boolean);

      if (!allValid) {
        status.textContent = 'Please fix the highlighted fields.';
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn.disabled) return; // guard against duplicate submissions

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      status.textContent = 'Sending your message…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            status.textContent = `Thanks, ${form.elements.name.value.trim()} — your message has been sent.`;
            form.reset();
          } else {
            status.textContent = 'Something went wrong sending your message. Please try again.';
          }
        })
        .catch(() => {
          status.textContent = 'Network error — please check your connection and try again.';
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });
  })();

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  document.getElementById('year').textContent = new Date().getFullYear();

})();
