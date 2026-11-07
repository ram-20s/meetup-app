import { auth, db } from "./firebase.js";
import { startHeartbeat, statusText } from "./presence.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let cfg = {};
try { cfg = await import("./config.js"); } catch (e) {}

const $ = id => document.getElementById(id);
const other = new URLSearchParams(location.search).get("uid");
const MAX_IMG = 800;
const IMG_LIMIT = 110000;
const MAX_VIDEO = 25 * 1024 * 1024;
const isImg = u => typeof u === "string" && u.startsWith("data:image/jpeg;base64,");
const isVid = u => typeof u === "string" && u.startsWith("https://res.cloudinary.com/");

function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let size = MAX_IMG;
      for (let round = 0; round < 6; round++) {
        const s = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s));
        c.height = Math.max(1, Math.round(img.height * s));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        for (let q = 0.75; q >= 0.4; q -= 0.15) {
          const out = c.toDataURL("image/jpeg", q);
          if (out.length <= IMG_LIMIT) { resolve(out); return; }
        }
        size = Math.round(size * 0.8);
      }
      reject(new Error("This photo could not be shrunk enough."));
    };
    img.onerror = () => reject(new Error("Could not read this image."));
    img.src = url;
  });
}

async function uploadVideo(file) {
  if (!cfg.CLOUD_NAME || !cfg.UPLOAD_PRESET) throw new Error("Video sending is not set up yet.");
  if (file.size > MAX_VIDEO) throw new Error("This video is too large. Please choose one under 25 MB.");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", cfg.UPLOAD_PRESET);
  const r = await fetch("https://api.cloudinary.com/v1_1/" + cfg.CLOUD_NAME + "/video/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok || !j.secure_url) throw new Error((j.error && j.error.message) || "Video upload failed.");
  return j.secure_url;
}

function viewImage(src) {
  const o = document.createElement("div");
  o.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:1100;display:flex;align-items:center;justify-content:center";
  const i = document.createElement("img");
  i.src = src;
  i.style.cssText = "max-width:100%;max-height:100%";
  o.append(i);
  o.onclick = () => o.remove();
  document.body.append(o);
}

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
      if (isImg(m.img)) {
        const im = document.createElement("img");
        im.src = m.img;
        im.style.cssText = "max-width:100%;border-radius:10px;display:block;cursor:pointer";
        im.onclick = () => viewImage(m.img);
        im.onload = () => { box.scrollTop = box.scrollHeight; };
        div.append(im);
      } else if (isVid(m.video)) {
        const v = document.createElement("video");
        v.src = m.video;
        v.controls = true;
        v.preload = "metadata";
        v.playsInline = true;
        v.style.cssText = "max-width:100%;border-radius:10px;display:block";
        div.append(v);
      } else {
        div.textContent = m.text;
      }
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

  const post = async (label, extra) => {
    const now = Date.now();
    await addDoc(collection(db, "chats", chatId, "messages"), {
      from: user.uid, text: label, at: serverTimestamp(), t: now, ...extra
    });
    await updateDoc(chatRef, {
      lastText: label.slice(0, 60),
      lastAt: now,
      lastFrom: user.uid,
      ["seen." + user.uid]: now
    });
  };

  const send = async () => {
    const text = $("text").value.trim();
    if (!text) return;
    $("text").value = "";
    try { await post(text, {}); }
    catch (e) { alert("Message not sent. You may have blocked this person, or been blocked."); }
  };
  $("send").onclick = send;
  $("text").onkeydown = e => { if (e.key === "Enter") send(); };

  const bar = document.querySelector(".bar");
  const attach = document.createElement("button");
  attach.textContent = "+";
  attach.style.padding = "12px 16px";
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*,video/*";
  picker.style.display = "none";
  bar.prepend(attach);
  bar.append(picker);
  attach.onclick = () => picker.click();
  picker.onchange = async () => {
    const f = picker.files[0];
    picker.value = "";
    if (!f) return;
    attach.disabled = true;
    attach.textContent = "...";
    try {
      if (f.type.startsWith("image/")) await post("\uD83D\uDCF7 Photo", { img: await shrink(f) });
      else if (f.type.startsWith("video/")) await post("\uD83C\uDFA5 Video", { video: await uploadVideo(f) });
      else alert("Please choose a photo or a video.");
    } catch (e) {
      alert(e.code === "permission-denied"
        ? "Not sent. You may have blocked this person, or been blocked."
        : (e.message || "Could not send."));
    }
    attach.disabled = false;
    attach.textContent = "+";
  };
});
