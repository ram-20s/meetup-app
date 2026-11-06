import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getBlockSets, blockUser, unblockUser, reportUser, askReason } from "./safety.js";

const $ = id => document.getElementById(id);
const other = new URLSearchParams(location.search).get("uid");

onAuthStateChanged(auth, async user => {
  if (!user || !user.emailVerified || !other || other === user.uid) return;
  const top = document.querySelector(".top");
  const bar = document.querySelector(".bar");
  if (!top || !bar) return;

  const mk = (label, fn) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "padding:8px 12px;border:0;border-radius:8px;background:#333;color:#fff;font-size:14px";
    b.onclick = fn;
    return b;
  };

  const note = document.createElement("div");
  note.style.cssText = "display:none;padding:10px;text-align:center;color:#ff8a80;font-size:14px;background:#1c1c1c";

  let sets = { blocked: new Set(), blockedBy: new Set() };
  try { sets = await getBlockSets(user.uid); } catch (e) {}

  const blockBtn = mk("Block", async () => {
    try {
      if (sets.blocked.has(other)) {
        await unblockUser(user.uid, other);
        sets.blocked.delete(other);
      } else {
        if (!confirm("Block this person? They will not be able to message you.")) return;
        await blockUser(user.uid, other);
        sets.blocked.add(other);
      }
      apply();
    } catch (e) { alert("That did not work. Please try again."); }
  });

  const reportBtn = mk("Report", async () => {
    const name = ($("who").firstElementChild || {}).textContent || "this person";
    const reason = await askReason(name);
    if (!reason) return;
    try {
      await reportUser(user.uid, other, reason);
      alert("Thanks. Your report was sent for review.");
    } catch (e) { alert("Could not send the report. Please try again."); }
  });

  const menu = document.createElement("div");
  menu.style.cssText = "margin-left:auto;display:flex;gap:8px";
  menu.append(blockBtn, reportBtn);
  top.append(menu);
  bar.before(note);

  function apply() {
    const iBlocked = sets.blocked.has(other);
    const locked = iBlocked || sets.blockedBy.has(other);
    $("text").disabled = locked;
    $("send").disabled = locked;
    bar.style.opacity = locked ? "0.4" : "1";
    note.style.display = locked ? "block" : "none";
    note.textContent = iBlocked
      ? "You blocked this person. Tap Unblock to send messages."
      : "Messages can't be sent in this chat.";
    blockBtn.textContent = iBlocked ? "Unblock" : "Block";
  }
  apply();
});
