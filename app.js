import { auth, db } from "./firebase.js";
import { setupAge } from "./age.js";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const say = t => { $("msg").textContent = t || ""; };
const show = box => {
  ["loginBox", "ageBox", "homeBox"].forEach(b => $(b).classList.add("hide"));
  $(box).classList.remove("hide");
};
const run = async fn => {
  try { say(); await fn(); } catch (e) { say(e.message); }
};

onAuthStateChanged(auth, async user => {
  if (!user) return show("loginBox");
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists() && snap.data().dob) {
    location.href = "home.html";
  } else {
    $("name").value = user.displayName || "";
    show("ageBox");
  }
});

$("googleBtn").onclick = () => run(() => signInWithPopup(auth, new GoogleAuthProvider()));
$("loginBtn").onclick = () => run(() => signInWithEmailAndPassword(auth, $("email").value, $("pass").value));
$("signupBtn").onclick = () => run(() => createUserWithEmailAndPassword(auth, $("email").value, $("pass").value));
$("logoutBtn").onclick = () => signOut(auth);
setupAge($, say, run, show);
