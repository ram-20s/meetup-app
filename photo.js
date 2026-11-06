import { auth, db } from "./firebase.js";
import { checkPhoto } from "./screen.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const MAX = 256;

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
      resolve({ dataUrl: c.toDataURL("image/jpeg", 0.7), canvas: c });
    };
    img.onerror = () => reject(new Error("Could not read this image."));
    img.src = url;
  });
}

onAuthStateChanged(auth, async user => {
  if (!user || !user.emailVerified) return;
  const save = document.getElementById("saveBtn");
  if (!save) return;
  const ref = doc(db, "users", user.uid);

  const wrap = document.createElement("div");
  const label = document.createElement("b");
  label.textContent = "Profile photo";
  const preview = document.createElement("img");
  preview.style.cssText = "width:96px;height:96px;object-fit:cover;border-radius:50%;display:none;margin:8px 0";
  const pick = document.createElement("input");
  pick.type = "file";
  pick.accept = "image/*";
  const rm = document.createElement("button");
  rm.className = "s";
  rm.textContent = "Remove photo";
  rm.style.display = "none";
  const note = document.createElement("small");
  note.textContent = "Nude or sexual photos are not allowed and lead to a ban.";
  const status = document.createElement("div");
  wrap.append(label, preview, pick, rm, note, status);
  save.before(wrap);

  const show = url => {
    const ok = typeof url === "string" && url.startsWith("data:image/jpeg;base64,");
    preview.style.display = ok ? "block" : "none";
    rm.style.display = ok ? "block" : "none";
    if (ok) preview.src = url;
  };
  show(((await getDoc(ref)).data() || {}).photo);

  pick.onchange = async () => {
    const f = pick.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { status.textContent = "Please choose an image."; return; }
    status.textContent = "Checking photo...";
    try {
      const { dataUrl, canvas } = await resize(f);
      const res = await checkPhoto(canvas);
      if (!res.ok) { status.textContent = res.reason; pick.value = ""; return; }
      await setDoc(ref, { photo: dataUrl }, { merge: true });
      show(dataUrl);
      status.textContent = "Photo saved!";
    } catch (e) {
      status.textContent = e.message;
    }
  };

  rm.onclick = async () => {
    await updateDoc(ref, { photo: deleteField() });
    show("");
    status.textContent = "Photo removed.";
  };
});
