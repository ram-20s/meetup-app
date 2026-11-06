import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCwv3LZD69NGMxQ4B4qgQ2OEk2MOtBunAE",
  authDomain: "meetup-app-3b9d3.firebaseapp.com",
  projectId: "meetup-app-3b9d3",
  storageBucket: "meetup-app-3b9d3.firebasestorage.app",
  messagingSenderId: "461411983698",
  appId: "1:461411983698:web:f6e7d8d530337f38df5a8b"
});

export const auth = getAuth(app);
export const db = getFirestore(app);
