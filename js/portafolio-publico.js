// ════════════════════════════════════════════════════
// PORTAFOLIO PÚBLICO — portafolio-publico.js
// Lee la colección "portafolio" de Firestore y renderiza
// las tarjetas en la sección #portafolio del index.html
// ════════════════════════════════════════════════════

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Espera a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  cargarPortafolio();
});

// ─── Tipos de evento → emoji ─────────────────────────
const tipoEmoji = {
  'Matrimonio':          '💍',
  'Quince Años':         '👑',
  'Cumpleaños':          '🎂',
  'Evento Empresarial':  '🏢',
  'Feria / Expo':        '🎪',
  'Lanzamiento de Marca':'🚀',
  'Institucional':       '🏛️',
  'Celebración Familiar':'🥂',
  'Otro':                '✨'
};

// ─── Cargar eventos desde Firestore ──────────────────
async function cargarPortafolio() {
  const contenedor = document.getElementById('portafolioContenido');
  if (!contenedor) return;

  try {
    const q = query(
      collection(db, 'portafolio'),
      orderBy('fecha', 'desc')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Mostrar estado vacío
      mostrarVacio(contenedor);
      return;
    }

    const eventos = [];
    snapshot.forEach(docSnap => {
      eventos.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Render: filtros + grid de tarjetas
    renderizarPortafolio(contenedor, eventos);

  } catch (err) {
    console.error('Error cargando portafolio:', err);
    mostrarVacio(contenedor);
  }
}

// ─── Renderizar filtros + grid ────────────────────────
function renderizarPortafolio(contenedor, eventos) {
  // Obtener tipos únicos para los filtros
  const tipos = [...new Set(eventos.map(ev => ev.tipo).filter(Boolean))];

  contenedor.innerHTML = `
    <!-- Filtros por tipo -->
    <div class="portafolio-filters" id="portafolioFiltros">
      <button class="filter-btn active" data-filtro="todos">Todos</button>
      ${tipos.map(tipo => `
        <button class="filter-btn" data-filtro="${escapeHtml(tipo)}">
          ${tipoEmoji[tipo] || '✨'} ${escapeHtml(tipo)}
        </button>
      `).join('')}
    </div>

    <!-- Grid de tarjetas -->
    <div class="portafolio-grid" id="portafolioGrid">
      ${eventos.map(ev => crearTarjetaHTML(ev)).join('')}
    </div>

    <!-- Modal de detalle -->
    <div class="porto-modal" id="portoModal" hidden>
      <div class="porto-modal-overlay" id="portoModalOverlay"></div>
      <div class="porto-modal-content" id="portoModalContent">
        <button class="porto-modal-close" id="portoModalClose" aria-label="Cerrar">✕</button>
        <div id="portoModalBody"></div>
      </div>
    </div>
  `;

  // Lógica de filtros
  const filtrosBtns = contenedor.querySelectorAll('.filter-btn');
  const cards       = contenedor.querySelectorAll('.porto-card');

  filtrosBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filtrosBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtro = btn.dataset.filtro;
      cards.forEach(card => {
        const tipo = card.dataset.tipo;
        card.classList.toggle('hidden', filtro !== 'todos' && tipo !== filtro);
      });
    });
  });

  // Lógica del modal
  contenedor.querySelectorAll('.porto-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const ev = eventos.find(e => e.id === id);
      if (ev) abrirModal(ev);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  const modal        = contenedor.querySelector('#portoModal');
  const modalOverlay = contenedor.querySelector('#portoModalOverlay');
  const modalClose   = contenedor.querySelector('#portoModalClose');

  const cerrarModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    // Limpiar iframe de YouTube al cerrar (detiene el video)
    const iframe = modal.querySelector('iframe');
    if (iframe) iframe.src = iframe.src;
  };

  modalOverlay.addEventListener('click', cerrarModal);
  modalClose.addEventListener('click', cerrarModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrarModal(); });

  function abrirModal(ev) {
    const modalBody = contenedor.querySelector('#portoModalBody');
    const fechaFmt  = formatearFecha(ev.fecha);
    const nFotos    = (ev.fotos || []).length;

    modalBody.innerHTML = `
      <!-- Galería de fotos dentro del modal -->
      ${nFotos > 0 ? `
        <div class="porto-modal-gallery" id="portoModalGallery">
          <div class="porto-modal-gallery-main">
            <img src="${ev.fotos[0]}" alt="Foto principal de ${escapeHtml(ev.nombre)}" id="portoGalleryMain" />
          </div>
          ${nFotos > 1 ? `
            <div class="porto-modal-gallery-thumbs">
              ${ev.fotos.map((url, i) => `
                <img
                  src="${url}"
                  alt="Foto ${i+1}"
                  class="porto-gallery-thumb ${i === 0 ? 'active' : ''}"
                  data-url="${url}"
                />
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Info del evento -->
      <div class="porto-modal-info">
        <span class="porto-cat">${tipoEmoji[ev.tipo] || '✨'} ${escapeHtml(ev.tipo || '')}</span>
        <h2 class="porto-modal-title">${escapeHtml(ev.nombre)}</h2>
        <div class="porto-meta" style="margin: .75rem 0 1rem;">
          <span>📍 ${escapeHtml(ev.ciudad || '')}</span>
          <span>📅 ${fechaFmt}</span>
          ${nFotos > 0 ? `<span>📸 ${nFotos} foto${nFotos !== 1 ? 's' : ''}</span>` : ''}
        </div>
        ${ev.descripcion ? `<p class="porto-desc">${escapeHtml(ev.descripcion)}</p>` : ''}
      </div>

      <!-- Video de YouTube -->
      ${(ev.videos && ev.videos.length > 0) ? `
  <div class="porto-modal-videos">
    ${ev.videos.map((url, i) => `
      <div class="porto-modal-video">
        <p style="font-family:var(--font-display);font-size:1rem;color:var(--navy);margin-bottom:.5rem;padding:0 1.75rem;">
          🎬 Video ${ev.videos.length > 1 ? i + 1 : ''}
        </p>
        <iframe
          src="${url}?rel=0&modestbranding=1"
          title="Video ${i+1} de ${escapeHtml(ev.nombre)}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
    `).join('')}
  </div>
` : ev.videoUrl ? `
  <div class="porto-modal-video">
    <iframe
      src="${ev.videoUrl}?rel=0&modestbranding=1"
      title="Video de ${escapeHtml(ev.nombre)}"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
` : ''}
    `;

    // Galería de miniaturas funcional
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
}

// ─── HTML de una tarjeta ─────────────────────────────
function crearTarjetaHTML(ev) {
  const thumbUrl = ev.fotos && ev.fotos.length > 0 ? ev.fotos[0] : null;
  const fechaFmt = formatearFecha(ev.fecha);
  const emoji    = tipoEmoji[ev.tipo] || '✨';
  const nFotos   = (ev.fotos || []).length;
  const tieneVid = (ev.videos && ev.videos.length > 0) || !!ev.videoUrl;

  return `
    <article
      class="porto-card"
      data-tipo="${escapeHtml(ev.tipo || '')}"
      data-id="${ev.id}"
      tabindex="0"
      role="button"
      aria-label="Ver detalles de ${escapeHtml(ev.nombre)}"
      style="cursor:pointer;"
    >
      <div class="porto-img">
        ${thumbUrl
          ? `<img
               src="${thumbUrl}"
               alt="Foto de ${escapeHtml(ev.nombre)}"
               loading="lazy"
               style="width:100%;height:100%;object-fit:cover;"
             />`
          : `<div class="porto-img-1" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
               <span style="font-size:3rem;">${emoji}</span>
             </div>`
        }
        <div class="porto-overlay">
          <span class="porto-cat">${emoji} ${escapeHtml(ev.tipo || '')}</span>
        </div>
      </div>
      <div class="porto-info">
        <h3 class="porto-name">${escapeHtml(ev.nombre)}</h3>
        <div class="porto-meta">
          <span>📍 ${escapeHtml(ev.ciudad || '')}</span>
          <span>📅 ${fechaFmt}</span>
          ${nFotos > 0 ? `<span>📸 ${nFotos} foto${nFotos !== 1 ? 's' : ''}</span>` : ''}
          ${tieneVid ? `<span>🎬 Video</span>` : ''}
        </div>
        ${ev.descripcion
          ? `<p class="porto-desc">${escapeHtml(ev.descripcion.length > 120 ? ev.descripcion.slice(0, 120) + '…' : ev.descripcion)}</p>`
          : ''
        }
      </div>
    </article>
  `;
}

// ─── Estado vacío ─────────────────────────────────────
function mostrarVacio(contenedor) {
  contenedor.innerHTML = `
    <div class="portafolio-vacio">
      <div class="porto-vacio-icon">🎉</div>
      <h3 class="porto-vacio-title">¡El primer evento está por llegar!</h3>
      <p class="porto-vacio-desc">Cuando realices tu primer evento, este espacio se llenará con fotos, descripción y todos los detalles de ese momento especial.</p>
      <a href="#contacto" class="btn btn-gold">Sé el primero en cotizar</a>
    </div>
  `;
}

// ─── Helpers ──────────────────────────────────────────
function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  try {
    return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return fechaStr; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}