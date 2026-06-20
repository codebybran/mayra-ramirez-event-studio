// ════════════════════════════════════════════════════
// PANEL DE PORTAFOLIO — portafolio-admin.js
// Login con Firebase Auth + fotos en Imgur + datos en Firestore
// ════════════════════════════════════════════════════

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ────────────────────────────────────────────────────
// IMGUR — Client ID del API pública (sin tarjeta)
// Instrucciones para obtener el tuyo:
//   1. Ve a https://api.imgur.com/oauth2/addclient
//   2. Registra la app como "Anonymous usage without user auth"
//   3. Copia el Client ID y reemplaza el de abajo
// ────────────────────────────────────────────────────
const IMGUR_CLIENT_ID = '546c25a59c58ad7';

// ─── Referencias del DOM ─────────────────────────────
const loginScreen   = document.getElementById('loginScreen');
const provPanel     = document.getElementById('provPanel');
const loginEmail    = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn      = document.getElementById('loginBtn');
const loginError    = document.getElementById('loginError');
const logoutBtn     = document.getElementById('logoutBtn');

const formTitle          = document.getElementById('formTitle');
const eNombre            = document.getElementById('eNombre');
const eTipo              = document.getElementById('eTipo');
const eCiudad            = document.getElementById('eCiudad');
const eFecha             = document.getElementById('eFecha');
const eDescripcion       = document.getElementById('eDescripcion');
const eVideoUrl          = document.getElementById('eVideoUrl');
const fotoInput          = document.getElementById('fotoInput');
const fotoUploadArea     = document.getElementById('fotoUploadArea');
const fotosPreviewGrid   = document.getElementById('fotosPreviewGrid');
const uploadProgress     = document.getElementById('uploadProgress');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const uploadProgressText = document.getElementById('uploadProgressText');
const guardarEventoBtn   = document.getElementById('guardarEventoBtn');
const cancelarEdicionBtn = document.getElementById('cancelarEdicionBtn');
const statusMsg          = document.getElementById('statusMsg');

const eventosList  = document.getElementById('eventosList');
const eventosVacio = document.getElementById('eventosVacio');
const buscarEvento = document.getElementById('buscarEvento');

// ─── Estado local ─────────────────────────────────────
let editandoId      = null;
let eventosCache    = [];
let fotosSeleccionadas = []; // Array de { file, previewUrl, imgurUrl, itemEl }

// ─── PESTAÑAS ────────────────────────────────────────
document.querySelectorAll('.porto-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.porto-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.porto-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
  });
});

// ─── LOGIN ────────────────────────────────────────────
loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;
  if (!email || !pass) { loginError.textContent = 'Ingresa tu correo y contraseña.'; return; }
  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando...';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    loginError.textContent = 'Correo o contraseña incorrectos.';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Iniciar sesión';
  }
});

loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });

// ─── LOGOUT ───────────────────────────────────────────
logoutBtn.addEventListener('click', () => signOut(auth));

// ─── ESTADO DE AUTH ───────────────────────────────────
onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.hidden = true;
    provPanel.hidden = false;
    escucharEventos();
  } else {
    loginScreen.hidden = false;
    provPanel.hidden = true;
    loginEmail.value = '';
    loginPassword.value = '';
  }
});

// ═══════════════════════════════════════════════════════
// FOTOS — selección y drag & drop
// ═══════════════════════════════════════════════════════

fotoInput.addEventListener('change', e => agregarFotos(e.target.files));

fotoUploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  fotoUploadArea.classList.add('drag-over');
});

fotoUploadArea.addEventListener('dragleave', () => {
  fotoUploadArea.classList.remove('drag-over');
});

fotoUploadArea.addEventListener('drop', e => {
  e.preventDefault();
  fotoUploadArea.classList.remove('drag-over');
  agregarFotos(e.dataTransfer.files);
});

