// ════════════════════════════════════════════════════
// CONFIGURACIÓN DE FIREBASE — mayra-event-studio
// ════════════════════════════════════════════════════
// Estas credenciales son públicas por diseño (no son secretas).
// La seguridad real la dan las Reglas de Firestore, no esta clave.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaezf3xidbayDvRc102Jq7h-ozL44h2R8",
  authDomain: "mayra-event-studio.firebaseapp.com",
  projectId: "mayra-event-studio",
  storageBucket: "mayra-event-studio.firebasestorage.app",
  messagingSenderId: "1044240845442",
  appId: "1:1044240845442:web:89d246e9088cc46949829b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);