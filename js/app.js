/* ════════════════════════════════════════════════════
   MAYRA RAMÍREZ EVENT STUDIO — app.js
   ════════════════════════════════════════════════════ */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initParticles();
  initNavbar();
  initScrollReveal();
  initAccordion();
  initContactForm();
  initScrollTop();
  initFooterYear();
  initSmoothScroll();   // al final, separado y controlado
  initTiltCards();
  initHeroParallax();
  initSecretMenu();
  if ($('#carousel')) initCarousel();
  if ($('#lightbox'))  initLightbox();
});

/* ─── 1. PARTÍCULAS HERO ─────────────────────────── */
function initParticles() {
  const container = $('#particles');
  if (!container) return;
  const count = window.innerWidth < 600 ? 20 : 40;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.cssText = `
      width:${Math.random()*3+1}px;
      height:${Math.random()*3+1}px;
      left:${Math.random()*100}%;
      bottom:-10px;
      animation-duration:${Math.random()*20+15}s;
      animation-delay:${Math.random()*15}s;
      opacity:${Math.random()*.6+.2};
    `;
    container.appendChild(p);
  }
}

/* ─── 2. NAVBAR ──────────────────────────────────── */
function initNavbar() {
  const navbar = $('#navbar');
  const toggle = $('#navToggle');
  const menu   = $('#navMenu');
  if (!navbar || !toggle || !menu) return;

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    const sections = $$('section[id]');
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    $$('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  $$('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('click', e => {
    if (menu.classList.contains('open') &&
        !menu.contains(e.target) &&
        !toggle.contains(e.target)) {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    }
  });
}

/* ─── 3. SCROLL REVEAL ───────────────────────────── */
function initScrollReveal() {
  const selectors = [
    '.servicio-card', '.porto-card', '.stat-item', '.testimonial-card',
    '.galeria-item', '.proceso-step', '.accordion-item', '.nosotros-content',
    '.nosotros-visual', '.contacto-info', '.contacto-form-wrapper',
    '.section-header', '.mvv-item', '.valor-chip', '.instruccion-card',
    '.portafolio-vacio', '.testimonios-vacio',
  ];
  selectors.forEach(sel => {
    $$(sel).forEach((el, i) => {
      el.classList.add('reveal');
      const delay = [0, .1, .2, .3, .4][i % 5];
      if (delay > 0) el.style.transitionDelay = `${delay}s`;
    });
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => observer.observe(el));
}

/* ─── 4. FAQ ACORDEÓN ────────────────────────────── */
function initAccordion() {
  const triggers = $$('.accordion-trigger');
  if (!triggers.length) return;

  function toggleItem(trigger) {
    const panelId = trigger.getAttribute('aria-controls');
    const panel   = document.getElementById(panelId);
    const isOpen  = trigger.getAttribute('aria-expanded') === 'true';

    // Cerrar todos
    triggers.forEach(t => {
      t.setAttribute('aria-expanded', 'false');
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.classList.remove('open');
    });

    // Abrir el clickeado si estaba cerrado
    if (!isOpen && panel) {
      trigger.setAttribute('aria-expanded', 'true');
      panel.classList.add('open');
    }
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => toggleItem(trigger));
    trigger.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleItem(trigger); }
    });
  });
}

/* ─── 5. CARRUSEL TESTIMONIOS ────────────────────── */
function initCarousel() {
  const carousel = $('#carousel');
  const prevBtn  = $('#carouselPrev');
  const nextBtn  = $('#carouselNext');
  const dotsEl   = $('#carouselDots');
  if (!carousel) return;

  const slides = $$('.testimonial-slide', carousel);
  const total  = slides.length;
  let current  = 0;
  let autoplay;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('carousel-dot');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
    if (i === 0) { dot.classList.add('active'); dot.setAttribute('aria-selected', 'true'); }
    dot.addEventListener('click', () => goTo(i));
    dotsEl?.appendChild(dot);
  });

  const dots = $$('.carousel-dot', dotsEl || document);

  function goTo(index) {
    current = (index + total) % total;
    carousel.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', String(i === current));
    });
  }

  prevBtn?.addEventListener('click', () => { goTo(current - 1); resetAutoplay(); });
  nextBtn?.addEventListener('click', () => { goTo(current + 1); resetAutoplay(); });

  function startAutoplay() { autoplay = setInterval(() => goTo(current + 1), 5500); }
  function resetAutoplay() { clearInterval(autoplay); startAutoplay(); }
  startAutoplay();

  carousel.addEventListener('mouseenter', () => clearInterval(autoplay));
  carousel.addEventListener('mouseleave', () => startAutoplay());

  let touchStartX = 0;
  carousel.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) { goTo(delta < 0 ? current + 1 : current - 1); resetAutoplay(); }
  }, { passive: true });
}

