import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function setupAge($, say, run, show) {
  $("ageBtn").onclick = () => run(async () => {
    const name = $("name").value.trim();
    const dob = $("dob").value;
    if (!name || !dob) return say("Please fill in your name and date of birth.");
    const d = new Date(dob);
    const n = new Date();
    let age = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) age--;
    if (age < 18) {
      say("Sorry, you must be 18 or older.");
      return signOut(auth);
    }
    await setDoc(doc(db, "users", auth.currentUser.uid), { name, dob, createdAt: serverTimestamp() });
    $("welcome").textContent = "Welcome, " + name + "!";
    show("homeBox");
  });
}
