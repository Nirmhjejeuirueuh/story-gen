/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Book, BookPage } from "../types.js";
import { personalizeStoryText } from "../utils/personalize.js";
import { BookOpen, Grid, ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon, Wand2 } from "lucide-react";

interface BookPreviewProps {
  book: Book;
  /** Triggers on-demand front-cover generation (hero-conditioned, title baked in). */
  onGenerateCover?: () => void;
}

const SERIF = "'Iowan Old Style', 'Palatino Linotype', 'Palatino', Georgia, 'Times New Roman', serif";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Golden leaf-sprig ornament (wheat/laurel motif) tucked into each page corner. */
function CornerFlourish({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const transform = { tl: "none", tr: "scaleX(-1)", bl: "scaleY(-1)", br: "scale(-1,-1)" }[position];
  const pos: React.CSSProperties = {
    tl: { top: "5%", left: "6%" },
    tr: { top: "5%", right: "6%" },
    bl: { bottom: "5%", left: "6%" },
    br: { bottom: "5%", right: "6%" },
  }[position];
  const leaf = (y: number, s: number) => (
    <g key={y} transform={`translate(15 ${y})`}>
      <path d={`M0 0 q ${9 * s} ${-3 * s} ${12 * s} ${-11 * s} q ${-9 * s} ${1 * s} ${-12 * s} ${11 * s}`} fill="#c9a24e" opacity="0.9" />
      <path d={`M0 0 q ${-9 * s} ${-3 * s} ${-12 * s} ${-11 * s} q ${9 * s} ${1 * s} ${12 * s} ${11 * s}`} fill="#bd9440" opacity="0.85" />
    </g>
  );
  return (
    <svg width="30" height="82" viewBox="0 0 30 82" style={{ position: "absolute", transform, opacity: 0.8 }} aria-hidden>
      <path d="M15 2 C 15 26 15 50 11 80" fill="none" stroke="#b28a3c" strokeWidth="1.5" strokeLinecap="round" />
      {[16, 30, 44, 58].map((y, i) => leaf(y, 1 - i * 0.16))}
      <circle cx="15" cy="4" r="2" fill="#c9a24e" />
    </svg>
  );
}

export default function BookPreview({ book, onGenerateCover }: BookPreviewProps) {
  const [viewMode, setViewMode] = useState<"flip" | "grid">("flip");

  // ---- Build the ordered list of single-page "faces": [Cover, ...story pages, The End] ----
  const faces = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    nodes.push(<CoverFace book={book} onGenerateCover={onGenerateCover} />);
    book.pages
      .slice()
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .forEach((p) => nodes.push(<PageFace page={p} />));
    // The End must land on the BACK of the final leaf so the last view shows it as a lone page
    // (mirroring the lone cover at the start). That needs an odd number of faces before it; when
    // it's even, slip a blank leaf-side in first. This also keeps the total even (clean leaves).
    if (nodes.length % 2 === 0) nodes.push(<BlankFace />);
    nodes.push(<EndFace childName={book.childName} />);
    return nodes;
  }, [book, onGenerateCover]);

  const leafCount = faces.length / 2;

  // current = number of leaves already turned. Visible spread at `current`:
  //   left page  = back  of leaf (current-1) = faces[2*current-1]
  //   right page = front of leaf  current    = faces[2*current]
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    setCurrent(0);
  }, [book.id]);

  // The leaf mid-flip needs to sit on top of both spreads for the whole rotation, so track it
  // and give it a high z-index until the transition settles.
  const [animating, setAnimating] = useState<number | null>(null);
  const flip = useCallback(
    (dir: 1 | -1) => {
      if (dir === 1 && current < leafCount) {
        setAnimating(current);
        setCurrent(current + 1);
      } else if (dir === -1 && current > 0) {
        setAnimating(current - 1);
        setCurrent(current - 1);
      } else {
        return;
      }
      window.setTimeout(() => setAnimating(null), 720);
    },
    [current, leafCount]
  );
  const goNext = useCallback(() => flip(1), [flip]);
  const goPrev = useCallback(() => flip(-1), [flip]);
  const flipRef = useRef(flip);
  flipRef.current = flip;

  // ---- Drag-to-turn handling ----
  const bookRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; leaf: number; dir: 1 | -1; width: number; moved: boolean } | null>(null);
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const [dragLeaf, setDragLeaf] = useState<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (viewMode !== "flip") return;
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;
    const halfWidth = rect.width / 2;
    const x = e.clientX - rect.left;
    const rightHalf = x > halfWidth;
    let leaf: number, dir: 1 | -1;
    if (rightHalf && current < leafCount) {
      dir = 1;
      leaf = current;
    } else if (!rightHalf && current > 0) {
      dir = -1;
      leaf = current - 1;
    } else {
      return;
    }
    drag.current = { startX: e.clientX, leaf, dir, width: halfWidth, moved: false };
    setDragLeaf(leaf);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) d.moved = true;
    const progress = d.dir === 1 ? clamp(-dx / d.width, 0, 1) : clamp(dx / d.width, 0, 1);
    setDragAngle(d.dir === 1 ? -180 * progress : -180 + 180 * progress);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragAngle(null);
    setDragLeaf(null);
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      d.dir === 1 ? goNext() : goPrev();
      return;
    }
    const progress = d.dir === 1 ? clamp(-dx / d.width, 0, 1) : clamp(dx / d.width, 0, 1);
    if (progress > 0.5) (d.dir === 1 ? goNext() : goPrev());
  };

  // Keyboard navigation.
  useEffect(() => {
    if (viewMode !== "flip") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") flipRef.current(1);
      if (e.key === "ArrowLeft") flipRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode]);

  return (
    <div className="space-y-6" id="book-preview">
      {/* Header controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Interactive Storybook Preview</h4>
          <p className="text-[11px] text-slate-400 font-medium">Click or drag a page to turn it.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("flip")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === "flip" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Book View
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === "grid" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid className="h-3.5 w-3.5" /> Thumbnail Grid
            </button>
          </div>
        </div>
      </div>

      {/* --- FLIP BOOK --- */}
      {viewMode === "flip" && (
        <div className="flex flex-col items-center space-y-5">
          <div className="relative w-full max-w-5xl flex items-center justify-center">
            <button
              onClick={goPrev}
              disabled={current === 0}
              className="absolute left-1 md:-left-5 z-30 p-3 bg-white/95 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full shadow-lg transition-all hover:scale-105 disabled:opacity-20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* The book: a two-page spread with a 3D-flipping right leaf. At the two extremes only
                one page exists (cover at the start, The End at the finish), so we hide the empty
                facing half and slide the book a half-page to center the lone page — it reads as a
                closed cover that opens into a spread, then closes onto the final page. */}
            {(() => {
              const atCover = current === 0; // only the right-half cover exists
              const atEnd = current === leafCount; // only the left-half final page exists
              const bookShift = atCover ? "-25%" : atEnd ? "25%" : "0%";
              return (
            <div
              ref={bookRef}
              className="relative w-full select-none touch-none cursor-pointer"
              // 2:1 spread == two perfectly square (1:1) pages side by side — the fixed print-safe
              // canvas ratio. Never change this per-book; only text position moves within it.
              style={{
                aspectRatio: "2 / 1",
                perspective: "2600px",
                transform: `translateX(${bookShift})`,
                transition: "transform 0.7s cubic-bezier(0.3, 0.1, 0.2, 1)",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* Base under-pages: one panel per side, rendered only where a page currently sits, so
                  a lone cover/end has no empty facing sheet. Fully rounded when alone; outer-rounded
                  as a pair for the open-book spread. */}
              {!atCover && (
                <div
                  className={`absolute inset-y-0 left-0 w-1/2 shadow-2xl ${atEnd ? "rounded-lg" : "rounded-l-lg"}`}
                  style={parchmentEdge("left")}
                />
              )}
              {!atEnd && (
                <div
                  className={`absolute inset-y-0 right-0 w-1/2 shadow-2xl ${atCover ? "rounded-lg" : "rounded-r-lg"}`}
                  style={parchmentEdge("right")}
                />
              )}
              {/* Center spine shadow — only when both pages are present. */}
              {!atCover && !atEnd && (
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 z-20 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(80,55,20,0.18) 48%, rgba(80,55,20,0.22) 50%, rgba(80,55,20,0.18) 52%, rgba(0,0,0,0) 100%)",
                  }}
                />
              )}

              {/* Leaves (right half, flipping around the spine). */}
              {Array.from({ length: leafCount }).map((_, i) => {
                const turned = i < current;
                const base = turned ? -180 : 0;
                const angle = dragLeaf === i && dragAngle !== null ? dragAngle : base;
                const isActive = dragLeaf === i || animating === i;
                const zIndex = isActive ? 60 : turned ? i : leafCount - i;
                const shadow = clamp(Math.abs(angle) > 90 ? (180 - Math.abs(angle)) / 90 : Math.abs(angle) / 90, 0, 1);
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full"
                    style={{
                      left: "50%",
                      width: "50%",
                      transformStyle: "preserve-3d",
                      transformOrigin: "left center",
                      transform: `rotateY(${angle}deg)`,
                      transition: dragLeaf === i ? "none" : "transform 0.7s cubic-bezier(0.3, 0.1, 0.2, 1)",
                      zIndex,
                    }}
                  >
                    {/* FRONT face (recto) */}
                    <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                      {faces[2 * i]}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `linear-gradient(90deg, rgba(60,40,15,${0.28 * shadow}) 0%, rgba(0,0,0,0) 30%)` }}
                      />
                    </div>
                    {/* BACK face (verso), pre-rotated so it reads correctly once flipped */}
                    <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      {faces[2 * i + 1]}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `linear-gradient(270deg, rgba(60,40,15,${0.28 * shadow}) 0%, rgba(0,0,0,0) 30%)` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
              );
            })()}

            <button
              onClick={goNext}
              disabled={current === leafCount}
              className="absolute right-1 md:-right-5 z-30 p-3 bg-white/95 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full shadow-lg transition-all hover:scale-105 disabled:opacity-20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Dot navigation (one dot per spread state) */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {Array.from({ length: leafCount + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  current === i ? "w-6 bg-amber-600" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                }`}
                title={i === 0 ? "Cover" : `Spread ${i}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* --- THUMBNAIL GRID VIEW --- */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" id="thumbnail-grid">
          {book.coverImageStatus === "Completed" && book.coverImageUrl ? (
            <div className="relative rounded-2xl overflow-hidden shadow-md aspect-square select-none">
              <img src={book.coverImageUrl} alt="Book cover" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[9px] font-bold uppercase bg-black/45 text-white px-2 py-0.5 rounded-full">Book Cover</span>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between aspect-square select-none">
              <div>
                <span className="text-[9px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">Book Cover</span>
                <h4 className="font-extrabold text-lg mt-2" style={{ fontFamily: SERIF }}>
                  {book.title}
                </h4>
                <p className="text-[11px] text-amber-100 italic mt-0.5">{book.coverTitle}</p>
              </div>
              <div className="text-4xl text-center">{book.coverImageStatus === "Queued" || book.coverImageStatus === "Generating" ? "🎨" : "📖"}</div>
              <span className="text-[9px] font-bold text-amber-200 block border-t border-white/10 pt-2">
                STARRING: {book.childName}
              </span>
            </div>
          )}

          {book.pages.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between aspect-square">
              <div className="flex-1 overflow-hidden relative bg-slate-50 flex items-center justify-center">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="h-6 w-6 text-slate-300 mx-auto animate-pulse" />
                    <span className="text-[10px] text-slate-400 mt-1 block">Illustration Drafting...</span>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 bg-slate-900/75 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Page {p.pageNumber}
                </span>
              </div>
              {p.storyText && (
                <div className="p-3 bg-slate-50/50 border-t border-slate-100">
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed text-center" style={{ fontFamily: SERIF }}>
                    {personalizeStoryText(p.storyText, book.childName)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page faces
// ---------------------------------------------------------------------------

const PARCHMENT: React.CSSProperties = {
  backgroundColor: "#f6efdd",
  backgroundImage:
    "radial-gradient(circle at 22% 18%, rgba(255,252,242,0.9) 0%, rgba(246,239,221,0) 55%)," +
    "radial-gradient(circle at 82% 88%, rgba(226,214,182,0.55) 0%, rgba(246,239,221,0) 45%)",
};

function parchmentEdge(side: "left" | "right"): React.CSSProperties {
  return {
    ...PARCHMENT,
    boxShadow: side === "left" ? "inset -10px 0 18px -12px rgba(90,60,20,0.35)" : "inset 10px 0 18px -12px rgba(90,60,20,0.35)",
  };
}

/** A parchment page container with gold corner flourishes and a subtle inner border. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full overflow-hidden" style={PARCHMENT}>
      <CornerFlourish position="tl" />
      <CornerFlourish position="tr" />
      <CornerFlourish position="bl" />
      <CornerFlourish position="br" />
      <div className="relative h-full flex flex-col px-[8%] py-[6%]">{children}</div>
    </div>
  );
}

// Feather mask that melts the rectangular illustration softly into the parchment (no hard frame),
// mirroring the PuddlePages look. Applied to the <img> element.
const FEATHER = "radial-gradient(118% 122% at 50% 50%, #000 68%, rgba(0,0,0,0) 100%)";

/**
 * A single storybook page: the story text is baked directly into the generated image (see
 * PromptEngine.buildTextPageImagePrompt), so this is just a full-bleed illustration — no separate
 * HTML text overlay.
 */
function PageFace({ page }: { page: BookPage }) {
  const imageBlock =
    page.imageStatus === "Completed" && page.imageUrl ? (
      // Background-image fills the whole page (no <img> intrinsic-size quirks), scaled to show
      // the entire illustration (no crop), then feathered so its edges melt into the page.
      <div
        className="flex-1 min-h-0"
        style={{
          width: "110%",
          marginLeft: "-5%",
          backgroundImage: `url("${page.imageUrl}")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          WebkitMaskImage: FEATHER,
          maskImage: FEATHER,
          filter: "drop-shadow(0 8px 14px rgba(80,50,15,0.16))",
        }}
      />
    ) : (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1.5 text-center">
        <ImageIcon className={`h-8 w-8 text-amber-700/40 ${page.imageStatus === "Failed" ? "" : "animate-pulse"}`} />
        <span className="text-[11px] text-amber-800/60 font-medium">
          {page.imageStatus === "Failed" ? "Illustration failed — regenerate" : "Illustration drawing…"}
        </span>
      </div>
    );

  return (
    <Page>
      {imageBlock}
      <div className="absolute bottom-[2.5%] left-0 right-0 text-center pointer-events-none">
        <span className="text-[11px] font-semibold text-amber-900/50" style={{ fontFamily: SERIF, textShadow: "0 1px 3px rgba(246,239,221,0.95)" }}>
          &middot; {page.pageNumber} &middot;
        </span>
      </div>
    </Page>
  );
}

