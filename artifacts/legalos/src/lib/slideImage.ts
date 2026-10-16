// Slide visual upload pipeline: reads a picked file, downscales anything
// larger than 1600px on its long edge (keeps data URLs small enough for
// slide state + pptx/pdf embedding), and preserves PNG transparency.

const MAX_EDGE = 1600;
/** Hard limits so a hostile/huge file can't exhaust browser memory: read
 *  nothing over 15 MB, decode nothing over ~40 MP, and allow only flat
 *  raster formats (SVG is scriptable; GIFs can be animated bombs). */
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image file."));
    img.src = src;
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

/** File → slide-ready data URL (downscaled; PNG kept for transparency). */
export async function fileToSlideImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use a JPEG, PNG, or WebP image (no SVG or animated files).");
  if (file.size > MAX_FILE_BYTES) throw new Error("That image is over 15 MB — export a smaller copy first.");
  const original = await readAsDataURL(file);
  const img = await loadImage(original);
  if (img.width * img.height > MAX_PIXELS) throw new Error("That image's resolution is too large to use safely.");

  const needsResize = Math.max(img.width, img.height) > MAX_EDGE;
  const keepPng = file.type === "image/png"; // preserve alpha channels
  if (!needsResize && (keepPng || file.type === "image/jpeg")) return original;

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return original; // canvas unavailable — fall back to the original
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return keepPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
}
