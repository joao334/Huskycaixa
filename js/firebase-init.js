import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyA6cAbuZS2P68JdsTlxJ13aFuLjOsuXVGk",
  authDomain: "husky-confeitaria.firebaseapp.com",
  projectId: "husky-confeitaria",
  storageBucket: "husky-confeitaria.firebasestorage.app",
  messagingSenderId: "268304335097",
  appId: "1:268304335097:web:d5201f8af620cc677da228",
  measurementId: "G-2MG1CSGKP1"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

window.HuskyFirebase = {
  firebaseApp,
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
};

console.log('Firebase conectado com sucesso.');