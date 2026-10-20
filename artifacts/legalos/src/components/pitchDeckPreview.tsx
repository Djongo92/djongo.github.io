// DOM mirror of the pitchDeckExport.ts canvas layouts — the Deck Builder
// stage and filmstrip render these; export renders the canvas twin. The two
// must stay visually in sync: same palette, same five layouts, same order.
// Slides are designed at a fixed 1280×720 and scaled with a transform so the
// layout is pixel-identical at every size (stage, thumbnail, export).
import { useEffect, useRef, useState } from "react";
import { paletteFor, type DeckTheme, type DeckPalette } from "@/lib/deckTheme";
import { stripStepPrefix, splitLead, type ParsedSlide } from "./pitchDeckParser";
import {
  DOM_SCALE, COVER_IMAGE, COVER_TEXT_MAX, SECTION_IMAGE, SECTION_TEXT_MAX,
  CONTENT_IMAGE, CONTENT_TEXT_MAX,
} from "./slideVisualGeometry";

const DESIGN_W = 1280;
const DESIGN_H = 720;


const slideNumber = (i: number, total: number) =>
  `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

const splitStat = (bullet: string): [string, string] => {
  const m = bullet.trim().match(/^([\d$€£%×x+~][\d.,$€£%+×x~kKmMbB]*)\s+([\s\S]*)$/);
  return m ? [m[1], m[2]] : ["", bullet];
};

export interface SlidePreviewProps {
  slide: ParsedSlide;
  index: number;
  total: number;
  audience?: string;
  firmName?: string | null;
  theme?: DeckTheme;
}

/** Fixed 1280×720 slide surface. Wrap in <ScaledSlide> for real sizes. */
export function SlideCanvas({ slide, index, total, audience, firmName, theme }: SlidePreviewProps) {
  const C = paletteFor(theme);
  const base: React.CSSProperties = {
    width: DESIGN_W,
    height: DESIGN_H,
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    fontFamily: C.sans,
  };
  const serif = C.serif;
  const num = slideNumber(index, total);

  if (slide.layout === "title") {
    return (
      <div style={{ ...base, background: C.navy }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: C.gold }} />
        {slide.imageUrl && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: COVER_IMAGE.w * DOM_SCALE }}>
            <img src={slide.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${C.navy} 0%, rgba(${C.primaryRgb}, 0) 55%)` }} />
          </div>
        )}
        {C.logoUrl ? (
          <img src={C.logoUrl} alt="" style={{ position: "absolute", top: 52, left: 64, maxHeight: 56, maxWidth: 260, objectFit: "contain" }} />
        ) : (
          <div style={{ position: "absolute", top: 64, left: 64, color: C.goldLight, fontSize: 20, letterSpacing: 5 }}>
            {(firmName || "UVID").toUpperCase()}
          </div>
        )}
        <div style={{ position: "absolute", top: 200, left: 64, right: slide.imageUrl ? 1280 - 64 - COVER_TEXT_MAX * DOM_SCALE : 120, color: "#fff", fontFamily: serif, fontWeight: 700, fontSize: 56, lineHeight: 1.15 }}>
          {slide.headline || slide.title}
        </div>
        <div style={{ position: "absolute", top: 470, left: 64, right: slide.imageUrl ? 1280 - 64 - COVER_TEXT_MAX * DOM_SCALE : 120 }}>
          {slide.bullets.slice(0, 4).map((b, i) => (
            <div key={i} style={{ color: C.goldLight, fontSize: 22, lineHeight: 1.6 }}>—&nbsp;&nbsp;{b}</div>
          ))}
        </div>
        {audience && (
          <div style={{ position: "absolute", bottom: 48, left: 64, color: "#fff", fontSize: 17, letterSpacing: 1 }}>
            PREPARED FOR — {audience.toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  if (slide.layout === "section") {
    return (
      <div style={{ ...base, background: C.navy }}>
        {slide.imageUrl && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: SECTION_IMAGE.w * DOM_SCALE }}>
            <img src={slide.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${C.navy} 0%, rgba(${C.primaryRgb}, 0) 60%)` }} />
          </div>
        )}
        <div style={{ position: "absolute", top: 64, left: 64, color: C.gold, fontSize: 20, fontWeight: 700 }}>{num}</div>
        <div style={{ position: "absolute", top: 116, left: 64, color: C.goldLight, fontSize: 20, letterSpacing: 3 }}>
          {slide.title.toUpperCase()}
        </div>
        <div style={{ position: "absolute", top: 280, left: 64, right: slide.imageUrl ? 1280 - 64 - SECTION_TEXT_MAX * DOM_SCALE : 140, color: "#fff", fontFamily: serif, fontWeight: 700, fontSize: 68, lineHeight: 1.15 }}>
          {slide.headline}
        </div>
      </div>
    );
  }

  if (slide.layout === "quote") {
    return (
      <div style={{ ...base, background: C.paper }}>
        {slide.imageUrl && (
          <>
            <img src={slide.imageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: `rgba(${C.paperRgb}, 0.88)` }} />
          </>
        )}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: C.navy }} />
        <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 3, background: C.gold }} />
        <div style={{ position: "absolute", top: 60, left: 90, color: C.gold, fontFamily: serif, fontSize: 190, lineHeight: 1 }}>“</div>
        <div style={{ position: "absolute", top: 300, left: 140, right: 140, textAlign: "center", color: C.navy, fontFamily: serif, fontStyle: "italic", fontWeight: 700, fontSize: 42, lineHeight: 1.25 }}>
          {slide.headline}
        </div>
        <div style={{ position: "absolute", bottom: 90, left: 140, right: 140, textAlign: "center" }}>
          {slide.bullets.slice(0, 3).map((b, i) => (
            <div key={i} style={{ color: C.muted, fontSize: 21, lineHeight: 1.5 }}>{b}</div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.layout === "stats") {
    return (
      <div style={{ ...base, background: C.paper }}>
        <Chrome C={C} title={slide.title} num={num} />
        {slide.imageUrl && (
          <img src={slide.imageUrl} alt="" style={{ position: "absolute", top: CONTENT_IMAGE.y * DOM_SCALE, right: 64, width: CONTENT_IMAGE.w * DOM_SCALE, height: CONTENT_IMAGE.h * DOM_SCALE, objectFit: "cover", borderRadius: 4 }} />
        )}
        <div style={{ position: "absolute", top: 170, left: 64, right: slide.imageUrl ? 1280 - 64 - CONTENT_TEXT_MAX * DOM_SCALE : 100, color: C.navy, fontFamily: serif, fontWeight: 700, fontSize: 40, lineHeight: 1.2 }}>
          {slide.headline}
        </div>
        <div style={{ position: "absolute", top: 320, left: 64, right: slide.imageUrl ? 1280 - 64 - CONTENT_TEXT_MAX * DOM_SCALE : 80 }}>
          {slide.bullets.slice(0, 4).map((b, i) => {
            const [stat, rest] = splitStat(b);
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 20, marginBottom: 34 }}>
                {stat ? (
                  <>
                    <span style={{ color: C.gold, fontFamily: serif, fontWeight: 700, fontSize: 50, minWidth: 180 }}>{stat}</span>
                    <span style={{ color: C.ink, fontSize: 22, lineHeight: 1.35 }}>{rest}</span>
                  </>
                ) : (
                  <span style={{ color: C.ink, fontSize: 22 }}>•&nbsp;&nbsp;{b}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (slide.layout === "split") {
    return (
      <div style={{ ...base, background: C.paper }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 640, background: C.navy }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 640, height: 8, background: C.gold }} />
        <div style={{ position: "absolute", top: 64, left: 64, color: C.goldLight, fontSize: 18, letterSpacing: 3 }}>{slide.title.toUpperCase()}</div>
        <div style={{ position: "absolute", top: 190, left: 64, width: 520, color: "#fff", fontFamily: serif, fontWeight: 700, fontSize: 44, lineHeight: 1.2 }}>{slide.headline}</div>
        <div style={{ position: "absolute", bottom: 48, left: 64, color: C.gold, fontSize: 16, fontWeight: 700 }}>{num}</div>
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" style={{ position: "absolute", top: 0, right: 0, width: 640, height: 720, objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", top: 150, left: 700, right: 64 }}>
            {slide.bullets.slice(0, 5).map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 28 }}>
                <span style={{ color: C.gold, fontSize: 24, lineHeight: 1.4 }}>•</span>
                <span style={{ color: C.ink, fontSize: 24, lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (slide.layout === "process") {
    const steps = slide.bullets.slice(0, 5);
    return (
      <div style={{ ...base, background: C.paper }}>
        <Chrome C={C} title={slide.title} num={num} />
        <div style={{ position: "absolute", top: 170, left: 64, right: 100, color: C.navy, fontFamily: serif, fontWeight: 700, fontSize: 40, lineHeight: 1.2 }}>
          {slide.headline}
        </div>
        <div style={{ position: "absolute", top: 380, left: 64, right: 64, height: 3, background: `${C.gold}66` }} />
        <div style={{ position: "absolute", top: 340, left: 64, right: 64, display: "flex" }}>
          {steps.map((b, i) => {
            const [lead, rest] = splitLead(stripStepPrefix(b));
            return (
              <div key={i} style={{ flex: 1, padding: "0 14px", textAlign: "center" }}>
                <div style={{ width: 84, height: 84, margin: "-3px auto 0", borderRadius: "50%", background: C.navy, color: C.goldLight, fontFamily: serif, fontWeight: 700, fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", border: `4px solid ${C.paper}` }}>{i + 1}</div>
                <div style={{ marginTop: 28, color: C.navy, fontFamily: serif, fontWeight: 700, fontSize: 24, lineHeight: 1.25 }}>{lead || rest}</div>
                {lead && <div style={{ marginTop: 10, color: C.ink, fontSize: 19, lineHeight: 1.4 }}>{rest}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (slide.layout === "cards") {
    const cards = slide.bullets.slice(0, 4);
    return (
      <div style={{ ...base, background: C.paper }}>
        <Chrome C={C} title={slide.title} num={num} />
        <div style={{ position: "absolute", top: 170, left: 64, right: 100, color: C.navy, fontFamily: serif, fontWeight: 700, fontSize: 40, lineHeight: 1.2 }}>
          {slide.headline}
        </div>
        <div style={{ position: "absolute", top: 330, left: 64, right: 64, display: "flex", gap: 24 }}>
          {cards.map((b, i) => {
            const [lead, rest] = splitLead(b);
            return (
              <div key={i} style={{ flex: 1, background: "#fff", borderTop: `4px solid ${C.gold}`, boxShadow: "0 1px 6px rgba(18,24,38,0.12)", padding: "26px 24px", minHeight: 270 }}>
                <div style={{ color: C.navy, fontFamily: serif, fontWeight: 700, fontSize: 26, lineHeight: 1.2 }}>{lead}</div>
                <div style={{ marginTop: 14, color: C.ink, fontSize: 20, lineHeight: 1.45 }}>{rest}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // bullets (default)
  return (
    <div style={{ ...base, background: C.paper }}>
      <Chrome C={C} title={slide.title} num={num} />
      {slide.imageUrl && (
        <img src={slide.imageUrl} alt="" style={{ position: "absolute", top: CONTENT_IMAGE.y * DOM_SCALE, right: 64, width: CONTENT_IMAGE.w * DOM_SCALE, height: CONTENT_IMAGE.h * DOM_SCALE, objectFit: "cover", borderRadius: 4 }} />
      )}
      <div style={{ position: "absolute", top: 170, left: 64, right: slide.imageUrl ? 1280 - 64 - CONTENT_TEXT_MAX * DOM_SCALE : 100, color: C.navy, fontFamily: serif, fontWeight: 700, fontSize: 42, lineHeight: 1.2 }}>
        {slide.headline}
      </div>
      <div style={{ position: "absolute", top: 340, left: 64, right: slide.imageUrl ? 1280 - 64 - CONTENT_TEXT_MAX * DOM_SCALE : 100 }}>
        {slide.bullets.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 26 }}>
            <span style={{ color: C.gold, fontSize: 24, lineHeight: 1.4 }}>•</span>
            <span style={{ color: C.ink, fontSize: 24, lineHeight: 1.4 }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shared navy+gold top rules + slide number + section eyebrow. */
function Chrome({ C, title, num }: { C: DeckPalette; title: string; num: string }) {
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: C.navy }} />
      <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 3, background: C.gold }} />
      <div style={{ position: "absolute", top: 56, left: 64, color: C.gold, fontSize: 18, fontWeight: 700 }}>{num}</div>
      <div style={{ position: "absolute", top: 100, left: 64, color: C.muted, fontSize: 17, letterSpacing: 2 }}>
        {title.toUpperCase()}
      </div>
    </>
  );
}

/**
 * Scales the fixed-size SlideCanvas to fill its wrapper's width (wrapper
 * keeps a 16:9 aspect box). Used for both the stage and filmstrip thumbs.
 */
export function ScaledSlide(props: SlidePreviewProps & { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / DESIGN_W));
    ro.observe(el);
    setScale(el.clientWidth / DESIGN_W);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={props.className} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: DESIGN_W, height: DESIGN_H }}>
        <SlideCanvas {...props} />
      </div>
    </div>
  );
}
