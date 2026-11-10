import { auth, db } from "./firebase.js";
import { startHeartbeat } from "./presence.js";
import { watchInbox } from "./inbox.js";
import { loadPeople } from "./browse.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const fields = ["name", "gender", "looking", "city", "bio"];
const APP = "Ravelle";

const tabInbox = document.createElement("button");
tabInbox.className = "s";
tabInbox.textContent = "Inbox";
$("logout").before(tabInbox);

const inboxCard = document.createElement("div");
inboxCard.className = "card hide";
inboxCard.id = "inboxBox";
const inboxTitle = document.createElement("h3");
inboxTitle.textContent = "Inbox";
const inboxList = document.createElement("div");
inboxCard.append(inboxTitle, inboxList);
$("browseBox").after(inboxCard);

const tab = which => {
  $("browseBox").classList.toggle("hide", which !== "browse");
  $("inboxBox").classList.toggle("hide", which !== "inbox");
  $("meBox").classList.toggle("hide", which !== "me");
};

const showUnread = n => {
  tabInbox.textContent = n ? "Inbox (" + n + ")" : "Inbox";
  tabInbox.style.background = n ? "#e91e63" : "";
  document.title = n ? "(" + n + ") " + APP : APP;
};

const notify = m => {
  try { navigator.vibrate && navigator.vibrate(200); } catch (e) {}
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(m.name, { body: m.text });
    }
  } catch (e) {}
};

document.addEventListener("click", () => {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}, { once: true });

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "index.html"; return; }
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().dob) { location.href = "index.html"; return; }
  const d = snap.data();
  fields.forEach(k => { $(k).value = d[k] || ""; });
  startHeartbeat(user.uid);
  watchInbox(user.uid, inboxList, showUnread, notify);
  loadPeople(user.uid, $("list"));
  $("saveBtn").onclick = async () => {
    const data = {};
    fields.forEach(k => { data[k] = $(k).value.trim(); });
    await setDoc(ref, data, { merge: true });
    $("msg").textContent = "Saved!";
    loadPeople(user.uid, $("list"));
  };
});

$("tabBrowse").onclick = () => tab("browse");
tabInbox.onclick = () => tab("inbox");
$("tabMe").onclick = () => tab("me");
$("logout").onclick = () => signOut(auth);
