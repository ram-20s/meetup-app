import { db } from "./firebase.js";
import { doc, setDoc, deleteDoc, getDocs, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const REASONS = [
  "Fake profile or catfishing",
  "Nude or sexual photo",
  "Harassment or abusive messages",
  "Scam or asking for money",
  "Underage (under 18)",
  "Hate speech or threats",
  "Spam or advertising",
  "Other"
];

export function askReason(name) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px;z-index:999";
    const card = document.createElement("div");
    card.style.cssText = "background:#1c1c1c;color:#eee;border-radius:14px;padding:16px;max-width:380px;width:100%;max-height:90vh;overflow-y:auto;font-family:sans-serif";
    const title = document.createElement("h3");
    title.textContent = "Report " + name;
    title.style.margin = "0 0 8px";
    card.append(title);

    const base = "display:block;width:100%;padding:12px;margin:4px 0;border:0;border-radius:8px;font-size:15px;color:#fff;text-align:left;box-sizing:border-box;";
    let chosen = "";
    const optBtns = [];
    REASONS.forEach(r => {
      const b = document.createElement("button");
      b.textContent = r;
      b.style.cssText = base + "background:#333;";
      b.onclick = () => {
        chosen = r;
        optBtns.forEach(x => { x.style.background = "#333"; });
        b.style.background = "#e91e63";
        err.textContent = "";
      };
      optBtns.push(b);
      card.append(b);
    });

    const details = document.createElement("textarea");
    details.rows = 3;
    details.maxLength = 250;
    details.placeholder = "More details (optional)";
    details.style.cssText = "width:100%;padding:12px;margin:8px 0;border:0;border-radius:8px;font-size:15px;box-sizing:border-box;background:#2a2a2a;color:#eee;font-family:inherit";
    card.append(details);

    const err = document.createElement("div");
    err.style.cssText = "color:#ff8a80;font-size:14px;min-height:18px";
    card.append(err);

    const done = value => { overlay.remove(); resolve(value); };
    const send = document.createElement("button");
    send.textContent = "Send report";
    send.style.cssText = base + "background:#e91e63;text-align:center;font-weight:bold;";
    send.onclick = () => {
      if (!chosen) { err.textContent = "Please choose a reason."; return; }
      const extra = details.value.trim();
      done(chosen + (extra ? ": " + extra : ""));
    };
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.style.cssText = base + "background:none;text-align:center;text-decoration:underline;color:#aaa;";
    cancel.onclick = () => done(null);
    card.append(send, cancel);

    overlay.append(card);
    document.body.append(overlay);
  });
}

export async function getBlockSets(myUid) {
  const [a, b] = await Promise.all([
    getDocs(collection(db, "users", myUid, "blocked")),
    getDocs(collection(db, "users", myUid, "blockedBy"))
  ]);
  return {
    blocked: new Set(a.docs.map(d => d.id)),
    blockedBy: new Set(b.docs.map(d => d.id))
  };
}

export async function blockUser(myUid, otherUid) {
  await setDoc(doc(db, "users", myUid, "blocked", otherUid), { at: Date.now() });
  await setDoc(doc(db, "users", otherUid, "blockedBy", myUid), { at: Date.now() });
}

export async function unblockUser(myUid, otherUid) {
  await deleteDoc(doc(db, "users", myUid, "blocked", otherUid));
  await deleteDoc(doc(db, "users", otherUid, "blockedBy", myUid));
}

export async function reportUser(myUid, otherUid, reason) {
  await addDoc(collection(db, "reports"), {
    reporterId: myUid,
    reportedId: otherUid,
    reason: String(reason).slice(0, 300),
    at: Date.now()
  });
}