function CoverFace({ book, onGenerateCover }: { book: Book; onGenerateCover?: () => void }) {
  const generating = book.coverImageStatus === "Queued" || book.coverImageStatus === "Generating";

  // Once the AI cover (hero-conditioned, title baked in) is ready, show it full-bleed like a page.
  // Until then — or for older books created before covers existed — fall back to the CSS cover,
  // which carries the on-demand "Generate Cover" button.
  if (book.coverImageStatus === "Completed" && book.coverImageUrl) {
    return (
      <div className="relative w-full h-full overflow-hidden" style={PARCHMENT}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("${book.coverImageUrl}")`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
        {onGenerateCover && (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerateCover(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] font-bold text-white bg-black/45 hover:bg-black/65 px-2.5 py-1 rounded-full backdrop-blur-sm transition"
            title="Regenerate this cover"
          >
            <Wand2 className="h-3 w-3" /> Regenerate
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col justify-between p-[9%] text-white" style={{ background: "linear-gradient(150deg, #8a5a1f 0%, #6d4417 45%, #3a2610 100%)" }}>
      <div className="absolute inset-3 border-2 border-amber-200/40 rounded pointer-events-none" />
      {generating && (
        <span className="absolute top-3 right-3 text-[9px] font-semibold text-amber-100/80 bg-black/25 px-2 py-0.5 rounded-full animate-pulse">
          Designing cover…
        </span>
      )}
      {book.coverImageStatus === "Failed" && (
        <span className="absolute top-3 right-3 text-[9px] font-semibold text-red-100 bg-red-900/50 px-2 py-0.5 rounded-full">
          Cover failed
        </span>
      )}
      <div className="text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-white/15 px-3 py-1 rounded-full">A Personalized Storybook</span>
      </div>
      <div className="text-center px-2">
        <h2 className="font-black leading-tight" style={{ fontFamily: SERIF, fontSize: "clamp(18px, 3.4vw, 34px)" }}>
          {book.title}
        </h2>
        {book.coverTitle && (
          <p className="italic text-amber-100/90 mt-2" style={{ fontFamily: SERIF, fontSize: "clamp(11px, 1.6vw, 16px)" }}>
            {book.coverTitle}
          </p>
        )}
        <div className="text-4xl md:text-5xl mt-4">{generating ? "🎨" : "📖"}</div>
        {onGenerateCover && (
          <button
            onClick={(e) => { e.stopPropagation(); if (!generating) onGenerateCover(); }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={generating}
            className="mt-5 inline-flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-100 disabled:opacity-70 disabled:cursor-default px-4 py-2 rounded-full shadow-lg transition"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {generating ? "Designing cover…" : book.coverImageStatus === "Failed" ? "Try cover again" : "Generate Cover"}
          </button>
        )}
      </div>
      <div className="text-center border-t border-white/15 pt-3">
        <p className="text-[11px] tracking-widest uppercase text-amber-100/80" style={{ fontFamily: SERIF }}>
          Starring {book.childName}
        </p>
      </div>
    </div>
  );
}

function EndFace({ childName }: { childName: string }) {
  return (
    <Page>
      <div className="m-auto text-center space-y-3">
        <Sparkles className="h-10 w-10 text-amber-600 mx-auto" />
        <h3 className="text-[#5b4321]" style={{ fontFamily: SERIF, fontSize: "clamp(18px, 2.6vw, 26px)", fontWeight: 700 }}>
          The End
        </h3>
        <p className="text-[#6b5a41] max-w-[80%] mx-auto" style={{ fontFamily: SERIF, fontSize: "clamp(11px, 1.4vw, 15px)" }}>
          We hope you enjoyed {childName}'s adventure. Turn back to read it again!
        </p>
      </div>
    </Page>
  );
}

function BlankFace() {
  return <div className="w-full h-full" style={PARCHMENT} />;
}
