import { db } from "./firebase.js";
import { collection, query, where, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function loadInbox(myUid, box) {
  box.textContent = "";
  const title = document.createElement("b");
  title.textContent = "My chats";
  box.append(title);
  const snap = await getDocs(query(collection(db, "chats"), where("members", "array-contains", myUid)));
  if (snap.empty) {
    const none = document.createElement("div");
    none.textContent = "No chats yet.";
    box.append(none);
    return;
  }
  for (const s of snap.docs) {
    const otherId = s.data().members.find(m => m !== myUid);
    const u = await getDoc(doc(db, "users", otherId));
    const btn = document.createElement("button");
    btn.className = "s";
    btn.textContent = u.exists() ? u.data().name : "Chat";
    btn.onclick = () => { location.href = "chat.html?uid=" + otherId; };
    box.append(btn);
  }
}
