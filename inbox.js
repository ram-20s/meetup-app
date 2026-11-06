import { db } from "./firebase.js";
import { collection, query, where, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { isOnline, statusText } from "./presence.js";

export function watchInbox(myUid, box, onUnread, onNew) {
  let chats = [];
  const users = {};
  let first = true;

  const draw = () => {
    box.textContent = "";
    if (!chats.length) {
      box.textContent = "No chats yet. Tap Browse and message someone.";
      onUnread(0);
      return;
    }
    chats.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    let unreadCount = 0;
    chats.forEach(c => {
      const u = users[c.otherId] || {};
      const unread = c.lastFrom && c.lastFrom !== myUid && (c.lastAt || 0) > ((c.seen || {})[myUid] || 0);
      if (unread) unreadCount++;

      const row = document.createElement("div");
      row.className = "p";
      row.style.cursor = "pointer";
      row.onclick = () => { location.href = "chat.html?uid=" + c.otherId; };

      const top = document.createElement("div");
      const dot = document.createElement("span");
      dot.textContent = "● ";
      dot.style.color = isOnline(u.lastActive) ? "#8fd694" : "#666";
      const name = document.createElement("b");
      name.textContent = u.name || "Chat";
      top.append(dot, name);
      if (unread) {
        const badge = document.createElement("span");
        badge.textContent = " New";
        badge.style.color = "#e91e63";
        badge.style.fontWeight = "bold";
        top.append(badge);
      }

      const st = document.createElement("small");
      st.style.color = "#aaa";
      st.textContent = statusText(u.lastActive);

      const last = document.createElement("div");
      last.textContent = (c.lastFrom === myUid ? "You: " : "") + (c.lastText || "");
      if (unread) last.style.fontWeight = "bold";

      row.append(top, st, last);
      box.append(row);
    });
    onUnread(unreadCount);
  };

  const refreshUsers = async () => {
    await Promise.all(chats.map(async c => {
      const s = await getDoc(doc(db, "users", c.otherId));
      users[c.otherId] = s.data() || {};
    }));
    draw();
  };

  onSnapshot(query(collection(db, "chats"), where("members", "array-contains", myUid)), snap => {
    chats = snap.docs.map(s => {
      const d = s.data();
      return { ...d, otherId: d.members.find(m => m !== myUid) };
    });
    if (!first) {
      snap.docChanges().forEach(ch => {
        if (ch.type === "removed") return;
        const d = ch.doc.data();
        const otherId = d.members.find(m => m !== myUid);
        if (d.lastFrom && d.lastFrom !== myUid && (d.lastAt || 0) > ((d.seen || {})[myUid] || 0)) {
          onNew({ name: (users[otherId] || {}).name || "New message", text: d.lastText || "" });
        }
      });
    }
    first = false;
    draw();
    refreshUsers();
  });

  setInterval(refreshUsers, 30000);
}
