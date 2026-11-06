import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadPeople } from "./browse.js";
import { loadInbox } from "./inbox.js";

const $ = id => document.getElementById(id);
const fields = ["name", "gender", "looking", "city", "bio"];
const tab = which => {
  $("browseBox").classList.toggle("hide", which !== "browse");
  $("meBox").classList.toggle("hide", which !== "me");
};

const inboxBox = document.createElement("div");
inboxBox.className = "p";
$("browseBox").insertBefore(inboxBox, $("browseBox").firstChild);

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "index.html"; return; }
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().dob) { location.href = "index.html"; return; }
  const d = snap.data();
  fields.forEach(k => { $(k).value = d[k] || ""; });
  loadInbox(user.uid, inboxBox);
  loadPeople(user.uid, $("list"));
  $("saveBtn").onclick = async () => {
    const data = {};
    fields.forEach(k => { data[k] = $(k).value.trim(); });
    await setDoc(ref, data, { merge: true });
    $("msg").textContent = "Saved!";
    loadPeople(user.uid, $("list"));
  };
});

$("tabBrowse").onclick = () => tab("browse");
$("tabMe").onclick = () => tab("me");
$("logout").onclick = () => signOut(auth);