function agregarFotos(files) {
  const MAX_FOTOS = 50;
  const MAX_SIZE  = 10 * 1024 * 1024; // 10 MB

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_SIZE) {
      mostrarStatus(`"${file.name}" supera los 10 MB. Usa una imagen más pequeña.`, 'error');
      return;
    }
    if (fotosSeleccionadas.length >= MAX_FOTOS) {
      mostrarStatus('Máximo 10 fotos por evento.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const previewUrl = e.target.result;
      const itemEl = crearPreviewItem(previewUrl, fotosSeleccionadas.length);
      const fotoObj = { file, previewUrl, imgurUrl: null, itemEl };
      fotosSeleccionadas.push(fotoObj);
      fotosPreviewGrid.appendChild(itemEl);
    };
    reader.readAsDataURL(file);
  });
}

function crearPreviewItem(src, index) {
  const div = document.createElement('div');
  div.className = 'foto-preview-item';
  div.dataset.index = index;
  div.innerHTML = `
    <img src="${src}" alt="Foto ${index + 1}" />
    <button type="button" class="foto-remove-btn" title="Quitar foto">✕</button>
  `;
  div.querySelector('.foto-remove-btn').addEventListener('click', () => {
    const i = parseInt(div.dataset.index);
    fotosSeleccionadas.splice(i, 1);
    div.remove();
    // Re-indexar
    fotosPreviewGrid.querySelectorAll('.foto-preview-item').forEach((el, idx) => {
      el.dataset.index = idx;
    });
  });
  return div;
}

// ═══════════════════════════════════════════════════════
// IMGUR — subida de fotos
// ═══════════════════════════════════════════════════════

async function subirFotoImgur(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body: formData
  });

  if (!res.ok) throw new Error(`Error Imgur: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('Imgur no retornó éxito.');
  return data.data.link; // URL directa de la imagen
}

async function subirTodasLasFotos() {
  const total = fotosSeleccionadas.length;
  if (total === 0) return [];

  uploadProgress.classList.add('visible');
  uploadProgressFill.style.width = '0%';
  uploadProgressText.textContent = `Subiendo foto 0 de ${total}...`;

  const urls = [];
  for (let i = 0; i < total; i++) {
    const fotoObj = fotosSeleccionadas[i];
    fotoObj.itemEl.classList.add('uploading');

    try {
      const url = await subirFotoImgur(fotoObj.file);
      fotoObj.imgurUrl = url;
      urls.push(url);
      fotoObj.itemEl.classList.remove('uploading');
      fotoObj.itemEl.classList.add('done');
    } catch (err) {
      fotoObj.itemEl.classList.remove('uploading');
      fotoObj.itemEl.classList.add('error');
      console.error(`Error subiendo foto ${i + 1}:`, err);
      throw new Error(`No se pudo subir la foto ${i + 1}. Verifica tu Client ID de Imgur.`);
    }

    const pct = Math.round(((i + 1) / total) * 100);
    uploadProgressFill.style.width = `${pct}%`;
    uploadProgressText.textContent = `Subiendo foto ${i + 1} de ${total}...`;
  }

  uploadProgressText.textContent = `✅ ${total} foto${total > 1 ? 's' : ''} subida${total > 1 ? 's' : ''} correctamente`;
  return urls;
}

// ═══════════════════════════════════════════════════════
// GUARDAR EVENTO en Firestore
// ═══════════════════════════════════════════════════════

guardarEventoBtn.addEventListener('click', async () => {
  // Validar campos obligatorios
  const nombre = eNombre.value.trim();
  const tipo   = eTipo.value;
  const ciudad = eCiudad.value.trim();
  const fecha  = eFecha.value;

  if (!nombre || !tipo || !ciudad || !fecha) {
    mostrarStatus('Completa todos los campos obligatorios (*).', 'error');
    return;
  }

  guardarEventoBtn.disabled = true;
  guardarEventoBtn.textContent = 'Guardando...';
  mostrarStatus('Subiendo fotos, un momento...', 'info');

  try {
    // 1. Subir fotos a Imgur
    let fotosUrls = [];
    if (fotosSeleccionadas.length > 0) {
      fotosUrls = await subirTodasLasFotos();
    }

    // 2. Procesar URL de YouTube
    const videoUrl = procesarUrlYoutube(eVideoUrl.value);

    // 3. Guardar en Firestore
    const datos = {
      nombre,
      tipo,
      ciudad,
      fecha,
      descripcion: eDescripcion.value.trim(),
      fotos: fotosUrls,
      videoUrl: videoUrl || '',
      actualizado: Date.now()
    };

    if (editandoId) {
      await updateDoc(doc(db, 'portafolio', editandoId), datos);
      mostrarStatus('✅ Evento actualizado correctamente.', 'success');
    } else {
      datos.creado = Date.now();
      await addDoc(collection(db, 'portafolio'), datos);
      mostrarStatus('✅ ¡Evento publicado en el portafolio!', 'success');
    }

    limpiarFormulario();

    // Ir a la pestaña de lista después de guardar
    setTimeout(() => {
      document.querySelector('[data-tab="lista"]').click();
    }, 1500);

  } catch (err) {
    mostrarStatus(`❌ ${err.message || 'Error al guardar. Intenta de nuevo.'}`, 'error');
    console.error(err);
  } finally {
    guardarEventoBtn.disabled = false;
    guardarEventoBtn.textContent = '✨ Publicar evento en el portafolio';
  }
});

cancelarEdicionBtn.addEventListener('click', limpiarFormulario);

function limpiarFormulario() {
  eNombre.value = '';
  eTipo.value = '';
  eCiudad.value = '';
  eFecha.value = '';
  eDescripcion.value = '';
  eVideoUrl.value = '';
  fotosSeleccionadas = [];
  fotosPreviewGrid.innerHTML = '';
  fotoInput.value = '';
  uploadProgress.classList.remove('visible');
  uploadProgressFill.style.width = '0%';
  editandoId = null;
  formTitle.textContent = 'Nuevo evento en el portafolio';
  guardarEventoBtn.textContent = '✨ Publicar evento en el portafolio';
  cancelarEdicionBtn.hidden = true;
  statusMsg.classList.remove('visible', 'success', 'error', 'info');
}

// ═══════════════════════════════════════════════════════
// YOUTUBE — convertir cualquier formato a embed
// ═══════════════════════════════════════════════════════

function procesarUrlYoutube(texto) {
  if (!texto) return [];
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  return lineas.map(url => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
    if (!match) return null;
    return `https://www.youtube.com/embed/${match[1]}`;
  }).filter(Boolean);
}

