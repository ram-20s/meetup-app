import { auth, db } from "./firebase.js";
import { setupAge } from "./age.js";
import { setupPhone } from "./phone.js";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const say = (t, ok) => {
  $("msg").textContent = t || "";
  $("msg").style.color = ok ? "#8fd694" : "#ff8a80";
};
const show = box => {
  ["loginBox", "ageBox"].forEach(b => $(b).classList.add("hide"));
  $(box).classList.remove("hide");
};
const nice = e => {
  const c = e.code || "";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "";
  if (c === "auth/email-already-in-use") return "This email is already registered. If you signed up with Google, tap Continue with Google. Otherwise tap Log in or Forgot password.";
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") return "Wrong email or password. If you signed up with Google, tap Continue with Google.";
  if (c === "auth/weak-password") return "Password must be at least 6 characters.";
  if (c === "auth/invalid-email") return "Please enter a valid email.";
  if (c === "auth/too-many-requests") return "Too many tries. Please wait a few minutes.";
  if (c === "auth/invalid-phone-number") return "Enter your number with country code, like +91 98765 43210.";
  if (c === "auth/invalid-verification-code") return "Wrong OTP. Please try again.";
  if (c === "auth/code-expired") return "OTP expired. Tap Send OTP again.";
  if (c === "auth/quota-exceeded") return "Daily SMS limit reached. Try again tomorrow.";
  return e.message;
};
const run = async fn => {
  try { say(); await fn(); } catch (e) { say(nice(e)); }
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

const panel = which => {
  $("phonePanel").classList.toggle("hide", which !== "phone");
  $("emailPanel").classList.toggle("hide", which !== "email");
};
$("tabPhone").onclick = () => panel("phone");
$("tabEmail").onclick = () => panel("email");

$("googleBtn").onclick = () => run(() => signInWithPopup(auth, new GoogleAuthProvider()));
$("loginBtn").onclick = () => run(() => signInWithEmailAndPassword(auth, $("email").value.trim(), $("pass").value));
$("signupBtn").onclick = () => run(() => createUserWithEmailAndPassword(auth, $("email").value.trim(), $("pass").value));
$("forgotBtn").onclick = () => run(async () => {
  const email = $("email").value.trim();
  if (!email) return say("Type your email above first.");
  await sendPasswordResetEmail(auth, email);
  say("If this email has an account, a reset link was sent. Check your spam folder too.", true);
});

setupAge($, say, run, show);
setupPhone($, say, run);
