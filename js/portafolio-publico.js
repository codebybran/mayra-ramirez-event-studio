// ════════════════════════════════════════════════════
// PORTAFOLIO PÚBLICO — portafolio-publico.js
// ════════════════════════════════════════════════════

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => { cargarPortafolio(); });

const tipoEmoji = {
  'Matrimonio': '💍', 'Quince Años': '👑', 'Cumpleaños': '🎂',
  'Evento Empresarial': '🏢', 'Feria / Expo': '🎪',
  'Lanzamiento de Marca': '🚀', 'Institucional': '🏛️',
  'Celebración Familiar': '🥂', 'Otro': '✨'
};

async function cargarPortafolio() {
  const contenedor = document.getElementById('portafolioContenido');
  if (!contenedor) return;
  try {
    const q = query(collection(db, 'portafolio'), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) { mostrarVacio(contenedor); return; }
    const eventos = [];
    snapshot.forEach(docSnap => { eventos.push({ id: docSnap.id, ...docSnap.data() }); });
    renderizarPortafolio(contenedor, eventos);
  } catch (err) {
    console.error('Error cargando portafolio:', err);
    mostrarVacio(contenedor);
  }
}

function renderizarPortafolio(contenedor, eventos) {
  const tipos = [...new Set(eventos.map(ev => ev.tipo).filter(Boolean))];

  contenedor.innerHTML = `
    <div class="portafolio-filters" id="portafolioFiltros">
      <button class="filter-btn active" data-filtro="todos">Todos</button>
      ${tipos.map(tipo => `<button class="filter-btn" data-filtro="${escapeHtml(tipo)}">${tipoEmoji[tipo] || '✨'} ${escapeHtml(tipo)}</button>`).join('')}
    </div>
    <div class="portafolio-grid" id="portafolioGrid">
      ${eventos.map(ev => crearTarjetaHTML(ev)).join('')}
    </div>
    <div class="porto-modal" id="portoModal" hidden>
      <div class="porto-modal-overlay" id="portoModalOverlay"></div>
      <div class="porto-modal-content" id="portoModalContent">
        <button class="porto-modal-close" id="portoModalClose" aria-label="Cerrar">✕</button>
        <div id="portoModalBody"></div>
      </div>
    </div>
  `;

  const filtrosBtns = contenedor.querySelectorAll('.filter-btn');
  const cards       = contenedor.querySelectorAll('.porto-card');

  filtrosBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filtrosBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtro = btn.dataset.filtro;
      cards.forEach(card => {
        card.classList.toggle('hidden', filtro !== 'todos' && card.dataset.tipo !== filtro);
      });
    });
  });

  contenedor.querySelectorAll('.porto-card').forEach(card => {
    card.addEventListener('click', () => {
      const ev = eventos.find(e => e.id === card.dataset.id);
      if (ev) abrirModal(ev, contenedor);
    });
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
  });

  const modal        = contenedor.querySelector('#portoModal');
  const modalOverlay = contenedor.querySelector('#portoModalOverlay');
  const modalClose   = contenedor.querySelector('#portoModalClose');

  const cerrarModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    const iframes = modal.querySelectorAll('iframe');
    iframes.forEach(iframe => { iframe.src = iframe.src; });
  };

  modalOverlay.addEventListener('click', cerrarModal);
  modalClose.addEventListener('click', cerrarModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrarModal(); });
}

