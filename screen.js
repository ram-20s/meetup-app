const TF = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const NSFW = "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.0/dist/browser/nsfwjs.min.js";

const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement("script");
  s.src = src;
  s.onload = resolve;
  s.onerror = () => reject(new Error("load failed"));
  document.head.append(s);
});

let modelPromise = null;
const getModel = () => {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript(TF);
      await loadScript(NSFW);
      return await window.nsfwjs.load();
    })();
    modelPromise.catch(() => { modelPromise = null; });
  }
  return modelPromise;
};

export async function checkPhoto(canvas) {
  try {
    const model = await getModel();
    const preds = await model.classify(canvas);
    const p = {};
    preds.forEach(x => { p[x.className] = x.probability; });
    const bad = (p.Porn || 0) + (p.Hentai || 0);
    if (bad > 0.2 || (p.Sexy || 0) > 0.6) {
      return { ok: false, reason: "This photo looks inappropriate and was not uploaded. Please choose a different photo." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "The photo check could not start, so the photo was not uploaded. Check your internet and try again." };
  }
}
