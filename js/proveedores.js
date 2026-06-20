// ════════════════════════════════════════════════════
// PANEL DE PROVEEDORES — proveedores.js
// Login con Firebase Authentication + datos en Firestore
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

// ─── Referencias del DOM ──────────────────────────
const loginScreen   = document.getElementById('loginScreen');
const provPanel      = document.getElementById('provPanel');
const loginEmail     = document.getElementById('loginEmail');
const loginPassword  = document.getElementById('loginPassword');
const loginBtn       = document.getElementById('loginBtn');
const loginError     = document.getElementById('loginError');
const logoutBtn      = document.getElementById('logoutBtn');

const pNombre    = document.getElementById('pNombre');
const pServicio  = document.getElementById('pServicio');
const pTelefono  = document.getElementById('pTelefono');
const pTarifa    = document.getElementById('pTarifa');
const pNotas     = document.getElementById('pNotas');
const guardarBtn = document.getElementById('guardarBtn');
const cancelarEdicionBtn = document.getElementById('cancelarEdicionBtn');
const formTitle  = document.getElementById('formTitle');

const provLista  = document.getElementById('provLista');
const provVacio  = document.getElementById('provVacio');
const buscarProveedor = document.getElementById('buscarProveedor');

let editandoId = null;       // null = creando nuevo; si tiene valor = editando ese id
let proveedoresCache = [];   // copia local para poder filtrar la búsqueda sin recargar

// ─── LOGIN ─────────────────────────────────────────
loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;

  if (!email || !pass) {
    loginError.textContent = 'Ingresa tu correo y contraseña.';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando...';

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged se encarga de mostrar el panel
  } catch (err) {
    loginError.textContent = 'Correo o contraseña incorrectos.';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Iniciar sesión';
  }
});

// Permite enviar el login con Enter
loginPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

// ─── LOGOUT ────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

// ─── ESTADO DE AUTENTICACIÓN ───────────────────────
// Se ejecuta automáticamente cuando alguien inicia o cierra sesión
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.hidden = true;
    provPanel.hidden = false;
    escucharProveedores();
  } else {
    loginScreen.hidden = false;
    provPanel.hidden = true;
    loginEmail.value = '';
    loginPassword.value = '';
  }
});

// ─── GUARDAR (crear o editar) ──────────────────────
guardarBtn.addEventListener('click', async () => {
  const nombre   = pNombre.value.trim();
  const servicio = pServicio.value.trim();
  const telefono = pTelefono.value.trim();
  const tarifa   = pTarifa.value.trim();
  const notas    = pNotas.value.trim();

  if (!nombre || !servicio) {
    alert('El nombre y el servicio son obligatorios.');
    return;
  }

  const datos = { nombre, servicio, telefono, tarifa, notas, actualizado: Date.now() };

  guardarBtn.disabled = true;

  try {
    if (editandoId) {
      await updateDoc(doc(db, 'proveedores', editandoId), datos);
    } else {
      datos.creado = Date.now();
      await addDoc(collection(db, 'proveedores'), datos);
    }
    limpiarFormulario();
  } catch (err) {
    alert('Hubo un error al guardar. Intenta de nuevo.');
    console.error(err);
  } finally {
    guardarBtn.disabled = false;
  }
});

cancelarEdicionBtn.addEventListener('click', limpiarFormulario);

function limpiarFormulario() {
  pNombre.value = '';
  pServicio.value = '';
  pTelefono.value = '';
  pTarifa.value = '';
  pNotas.value = '';
  editandoId = null;
  formTitle.textContent = 'Agregar nuevo proveedor';
  guardarBtn.textContent = 'Guardar proveedor';
  cancelarEdicionBtn.hidden = true;
}

// ─── ESCUCHAR CAMBIOS EN TIEMPO REAL ───────────────
function escucharProveedores() {
  const q = query(collection(db, 'proveedores'), orderBy('nombre'));
  onSnapshot(q, (snapshot) => {
    proveedoresCache = [];
    snapshot.forEach((docSnap) => {
      proveedoresCache.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderizarLista(proveedoresCache);
  });
}

// ─── RENDERIZAR LISTA ──────────────────────────────
function renderizarLista(lista) {
  provLista.innerHTML = '';

  if (lista.length === 0) {
    provVacio.hidden = false;
    return;
  }
  provVacio.hidden = true;

  lista.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'prov-card';
    card.innerHTML = `
      <div>
        <div class="prov-card-name">${escapeHtml(p.nombre)}</div>
        <span class="prov-card-service">${escapeHtml(p.servicio)}</span>
        <div class="prov-card-meta">
          ${p.telefono ? `<span><strong>Tel:</strong> ${escapeHtml(p.telefono)}</span>` : ''}
          ${p.tarifa ? `<span><strong>Tarifa:</strong> ${escapeHtml(p.tarifa)}</span>` : ''}
        </div>
        ${p.notas ? `<div class="prov-card-notes">${escapeHtml(p.notas)}</div>` : ''}
      </div>
      <div class="prov-card-actions">
        <button type="button" class="prov-card-btn" data-action="editar" data-id="${p.id}">Editar</button>
        <button type="button" class="prov-card-btn danger" data-action="eliminar" data-id="${p.id}">Eliminar</button>
      </div>
    `;
    provLista.appendChild(card);
  });
}

// Evita inyección de HTML en los datos mostrados
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── EDITAR / ELIMINAR (delegación de eventos) ─────
provLista.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const accion = btn.dataset.action;

  if (accion === 'editar') {
    const p = proveedoresCache.find(x => x.id === id);
    if (!p) return;
    pNombre.value = p.nombre || '';
    pServicio.value = p.servicio || '';
    pTelefono.value = p.telefono || '';
    pTarifa.value = p.tarifa || '';
    pNotas.value = p.notas || '';
    editandoId = id;
    formTitle.textContent = 'Editando: ' + p.nombre;
    guardarBtn.textContent = 'Guardar cambios';
    cancelarEdicionBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (accion === 'eliminar') {
    const p = proveedoresCache.find(x => x.id === id);
    const confirmar = confirm(`¿Eliminar a "${p ? p.nombre : 'este proveedor'}"? Esta acción no se puede deshacer.`);
    if (!confirmar) return;
    try {
      await deleteDoc(doc(db, 'proveedores', id));
    } catch (err) {
      alert('No se pudo eliminar. Intenta de nuevo.');
      console.error(err);
    }
  }
});

// ─── BÚSQUEDA EN VIVO ───────────────────────────────
buscarProveedor.addEventListener('input', () => {
  const texto = buscarProveedor.value.trim().toLowerCase();
  if (!texto) {
    renderizarLista(proveedoresCache);
    return;
  }
  const filtrados = proveedoresCache.filter(p =>
    (p.nombre || '').toLowerCase().includes(texto) ||
    (p.servicio || '').toLowerCase().includes(texto)
  );
  renderizarLista(filtrados);
});
