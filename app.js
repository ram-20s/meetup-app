import { auth, db } from "./firebase.js";
import { setupAge } from "./age.js";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const say = (t, ok) => {
  $("msg").textContent = t || "";
  $("msg").style.color = ok ? "#8fd694" : "#ff8a80";
};
const show = box => {
  ["loginBox", "verifyBox", "ageBox"].forEach(b => $(b).classList.add("hide"));
  $(box).classList.remove("hide");
};
const nice = e => {
  const c = e.code || "";
  if (c === "auth/email-already-in-use") {
    $("oldEmail").value = $("newEmail").value.trim();
    return "This email already exists. Please log in below.";
  }
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") return "Wrong email or password. If you forgot it, tap Forgot password.";
  if (c === "auth/weak-password") return "Password must be at least 6 characters.";
  if (c === "auth/invalid-email") return "Please enter a valid email.";
  if (c === "auth/too-many-requests") return "Too many tries. Please wait a few minutes.";
  return e.message;
};
const run = async fn => {
  try { say(); await fn(); } catch (e) { say(nice(e)); }
};

const route = async user => {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists() && snap.data().dob) {
    location.href = "home.html";
  } else {
    $("name").value = user.displayName || "";
    show("ageBox");
  }
};

onAuthStateChanged(auth, async user => {
  if (!user) return show("loginBox");
  if (!user.emailVerified) {
    $("vEmail").textContent = user.email;
    return show("verifyBox");
  }
  await route(user);
});

$("signupBtn").onclick = () => run(async () => {
  const email = $("newEmail").value.trim().toLowerCase();
  const pass = $("newPass").value;
  if (!/^[^\s@]+@gmail\.com$/.test(email)) return say("Please use a Gmail address ending in @gmail.com.");
  if (pass.length < 6) return say("Password must be at least 6 characters.");
  try {
    if (localStorage.getItem("meetupSignedUp")) return say("An account was already created on this device. Please log in below.");
  } catch (e) {}
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  try { localStorage.setItem("meetupSignedUp", "1"); } catch (e) {}
  await sendEmailVerification(cred.user);
  say("Verification link sent to " + email + ".", true);
});

$("loginBtn").onclick = () => run(() =>
  signInWithEmailAndPassword(auth, $("oldEmail").value.trim().toLowerCase(), $("oldPass").value));

$("forgotBtn").onclick = () => run(async () => {
  const email = $("oldEmail").value.trim().toLowerCase();
  if (!email) return say("Type your registered email above first.");
  await sendPasswordResetEmail(auth, email);
  say("If this email is registered, a reset link was sent. Open it, set a new password, then log in here.", true);
});

$("checkBtn").onclick = () => run(async () => {
  await auth.currentUser.reload();
  if (!auth.currentUser.emailVerified) return say("Not verified yet. Tap the link in your email first.");
  await auth.currentUser.getIdToken(true);
  await route(auth.currentUser);
});

$("resendBtn").onclick = () => run(async () => {
  await sendEmailVerification(auth.currentUser);
  say("A new verification link was sent.", true);
});

$("backBtn").onclick = () => signOut(auth);

setupAge($, say, run, show);
