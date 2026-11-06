import { db } from "./firebase.js";
import { collection, getDocs, limit, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ageOf = dob => {
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

let people = [];
let listBox = null;
let searchEl = null;
let genderEl = null;

function render() {
  const text = searchEl.value.trim().toLowerCase();
  const g = genderEl.value;
  listBox.textContent = "";
  let count = 0;
  people.forEach(p => {
    const u = p.data;
    if (text && !String(u.name).toLowerCase().includes(text)) return;
    if (g && u.gender !== g) return;
    count++;
    const row = document.createElement("div");
    row.className = "p";
    const title = document.createElement("b");
    title.textContent = u.name + ", " + ageOf(u.dob);
    const info = document.createElement("div");
    info.textContent = [u.gender, u.city].filter(Boolean).join(" · ");
    const bio = document.createElement("div");
    bio.textContent = u.bio;
    const btn = document.createElement("button");
    btn.textContent = "Message";
    btn.onclick = () => { location.href = "chat.html?uid=" + p.id; };
    row.append(title, info, bio, btn);
    listBox.append(row);
  });
  if (!count) {
    listBox.textContent = people.length
      ? "No one matches your search."
      : "No profiles yet. Invite a friend to join!";
  }
}

function buildControls(box) {
  searchEl = document.createElement("input");
  searchEl.placeholder = "Search by name";
  genderEl = document.createElement("select");
  [["", "Everyone"], ["Man", "Men"], ["Woman", "Women"], ["Other", "Other"]].forEach(([v, t]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = t;
    genderEl.append(o);
  });
  searchEl.oninput = render;
  genderEl.onchange = render;
  box.before(searchEl, genderEl);
}

export async function loadPeople(myUid, box) {
  listBox = box;
  if (!searchEl) buildControls(box);
  box.textContent = "Loading...";
  const snap = await getDocs(query(collection(db, "users"), limit(200)));
  people = [];
  snap.forEach(s => {
    if (s.id === myUid) return;
    const u = s.data();
    if (!u.name || !u.bio) return;
    people.push({ id: s.id, data: u });
  });
  render();
}
