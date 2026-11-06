import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const other = new URLSearchParams(location.search).get("uid");

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "index.html"; return; }
  if (!other || other === user.uid) { location.href = "home.html"; return; }

  const members = [user.uid, other].sort();
  const chatId = members.join("_");
  const chatRef = doc(db, "chats", chatId);

  const who = await getDoc(doc(db, "users", other));
  $("who").textContent = who.exists() ? who.data().name : "Chat";

  const chat = await getDoc(chatRef);
  if (!chat.exists()) {
    await setDoc(chatRef, { members, createdAt: serverTimestamp() });
  }

  const q = query(collection(db, "chats", chatId, "messages"), orderBy("at"));
  onSnapshot(q, snap => {
    $("msgs").textContent = "";
    snap.forEach(s => {
      const m = s.data();
      const div = document.createElement("div");
      div.className = "m" + (m.from === user.uid ? " me" : "");
      div.textContent = m.text;
      $("msgs").append(div);
    });
    $("msgs").scrollTop = $("msgs").scrollHeight;
  });

  const send = async () => {
    const text = $("text").value.trim();
    if (!text) return;
    $("text").value = "";
    await addDoc(collection(db, "chats", chatId, "messages"), {
      from: user.uid, text, at: serverTimestamp()
    });
  };
  $("send").onclick = send;
  $("text").onkeydown = e => { if (e.key === "Enter") send(); };
});
