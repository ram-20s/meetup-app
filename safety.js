import { db } from "./firebase.js";
import { doc, setDoc, deleteDoc, getDocs, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
