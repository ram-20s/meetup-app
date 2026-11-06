const TF = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const NSFW = "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.0/dist/browser/nsfwjs.min.js";
const MODELS = [
  "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.0/dist/models/mobilenet_v2/",
  "https://cdn.jsdelivr.net/gh/infinitered/nsfwjs@master/models/mobilenet_v2/"
];

const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement("script");
  s.src = src;
  s.onload = resolve;
  s.onerror = () => reject(new Error("could not download " + src));
  document.head.append(s);
});

let modelPromise = null;

async function tryLoad() {
  await loadScript(TF);
  await loadScript(NSFW);
  if (!window.nsfwjs) throw new Error("checker did not start");
  const errors = [];
  for (const url of MODELS) {
    try {
      return await window.nsfwjs.load(url, { type: "graph" });
    } catch (e) {
      errors.push(url.split("/")[3] + ": " + String((e && e.message) || e).slice(0, 80));
    }
  }
  throw new Error(errors.join(" | "));
}

export async function checkPhoto(canvas) {
  try {
    if (!modelPromise) {
      modelPromise = tryLoad();
      modelPromise.catch(() => { modelPromise = null; });
    }
    const model = await modelPromise;
    const preds = await model.classify(canvas);
    const p = {};
    preds.forEach(x => { p[x.className] = x.probability; });
    const bad = (p.Porn || 0) + (p.Hentai || 0);
    if (bad > 0.2 || (p.Sexy || 0) > 0.6) {
      return { ok: false, reason: "This photo looks inappropriate and was not uploaded. Please choose a different photo." };
    }
    return { ok: true };
  } catch (e) {
    const why = String((e && e.message) || e).slice(0, 300);
    return { ok: false, reason: "The photo check could not start, so the photo was not uploaded. Details: " + why };
  }
}
