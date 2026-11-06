import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function startHeartbeat(uid) {
  const beat = () => {
    if (document.visibilityState === "visible") {
      setDoc(doc(db, "users", uid), { lastActive: Date.now() }, { merge: true });
    }
  };
  beat();
  setInterval(beat, 60000);
  document.addEventListener("visibilitychange", beat);
}

export function isOnline(ts) {
  return !!ts && Date.now() - ts < 120000;
}

export function statusText(ts) {
  if (!ts) return "Offline";
  if (isOnline(ts)) return "Online";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 60) return "Last active " + m + " min ago";
  const h = Math.floor(m / 60);
  if (h < 24) return "Last active " + h + " h ago";
  return "Last active " + Math.floor(h / 24) + " d ago";
}
