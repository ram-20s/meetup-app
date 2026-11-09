import "./photo.js";
import { db } from "./firebase.js";
import { collection, getDocs, limit, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getBlockSets, blockUser, unblockUser, reportUser, askReason } from "./safety.js";

const ageOf = dob => {
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

let people = [];
let sets = { blocked: new Set(), blockedBy: new Set() };
let myId = "";
let listBox = null;
let blockedBox = null;
let searchEl = null;
let genderEl = null;

const photoUrl = u =>
  typeof u.photo === "string" && u.photo.startsWith("data:image/jpeg;base64,") ? u.photo : "";

function avatar(u) {
  const url = photoUrl(u);
  const el = document.createElement(url ? "img" : "div");
  el.style.cssText = "width:64px;height:64px;border-radius:50%;object-fit:cover;background:#333;flex:none";
  if (url) el.src = url;
  return el;
}

function btn(label, cls, fn) {
  const b = document.createElement("button");
  b.textContent = label;
  if (cls) b.className = cls;
  b.style.margin = "4px 0";
  b.onclick = fn;
  return b;
}

function renderBlocked() {
  blockedBox.textContent = "";
  const list = people.filter(p => sets.blocked.has(p.id));
  if (!list.length) return;
  const h = document.createElement("small");
  h.textContent = "Blocked people";
  blockedBox.append(h);
  list.forEach(p => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0";
    const n = document.createElement("span");
    n.textContent = p.data.name;
    const b = btn("Unblock", "s", async () => {
      try {
        await unblockUser(myId, p.id);
        sets.blocked.delete(p.id);
        render();
      } catch (e) { alert("Could not unblock. Please try again."); }
    });
    b.style.width = "auto";
    row.append(n, b);
    blockedBox.append(row);
  });
}

function render() {
  const text = searchEl.value.trim().toLowerCase();
  const g = genderEl.value;
  listBox.textContent = "";
  let count = 0;
  const visible = people.filter(p =>
    !p.data.banned && !sets.blocked.has(p.id) && !sets.blockedBy.has(p.id));
  visible.forEach(p => {
    const u = p.data;
    if (text && !String(u.name).toLowerCase().includes(text)) return;
    if (g && u.gender !== g) return;
    count++;

    const row = document.createElement("div");
    row.className = "p";
    const top = document.createElement("div");
    top.style.cssText = "display:flex;gap:12px;align-items:center;cursor:pointer";
    top.onclick = () => { location.href = "profile.html?uid=" + p.id; };
    const info = document.createElement("div");
    info.style.minWidth = "0";
    const title = document.createElement("b");
    title.textContent = u.name + ", " + ageOf(u.dob);
    const line = document.createElement("div");
    line.textContent = [u.gender, u.city].filter(Boolean).join(" · ");
    const bio = document.createElement("div");
    bio.textContent = u.bio;
    bio.style.cssText = "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#ccc";
    info.append(title, line, bio);
    top.append(avatar(u), info);

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:6px;margin-top:6px";
    actions.append(
      btn("Message", "", () => { location.href = "chat.html?uid=" + p.id; }),
      btn("Block", "s", async () => {
        if (!confirm("Block " + u.name + "? They will not be able to message you.")) return;
        try {
          await blockUser(myId, p.id);
          sets.blocked.add(p.id);
          render();
        } catch (e) { alert("Could not block. Please try again."); }
      }),
      btn("Report", "s", async () => {
        const reason = await askReason(u.name);
        if (!reason) return;
        try {
          await reportUser(myId, p.id, reason);
          alert("Thanks. Your report was sent for review.");
        } catch (e) { alert("Could not send the report. Please try again."); }
      })
    );

    row.append(top, actions);
    listBox.append(row);
  });
  if (!count) {
    listBox.textContent = people.length
      ? "No one matches your search."
      : "No profiles yet. Invite a friend to join!";
  }
  renderBlocked();
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
  blockedBox = document.createElement("div");
  blockedBox.style.marginTop = "16px";
  box.after(blockedBox);
}

export async function loadPeople(myUid, box) {
  myId = myUid;
  listBox = box;
  if (!searchEl) buildControls(box);
  box.textContent = "Loading...";
  const [snap, s] = await Promise.all([
    getDocs(query(collection(db, "users"), limit(200))),
    getBlockSets(myUid)
  ]);
  sets = s;
  people = [];
  snap.forEach(d => {
    if (d.id === myUid) return;
    const u = d.data();
    if (!u.name || !u.bio) return;
    people.push({ id: d.id, data: u });
  });
  render();
}
