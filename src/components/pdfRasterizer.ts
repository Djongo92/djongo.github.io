// Renders each page of a PDF to a JPEG data URL entirely client-side, using
// pdf.js's canvas renderer. This is what makes real visual design critique
// possible: a .pptx is a zip of XML with no layout renderer available in the
// browser, but a PDF (which Canva, Keynote, Google Slides, and PowerPoint
// all export natively) rasterizes reliably via pdf.js — no server upload
// needed to see what the deck actually looks like.
import * as pdfjsLib from "pdfjs-dist";
// Vite-native worker URL resolution — see https://vitejs.dev/guide/assets.html#new-url-url-import-meta-url
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface RasterizedPage {
  index: number;
  dataUrl: string;
}

const MAX_PAGES = 20;
const TARGET_WIDTH = 1100;
const JPEG_QUALITY = 0.75;

export async function rasterizePdfToImages(file: File | Blob): Promise<RasterizedPage[]> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = Math.min(doc.numPages, MAX_PAGES);
  const pages: RasterizedPage[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = TARGET_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pages.push({ index: i, dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY) });
  }

  await doc.destroy();
  return pages;
}

export const PDF_RASTERIZE_MAX_PAGES = MAX_PAGES;