// ═══════════════════════════════════════════════════════
// FIRESTORE — leer eventos en tiempo real
// ═══════════════════════════════════════════════════════

function escucharEventos() {
  const q = query(collection(db, 'portafolio'), orderBy('fecha', 'desc'));
  onSnapshot(q, snapshot => {
    eventosCache = [];
    snapshot.forEach(docSnap => {
      eventosCache.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderizarEventos(eventosCache);
  });
}

// ─── RENDERIZAR LISTA ─────────────────────────────────
function renderizarEventos(lista) {
  eventosList.innerHTML = '';

  if (lista.length === 0) {
    eventosVacio.hidden = false;
    return;
  }
  eventosVacio.hidden = true;

  lista.forEach(ev => {
    const thumbUrl  = ev.fotos && ev.fotos.length > 0 ? ev.fotos[0] : null;
    const fechaFmt  = ev.fecha ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin fecha';
    const nFotos    = (ev.fotos || []).length;
    const tieneVid  = !!ev.videoUrl;

    const card = document.createElement('div');
    card.className = 'porto-admin-card';
    card.innerHTML = `
      ${thumbUrl
        ? `<img class="porto-admin-thumb" src="${thumbUrl}" alt="Foto de ${escapeHtml(ev.nombre)}" />`
        : `<div class="porto-admin-thumb no-img">📸</div>`
      }
      <div>
        <div class="porto-admin-name">${escapeHtml(ev.nombre)}</div>
        <div class="porto-admin-meta">
          <span>${escapeHtml(ev.tipo || '')}</span>
          <span>📍 ${escapeHtml(ev.ciudad || '')}</span>
          <span>📅 ${fechaFmt}</span>
        </div>
        <span class="porto-admin-fotos-count">
          ${nFotos} foto${nFotos !== 1 ? 's' : ''}${tieneVid ? ' · 🎬 video' : ''}
        </span>
        ${ev.descripcion ? `<p style="font-size:.875rem;color:var(--gray-600);margin-top:.5rem;line-height:1.5;">${escapeHtml(ev.descripcion)}</p>` : ''}
      </div>
      <div class="prov-card-actions">
        <button type="button" class="prov-card-btn" data-action="editar" data-id="${ev.id}">Editar</button>
        <button type="button" class="prov-card-btn danger" data-action="eliminar" data-id="${ev.id}">Eliminar</button>
      </div>
    `;
    eventosList.appendChild(card);
  });
}

// ─── EDITAR / ELIMINAR ────────────────────────────────
eventosList.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const accion = btn.dataset.action;

  if (accion === 'editar') {
    const ev = eventosCache.find(x => x.id === id);
    if (!ev) return;

    // Llenar formulario
    eNombre.value     = ev.nombre || '';
    eTipo.value       = ev.tipo || '';
    eCiudad.value     = ev.ciudad || '';
    eFecha.value      = ev.fecha || '';
    eDescripcion.value = ev.descripcion || '';

    // Video: convertir embed a watch URL para mostrar en el campo
    if (ev.videoUrl) {
      const match = ev.videoUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
      eVideoUrl.value = match ? `https://www.youtube.com/watch?v=${match[1]}` : ev.videoUrl;
    } else {
      eVideoUrl.value = '';
    }

    // Mostrar fotos actuales como preview (solo como referencia, no se vuelven a subir)
    fotosSeleccionadas = [];
    fotosPreviewGrid.innerHTML = '';
    if (ev.fotos && ev.fotos.length > 0) {
      const nota = document.createElement('p');
      nota.style.cssText = 'font-size:.8125rem;color:var(--gray-400);margin-bottom:.5rem;grid-column:1/-1;';
      nota.textContent = 'Fotos actuales (agrega nuevas encima si quieres reemplazarlas):';
      fotosPreviewGrid.appendChild(nota);

      ev.fotos.forEach((url, i) => {
        const div = document.createElement('div');
        div.className = 'foto-preview-item done';
        div.innerHTML = `<img src="${url}" alt="Foto ${i+1}" />`;
        fotosPreviewGrid.appendChild(div);
      });
    }

    editandoId = id;
    formTitle.textContent = `Editando: ${ev.nombre}`;
    guardarEventoBtn.textContent = 'Guardar cambios';
    cancelarEdicionBtn.hidden = false;

    // Ir a la pestaña de agregar
    document.querySelector('[data-tab="nuevo"]').click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (accion === 'eliminar') {
    const ev = eventosCache.find(x => x.id === id);
    const confirmar = confirm(`¿Eliminar "${ev ? ev.nombre : 'este evento'}" del portafolio?\nEsta acción no se puede deshacer.`);
    if (!confirmar) return;
    try {
      await deleteDoc(doc(db, 'portafolio', id));
    } catch (err) {
      alert('No se pudo eliminar. Intenta de nuevo.');
      console.error(err);
    }
  }
});

// ─── BÚSQUEDA ─────────────────────────────────────────
buscarEvento.addEventListener('input', () => {
  const texto = buscarEvento.value.trim().toLowerCase();
  if (!texto) { renderizarEventos(eventosCache); return; }
  const filtrados = eventosCache.filter(ev =>
    (ev.nombre || '').toLowerCase().includes(texto) ||
    (ev.tipo   || '').toLowerCase().includes(texto) ||
    (ev.ciudad || '').toLowerCase().includes(texto)
  );
  renderizarEventos(filtrados);
});

// ─── HELPERS ──────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function mostrarStatus(msg, tipo) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg visible ${tipo}`;
}