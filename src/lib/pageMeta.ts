// Tiny document-head helper for the public, shareable pages (Visibility
// Index, Recognition Index) — no react-helmet in this project, and these
// pages don't need more than title/description/OG tags to be link-preview
// friendly, so a small upsert-by-selector helper is enough.
function upsertMeta(selector: string, build: () => HTMLMetaElement) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = build();
    document.head.appendChild(el);
  }
  return el;
}

export function setPageMeta({ title, description }: { title: string; description: string }) {
  document.title = title;

  const description_ = upsertMeta('meta[name="description"]', () => {
    const m = document.createElement("meta");
    m.name = "description";
    return m;
  });
  description_.content = description;

  const ogTitle = upsertMeta('meta[property="og:title"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:title");
    return m;
  });
  ogTitle.content = title;

  const ogDescription = upsertMeta('meta[property="og:description"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:description");
    return m;
  });
  ogDescription.content = description;

  const ogType = upsertMeta('meta[property="og:type"]', () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:type");
    return m;
  });
  ogType.content = "website";

  const twitterCard = upsertMeta('meta[name="twitter:card"]', () => {
    const m = document.createElement("meta");
    m.name = "twitter:card";
    return m;
  });
  twitterCard.content = "summary";
}
