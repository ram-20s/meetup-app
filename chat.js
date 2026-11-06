import { auth, db } from "./firebase.js";
import { startHeartbeat, statusText } from "./presence.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const other = new URLSearchParams(location.search).get("uid");

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "index.html"; return; }
  if (!other || other === user.uid) { location.href = "home.html"; return; }
  startHeartbeat(user.uid);

  const members = [user.uid, other].sort();
  const chatId = members.join("_");
  const chatRef = doc(db, "chats", chatId);

  const nameEl = document.createElement("div");
  const status = document.createElement("small");
  status.style.fontWeight = "normal";
  $("who").textContent = "";
  $("who").append(nameEl, status);

  let lastActive = 0;
  const paint = () => {
    status.textContent = statusText(lastActive);
    status.style.color = Date.now() - lastActive < 120000 ? "#8fd694" : "#aaa";
  };
  onSnapshot(doc(db, "users", other), s => {
    const d = s.data() || {};
    nameEl.textContent = d.name || "Chat";
    lastActive = d.lastActive || 0;
    paint();
  });
  setInterval(paint, 30000);

  if (!(await getDoc(chatRef)).exists()) {
    await setDoc(chatRef, { members, createdAt: serverTimestamp() });
  }

  let msgs = [];
  let otherSeen = 0;
  let mySeen = 0;

  const render = () => {
    const box = $("msgs");
    box.textContent = "";
    msgs.forEach(m => {
      const div = document.createElement("div");
      div.className = "m" + (m.from === user.uid ? " me" : "");
      div.textContent = m.text;
      if (m.from === user.uid && m.t) {
        const tick = document.createElement("div");
        tick.style.fontSize = "11px";
        tick.style.opacity = "0.8";
        tick.textContent = m.t <= otherSeen ? "Seen" : "Sent";
        div.append(tick);
      }
      box.append(div);
    });
    box.scrollTop = box.scrollHeight;
  };

  const markSeen = () => {
    if (document.visibilityState !== "visible") return;
    const latest = msgs
      .filter(m => m.from !== user.uid && m.t)
      .reduce((a, m) => Math.max(a, m.t), 0);
    if (latest > mySeen) {
      mySeen = Date.now();
      updateDoc(chatRef, { ["seen." + user.uid]: mySeen });
    }
  };

  onSnapshot(chatRef, s => {
    const seen = (s.data() || {}).seen || {};
    otherSeen = seen[other] || 0;
    mySeen = seen[user.uid] || 0;
    render();
  });

  onSnapshot(query(collection(db, "chats", chatId, "messages"), orderBy("at")), snap => {
    msgs = snap.docs.map(s => s.data());
    render();
    markSeen();
  });

  document.addEventListener("visibilitychange", markSeen);

  const send = async () => {
    const text = $("text").value.trim();
    if (!text) return;
    $("text").value = "";
    const now = Date.now();
    await addDoc(collection(db, "chats", chatId, "messages"), {
      from: user.uid, text, at: serverTimestamp(), t: now
    });
    await updateDoc(chatRef, {
      lastText: text.slice(0, 60),
      lastAt: now,
      lastFrom: user.uid,
      ["seen." + user.uid]: now
    });
  };
  $("send").onclick = send;
  $("text").onkeydown = e => { if (e.key === "Enter") send(); };
});
