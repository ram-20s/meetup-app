import { db } from "./firebase.js";
import { collection, getDocs, limit, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ageOf = dob => {
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

export async function loadPeople(myUid, box) {
  box.textContent = "Loading...";
  const snap = await getDocs(query(collection(db, "users"), limit(50)));
  box.textContent = "";
  let count = 0;
  snap.forEach(s => {
    if (s.id === myUid) return;
    const u = s.data();
    if (!u.name || !u.bio) return;
    count++;
    const row = document.createElement("div");
    row.className = "p";
    const title = document.createElement("b");
    title.textContent = u.name + ", " + ageOf(u.dob);
    const info = document.createElement("div");
    info.textContent = [u.gender, u.city].filter(Boolean).join(" · ");
    const bio = document.createElement("div");
    bio.textContent = u.bio;
    row.append(title, info, bio);
    box.append(row);
  });
  if (!count) box.textContent = "No profiles yet. Invite a friend to join!";
}