/* ─── 6. LIGHTBOX ────────────────────────────────── */
function initLightbox() {
  const lightbox = $('#lightbox');
  const content  = $('#lightboxContent');
  const closeBtn = $('#lightboxClose');
  const prevBtn  = $('#lightboxPrev');
  const nextBtn  = $('#lightboxNext');
  if (!lightbox) return;

  const items = $$('[data-lightbox]');
  if (!items.length) return;

  let current = 0;

  function open(idx) {
    current = idx;
    render();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }
  function render() {
    const sourceEl = items[current].querySelector('[style]') || items[current].querySelector('.galeria-img');
    const bg = sourceEl ? (sourceEl.style.background || getComputedStyle(sourceEl).background) : '#0a1628';
    content.innerHTML = `<div style="background:${bg};width:100%;height:100%;border-radius:12px;"></div>`;
  }

  items.forEach((item, i) => item.addEventListener('click', () => open(i)));
  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => { current = (current - 1 + items.length) % items.length; render(); });
  nextBtn?.addEventListener('click', () => { current = (current + 1) % items.length; render(); });
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft')  { current = (current - 1 + items.length) % items.length; render(); }
    if (e.key === 'ArrowRight') { current = (current + 1) % items.length; render(); }
  });
}

/* ─── 7. FORMULARIO → WHATSAPP ───────────────────── */
function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;

  const WHATSAPP_NUMBER = '573166782099';

  const fields = {
    nombre:     { el: $('#nombre'),     error: $('#nombreError'),
                  validate: v => v.trim().length >= 2 ? '' : 'Ingresa tu nombre completo.' },
    telefono:   { el: $('#telefono'),   error: $('#telefonoError'),
                  validate: v => /^[\d\s\+\-\(\)]{7,}$/.test(v.trim()) ? '' : 'Ingresa un número válido.' },
    tipoEvento: { el: $('#tipoEvento'), error: $('#tipoEventoError'),
                  validate: v => v !== '' ? '' : 'Selecciona el tipo de evento.' },
    mensaje:    { el: $('#mensaje'),    error: $('#mensajeError'),
                  validate: v => v.trim().length >= 5 ? '' : 'Describe tu evento.' },
  };

  // Validación al salir de cada campo
  Object.values(fields).forEach(({ el, error, validate }) => {
    if (!el) return;
    el.addEventListener('blur', () => {
      const msg = validate(el.value);
      error.textContent = msg;
      el.classList.toggle('error', !!msg);
    });
    el.addEventListener('input', () => {
      if (el.classList.contains('error')) {
        const msg = validate(el.value);
        error.textContent = msg;
        el.classList.toggle('error', !!msg);
      }
    });
  });

  // SUBMIT — abre WhatsApp inmediatamente (sin setTimeout)
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();

    // Validar todos
    let valid = true;
    Object.values(fields).forEach(({ el, error, validate }) => {
      if (!el) return;
      const msg = validate(el.value);
      error.textContent = msg;
      el.classList.toggle('error', !!msg);
      if (msg) valid = false;
    });

    if (!valid) {
      const firstError = form.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    // Leer valores
    const nombre     = document.getElementById('nombre').value.trim();
    const telefono   = document.getElementById('telefono').value.trim();
    const correo     = document.getElementById('correo')?.value.trim() || 'No especificado';
    const tipoEvento = document.getElementById('tipoEvento').value;
    const fecha      = document.getElementById('fechaEvento')?.value || 'Por definir';
    const mensaje    = document.getElementById('mensaje').value.trim();

    const tipoLabels = {
      matrimonio: 'Matrimonio', quince: 'Quince Años', cumpleanos: 'Cumpleaños',
      empresarial: 'Evento Empresarial', feria: 'Feria / Expo',
      lanzamiento: 'Lanzamiento de Marca', institucional: 'Institucional',
      familiar: 'Celebración Familiar', otro: 'Otro',
    };
    const tipoTexto = tipoLabels[tipoEvento] || tipoEvento;

    // Armar texto del mensaje
    const textoWA =
      `Hola Mayra! Me interesa cotizar un evento 🎉\n\n` +
      `*Nombre:* ${nombre}\n` +
      `*Teléfono:* ${telefono}\n` +
      `*Correo:* ${correo}\n` +
      `*Tipo de evento:* ${tipoTexto}\n` +
      `*Fecha tentativa:* ${fecha}\n\n` +
      `*Detalles:*\n${mensaje}`;

    // Abrir WhatsApp INMEDIATAMENTE (sin setTimeout para evitar bloqueo del navegador)
    const urlWA = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(textoWA)}`;
    window.open(urlWA, '_blank', 'noopener');

    // Limpiar formulario
    form.reset();

    // Mostrar confirmación visual
    const submitBtn = form.querySelector('[type="submit"]');
    const btnText   = form.querySelector('.btn-text');
    if (btnText) btnText.textContent = '¡Mensaje enviado a WhatsApp! ✓';
    submitBtn.style.background = '#2ea843';
    setTimeout(() => {
      if (btnText) btnText.textContent = 'Enviar por WhatsApp';
      submitBtn.style.background = '';
    }, 4000);
  });
}

/* ─── 8. SCROLL TOP ──────────────────────────────── */
function initScrollTop() {
  const btn = $('#scrollTop');
  if (!btn) return;
  window.addEventListener('scroll', () => { btn.hidden = window.scrollY < 500; }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ─── 9. AÑO FOOTER ──────────────────────────────── */
function initFooterYear() {
  const el = $('#footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ─── 10. SMOOTH SCROLL (solo enlaces ancla, NO el formulario) ── */
function initSmoothScroll() {
  // Solo aplica a <a> que empiecen con # — el formulario no es un <a>
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = document.querySelector('.navbar')?.offsetHeight || 80;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - navH,
        behavior: 'smooth'
      });
    });
  });
}

/* ─── 11. TOGGLE DE TEMA (claro / oscuro) ────────── */
function initThemeToggle() {
  const btn  = $('#themeToggle');
  if (!btn) return;
  const root = document.documentElement;

  function applyLabel() {
    const isLight = root.getAttribute('data-theme') === 'light';
    btn.setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  }
  applyLabel();

  btn.addEventListener('click', () => {
    const isLight = root.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('mr-theme', next); } catch (e) { /* almacenamiento no disponible */ }
    applyLabel();
  });
}

/* ─── 12. TILT 3D EN TARJETAS ────────────────────── */
function initTiltCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 700px)').matches) return; // sin tilt en móvil (sin mouse)

  const cards = $$('.tilt-card');
  const MAX_TILT = 8; // grados

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = x / rect.width;   // 0 a 1
      const py = y / rect.height;  // 0 a 1

      const tiltX = (py - 0.5) * -MAX_TILT * 2;
      const tiltY = (px - 0.5) *  MAX_TILT * 2;

      card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });
}

/* ─── 13. PARALLAX SUTIL EN EL HERO ──────────────── */

/* ─── 14. EASTER EGG — 5 clics en el logo activa menú privado ── */
function initSecretMenu() {
  const logo = document.querySelector('.nav-logo');
  if (!logo) return;

  let clicks = 0;
  let timer;

  logo.addEventListener('click', (e) => {
    e.preventDefault();
    clicks++;
    clearTimeout(timer);

    if (clicks >= 5) {
      clicks = 0;
      // Mostrar botones privados
      document.querySelectorAll('.nav-private').forEach(el => {
        el.style.display = el.style.display === 'none' ? 'flex' : 'none';
      });
      // Feedback visual sutil
      logo.style.filter = 'drop-shadow(0 0 12px rgba(201,168,76,.9))';
      setTimeout(() => { logo.style.filter = ''; }, 800);
    }

    // Reset si pasan 2 segundos sin clic
    timer = setTimeout(() => { clicks = 0; }, 2000);
  });
}

function initHeroParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 900px)').matches) return;

  const hero = $('.hero');
  const heroContent = $('#heroContent');
  const orbs = $$('.hero-orb');
  const rings = $$('.hero-ring');
  if (!hero) return;

  hero.style.perspective = '1200px';

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 a 0.5
    const py = (e.clientY - rect.top)  / rect.height - 0.5;

    // Contenido principal: tilt 3D notorio + traslación
    if (heroContent) {
      const tiltX = py * -6;   // grados
      const tiltY = px * 8;
      heroContent.style.transform =
        `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate(${px * -16}px, ${py * -12}px)`;
    }

    // Orbes se mueven según su profundidad individual (data-depth)
    orbs.forEach(orb => {
      const depth = parseFloat(orb.dataset.depth) || 0.03;
      const moveX = px * depth * 600;
      const moveY = py * depth * 600;
      orb.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + Math.abs(px * py) * 0.3})`;
    });

    // Anillos: traslación adicional sobre su rotación CSS (usamos un wrapper de translate)
    rings.forEach(ring => {
      const depth = parseFloat(ring.dataset.depth) || 0.05;
      const moveX = px * depth * 500;
      const moveY = py * depth * 500;
      ring.style.marginLeft = `${moveX}px`;
      ring.style.marginTop  = `${moveY}px`;
    });
  });

  hero.addEventListener('mouseleave', () => {
    if (heroContent) heroContent.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translate(0,0)';
    orbs.forEach(orb => { orb.style.transform = 'translate(0, 0) scale(1)'; });
    rings.forEach(ring => { ring.style.marginLeft = '0'; ring.style.marginTop = '0'; });
  });
}