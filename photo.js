import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const MAX = 256;
const MAX_FILE = 15 * 1024 * 1024;
const TARGET = 27000;

const isImg = u => typeof u === "string" && u.startsWith("data:image/jpeg;base64,");

function resize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.7;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > TARGET && q > 0.3) {
        q -= 0.1;
        out = c.toDataURL("image/jpeg", q);
      }
      resolve(out);
    };
    img.onerror = () => reject(new Error("Could not read this image."));
    img.src = url;
  });
}

onAuthStateChanged(auth, async user => {
  if (!user || !user.emailVerified) return;
  const save = document.getElementById("saveBtn");
  if (!save || document.getElementById("photoBox")) return;
  const ref = doc(db, "users", user.uid);

  const wrap = document.createElement("div");
  wrap.id = "photoBox";
  wrap.style.margin = "8px 0 12px";

  const label = document.createElement("b");
  label.textContent = "Profile photo";

  const preview = document.createElement("img");
  preview.style.cssText = "width:96px;height:96px;object-fit:cover;border-radius:50%;display:none;margin:8px 0";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";

  const choose = document.createElement("button");
  choose.textContent = "Choose photo";
  choose.onclick = () => input.click();

  const rm = document.createElement("button");
  rm.className = "s";
  rm.textContent = "Remove photo";
  rm.style.display = "none";

  const note = document.createElement("small");
  note.style.cssText = "display:block;color:#aaa;margin-top:4px";
  note.textContent = "Any photo works. It is shrunk automatically to about 20 KB. Every photo is reviewed before it appears. Nude or sexual photos are not allowed and lead to a ban.";

  const status = document.createElement("div");
  status.style.cssText = "min-height:18px;margin-top:4px";

  wrap.append(label, preview, choose, rm, note, status, input);
  save.before(wrap);

  const refresh = async () => {
    const d = (await getDoc(ref)).data() || {};
    const url = isImg(d.pendingPhoto) ? d.pendingPhoto : (isImg(d.photo) ? d.photo : "");
    preview.style.display = url ? "block" : "none";
    if (url) preview.src = url;
    rm.style.display = url ? "block" : "none";
    if (isImg(d.pendingPhoto)) {
      status.textContent = "Waiting for approval. It will show on your profile once approved.";
    } else if (d.photoNote === "rejected") {
      status.textContent = "Your last photo was not approved. Please choose a different one.";
    } else {
      status.textContent = "";
    }
  };
  await refresh();

  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { status.textContent = "Please choose an image."; return; }
    if (f.size > MAX_FILE) { status.textContent = "This photo is too large. Please choose one under 15 MB."; input.value = ""; return; }
    status.textContent = "Preparing photo...";
    try {
      const dataUrl = await resize(f);
      await setDoc(ref, { pendingPhoto: dataUrl, photoNote: deleteField() }, { merge: true });
      input.value = "";
      await refresh();
    } catch (e) {
      status.textContent = e.message;
    }
  };

  rm.onclick = async () => {
    try {
      await updateDoc(ref, { photo: deleteField(), pendingPhoto: deleteField() });
      await refresh();
      status.textContent = "Photo removed.";
    } catch (e) {
      status.textContent = "Could not remove the photo. Please try again.";
    }
  };
});
