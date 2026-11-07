import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, updateDoc, onSnapshot, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const other = new URLSearchParams(location.search).get("uid");
const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const el = (tag, css, text) => {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text) e.textContent = text;
  return e;
};
const pill = (label, bg, fn) => {
  const b = el("button", "padding:10px 18px;border:0;border-radius:24px;color:#fff;font-size:15px;font-weight:bold;margin:0 6px;background:" + bg, label);
  b.onclick = fn;
  return b;
};
const friendly = e => {
  const n = (e && (e.name || e.code)) || "";
  if (n === "NotAllowedError") return "Please allow microphone and camera access, then try again.";
  if (n === "NotFoundError") return "No microphone or camera was found on this device.";
  if (n === "permission-denied") return "You can't call this person (blocked, banned, or not allowed).";
  return (e && e.message) || "The call could not start.";
};

onAuthStateChanged(auth, user => {
  if (!user || !user.emailVerified || !other || other === user.uid) return;
  const who = document.getElementById("who");
  if (!who) return;

  const chatId = [user.uid, other].sort().join("_");
  const callRef = doc(db, "chats", chatId, "call", "current");
  const candCol = collection(db, "chats", chatId, "candidates");

  let pc = null, stream = null, callId = 0, timer = null, busy = false;
  let overlay = null, remoteEl = null, localEl = null, statusEl = null;
  let ringBox = null, ringId = 0, gotAnswer = false;
  const store = {};

  const box = el("div", "display:flex;gap:6px;margin-left:8px");
  const topBtn = (label, kind) => {
    const b = el("button", "padding:8px 12px;border:0;border-radius:8px;background:#333;color:#fff;font-size:14px", label);
    b.onclick = () => startCall(kind);
    return b;
  };
  box.append(topBtn("Call", "audio"), topBtn("Video", "video"));
  who.after(box);

  function showOverlay(kind, text) {
    overlay = el("div", "position:fixed;inset:0;background:#000;z-index:1000;display:flex;flex-direction:column");
    remoteEl = el("video", "flex:1;width:100%;min-height:0;object-fit:cover;background:#111");
    remoteEl.autoplay = true;
    remoteEl.playsInline = true;
    localEl = el("video", "position:absolute;right:12px;top:12px;width:96px;height:128px;object-fit:cover;border-radius:10px;background:#222");
    localEl.autoplay = true;
    localEl.muted = true;
    localEl.playsInline = true;
    if (kind === "audio") localEl.style.display = "none";
    statusEl = el("div", "position:absolute;left:0;right:0;top:40%;text-align:center;color:#fff;font-size:20px", text);
    const bar = el("div", "display:flex;justify-content:center;padding:16px;background:#111");
    const mute = pill("Mute", "#333", () => {
      const t = stream && stream.getAudioTracks()[0];
      if (t) { t.enabled = !t.enabled; mute.textContent = t.enabled ? "Mute" : "Unmute"; }
    });
    bar.append(mute);
    if (kind === "video") {
      const cam = pill("Camera off", "#333", () => {
        const t = stream && stream.getVideoTracks()[0];
        if (t) { t.enabled = !t.enabled; cam.textContent = t.enabled ? "Camera off" : "Camera on"; }
      });
      bar.append(cam);
    }
    bar.append(pill("End", "#e53935", () => endCall(true)));
    overlay.append(remoteEl, localEl, statusEl, bar);
    document.body.append(overlay);
  }

  async function setup(kind) {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
    localEl.srcObject = stream;
    pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => {
      remoteEl.srcObject = e.streams[0];
      statusEl.textContent = "";
    };
    pc.onicecandidate = e => {
      if (e.candidate) {
        addDoc(candCol, { from: user.uid, id: callId, c: JSON.stringify(e.candidate.toJSON()) }).catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc && pc.connectionState === "failed" && statusEl) {
        statusEl.textContent = "Connection failed. Try again on Wi-Fi.";
      }
    };
  }

  function flush() {
    const list = store[callId] || [];
    store[callId] = [];
    list.forEach(c => pc.addIceCandidate(c).catch(() => {}));
  }

  function cleanup() {
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (pc) pc.close();
    pc = null;
    stream = null;
    busy = false;
    gotAnswer = false;
    if (overlay) overlay.remove();
    overlay = null;
    if (ringBox) ringBox.remove();
    ringBox = null;
  }

  async function endCall(notify) {
    const was = busy;
    cleanup();
    if (notify && was) {
      try { await updateDoc(callRef, { status: "ended" }); } catch (e) {}
    }
  }

  async function startCall(kind) {
    if (busy) return;
    busy = true;
    callId = Date.now();
    showOverlay(kind, "Calling...");
    try {
      await setup(kind);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(callRef, {
        id: callId, at: callId, type: kind, from: user.uid, status: "ringing",
        offer: { type: offer.type, sdp: offer.sdp }
      });
      timer = setTimeout(() => {
        if (busy && statusEl && statusEl.textContent === "Calling...") {
          statusEl.textContent = "No answer.";
          setTimeout(() => endCall(true), 1500);
        }
      }, 45000);
    } catch (e) {
      cleanup();
      alert(friendly(e));
    }
  }

  async function accept(d) {
    if (ringBox) { ringBox.remove(); ringBox = null; }
    busy = true;
    callId = d.id;
    showOverlay(d.type, "Connecting...");
    try {
      await setup(d.type);
      await pc.setRemoteDescription(d.offer);
      flush();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp }, status: "active" });
    } catch (e) {
      cleanup();
      try { await updateDoc(callRef, { status: "ended" }); } catch (x) {}
      alert(friendly(e));
    }
  }

  async function decline() {
    if (ringBox) { ringBox.remove(); ringBox = null; }
    try { await updateDoc(callRef, { status: "declined" }); } catch (e) {}
  }

  function showRinging(d) {
    if (ringBox && ringId === d.id) return;
    if (ringBox) ringBox.remove();
    ringId = d.id;
    ringBox = el("div", "position:fixed;left:12px;right:12px;top:12px;z-index:999;background:#1c1c1c;border:1px solid #e91e63;border-radius:14px;padding:14px;text-align:center;color:#fff");
    ringBox.append(el("div", "margin-bottom:10px;font-size:17px", "Incoming " + (d.type === "video" ? "video" : "voice") + " call"));
    ringBox.append(pill("Accept", "#2e7d32", () => accept(d)), pill("Decline", "#e53935", decline));
    document.body.append(ringBox);
  }

  onSnapshot(callRef, async s => {
    const d = s.data();
    if (!d) return;
    if (d.from === user.uid) {
      if (!busy || d.id !== callId) return;
      if (d.answer && pc && !gotAnswer) {
        gotAnswer = true;
        try {
          await pc.setRemoteDescription(d.answer);
          flush();
          if (statusEl && statusEl.textContent === "Calling...") statusEl.textContent = "Connecting...";
        } catch (e) {}
      }
      if (d.status === "declined") {
        if (statusEl) statusEl.textContent = "Declined.";
        setTimeout(cleanup, 1500);
      }
      if (d.status === "ended") cleanup();
      return;
    }
    if (d.status === "ringing" && !busy && Date.now() - d.at < 45000) showRinging(d);
    if (d.status !== "ringing" && ringBox && ringId === d.id && !busy) {
      ringBox.remove();
      ringBox = null;
    }
    if (d.status === "ended" && busy && d.id === callId) cleanup();
  });

  onSnapshot(candCol, s => {
    s.docChanges().forEach(ch => {
      if (ch.type !== "added") return;
      const d = ch.doc.data();
      if (d.from === user.uid) return;
      let c;
      try { c = JSON.parse(d.c); } catch (e) { return; }
      if (!store[d.id]) store[d.id] = [];
      if (busy && d.id === callId && pc && pc.remoteDescription) {
        pc.addIceCandidate(c).catch(() => {});
      } else {
        store[d.id].push(c);
      }
    });
  });
});