function abrirModal(ev, contenedor) {
  const modal     = contenedor.querySelector('#portoModal');
  const modalBody = contenedor.querySelector('#portoModalBody');
  const fechaFmt  = formatearFecha(ev.fecha);
  const nFotos    = (ev.fotos || []).length;
  const videos    = ev.videos || (ev.videoUrl ? [ev.videoUrl] : []);
  const nVideos   = videos.length;

  modalBody.innerHTML = `
    ${nFotos > 0 ? `
      <div class="porto-modal-gallery">
        <div class="porto-modal-gallery-main">
          <img src="${ev.fotos[0]}" alt="Foto principal" id="portoGalleryMain" />
        </div>
        ${nFotos > 1 ? `
          <div class="porto-modal-gallery-thumbs">
            ${ev.fotos.map((url, i) => `
              <img src="${url}" alt="Foto ${i+1}" class="porto-gallery-thumb ${i===0?'active':''}" data-url="${url}" />
            `).join('')}
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="porto-modal-info">
      <span class="porto-cat">${tipoEmoji[ev.tipo] || '✨'} ${escapeHtml(ev.tipo || '')}</span>
      <h2 class="porto-modal-title">${escapeHtml(ev.nombre)}</h2>
      <div class="porto-meta" style="margin:.75rem 0 1rem;">
        <span>📍 ${escapeHtml(ev.ciudad || '')}</span>
        <span>📅 ${fechaFmt}</span>
        ${nFotos > 0 ? `<span>📸 ${nFotos} foto${nFotos!==1?'s':''}</span>` : ''}
        ${nVideos > 0 ? `<span>🎬 ${nVideos} video${nVideos!==1?'s':''}</span>` : ''}
      </div>
      ${ev.descripcion ? `<p class="porto-desc" style="word-break:break-word;">${escapeHtml(ev.descripcion)}</p>` : ''}
    </div>

    ${nVideos > 0 ? `
      <div class="porto-modal-videos">
        ${videos.map((url, i) => `
          <div class="porto-modal-video">
            ${nVideos > 1 ? `<p style="font-family:var(--font-display);font-size:1rem;color:var(--navy);margin-bottom:.5rem;padding:0 1.75rem;">🎬 Video ${i+1}</p>` : ''}
            <iframe
              src="${url}?rel=0&modestbranding=1"
              title="Video ${i+1}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  if (nFotos > 1) {
    const mainImg = modalBody.querySelector('#portoGalleryMain');
    modalBody.querySelectorAll('.porto-gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        mainImg.src = thumb.dataset.url;
        modalBody.querySelectorAll('.porto-gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function crearTarjetaHTML(ev) {
  const thumbUrl = ev.fotos && ev.fotos.length > 0 ? ev.fotos[0] : null;
  const fechaFmt = formatearFecha(ev.fecha);
  const emoji    = tipoEmoji[ev.tipo] || '✨';
  const nFotos   = (ev.fotos || []).length;
  const videos   = ev.videos || (ev.videoUrl ? [ev.videoUrl] : []);
  const nVideos  = videos.length;
  const desc     = ev.descripcion && ev.descripcion.length > 120
    ? ev.descripcion.slice(0, 120) + '…'
    : (ev.descripcion || '');

  return `
    <article class="porto-card" data-tipo="${escapeHtml(ev.tipo||'')}" data-id="${ev.id}" tabindex="0" role="button" aria-label="Ver detalles de ${escapeHtml(ev.nombre)}" style="cursor:pointer;">
      <div class="porto-img">
        ${thumbUrl
          ? `<img src="${thumbUrl}" alt="${escapeHtml(ev.nombre)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`
          : `<div class="porto-img-1" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span style="font-size:3rem;">${emoji}</span></div>`
        }
        <div class="porto-overlay">
          <span class="porto-cat">${emoji} ${escapeHtml(ev.tipo||'')}</span>
        </div>
      </div>
      <div class="porto-info">
        <h3 class="porto-name">${escapeHtml(ev.nombre)}</h3>
        <div class="porto-meta">
          <span>📍 ${escapeHtml(ev.ciudad||'')}</span>
          <span>📅 ${fechaFmt}</span>
          ${nFotos > 0 ? `<span>📸 ${nFotos}</span>` : ''}
          ${nVideos > 0 ? `<span>🎬 ${nVideos}</span>` : ''}
        </div>
        ${desc ? `<p class="porto-desc">${escapeHtml(desc)}</p>` : ''}
      </div>
    </article>
  `;
}

function mostrarVacio(contenedor) {
  contenedor.innerHTML = `
    <div class="portafolio-vacio">
      <div class="porto-vacio-icon">🎉</div>
      <h3 class="porto-vacio-title">¡El primer evento está por llegar!</h3>
      <p class="porto-vacio-desc">Cuando realices tu primer evento, este espacio se llenará con fotos y videos de ese momento especial.</p>
      <a href="#contacto" class="btn btn-gold">Sé el primero en cotizar</a>
    </div>
  `;
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  try { return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return fechaStr; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}