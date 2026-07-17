/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Book, BookPage } from "../types.js";
import { personalizeStoryText } from "../utils/personalize.js";
import { BookOpen, Grid, ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon, Languages, Pencil, GripHorizontal, Save, RotateCcw, Loader2 } from "lucide-react";

interface BookPreviewProps {
  book: Book;
}

// Languages the reader can switch between. Only English is populated today; others gracefully
// fall back to English until on-demand translations exist.
const SUPPORTED_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

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

/** Splits a text blob into paragraphs for HTML rendering. */
function toParagraphs(text: string): string[] {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()].filter(Boolean);
}

/** Default text position when a page has no manual override: alternates by spread for rhythm. */
function autoZone(pageNumber: number): "top" | "bottom" {
  return Math.floor((pageNumber - 1) / 2) % 2 === 0 ? "top" : "bottom";
}

export default function BookPreview({ book }: BookPreviewProps) {
  const [viewMode, setViewMode] = useState<"flip" | "grid">("flip");
  const [lang, setLang] = useState("en");

  // ---- Manual layout editor (drag text to top/bottom, save, persists per page) ----
  const [editMode, setEditMode] = useState(false);
  // Local overrides applied on top of page.textZone until the book prop refetches from the
  // server; "auto" is an explicit sentinel (distinct from unset) so Reset shows the automatic
  // position immediately even if page.textZone from props is still the stale saved value.
  const [pendingZones, setPendingZones] = useState<Record<number, "top" | "bottom" | "auto">>({});
  const [savingPage, setSavingPage] = useState<number | null>(null);
  const [pageMsg, setPageMsg] = useState<Record<number, string>>({});

  const resolveZone = useCallback(
    (page: BookPage): "top" | "bottom" => {
      const pending = pendingZones[page.pageNumber];
      if (pending === "top" || pending === "bottom") return pending;
      if (pending === "auto") return autoZone(page.pageNumber);
      return page.textZone ?? autoZone(page.pageNumber);
    },
    [pendingZones]
  );

  // Drag handle nudges the local zone immediately (live preview); Save persists it, Reset clears
  // the override back to automatic. The reserved-zone-only, fixed-size design keeps the print
  // canvas's 1:1 ratio untouched — only which half the text sits in ever changes.
  const nudgeZone = useCallback((pageNumber: number, zone: "top" | "bottom") => {
    setPendingZones((z) => ({ ...z, [pageNumber]: zone }));
    setPageMsg((m) => ({ ...m, [pageNumber]: "" }));
  }, []);

  const saveLayout = useCallback(
    async (pageNumber: number, zone: "top" | "bottom" | null) => {
      setSavingPage(pageNumber);
      setPageMsg((m) => ({ ...m, [pageNumber]: "" }));
      try {
        const res = await fetch(`/api/books/${book.id}/pages/${pageNumber}/layout`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textZone: zone }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPendingZones((z) => ({ ...z, [pageNumber]: zone ?? "auto" }));
        setPageMsg((m) => ({ ...m, [pageNumber]: zone ? "Layout saved" : "Reset to automatic" }));
      } catch {
        setPageMsg((m) => ({ ...m, [pageNumber]: "Couldn't save — try again" }));
      } finally {
        setSavingPage(null);
      }
    },
    [book.id]
  );

  // Resolve a page's text in the active language, falling back to English/storyText, then personalize.
  const pageText = useCallback(
    (page: BookPage): string => {
      const raw = page.texts?.[lang] ?? page.texts?.en ?? page.storyText;
      return personalizeStoryText(raw, book.childName);
    },
    [lang, book.childName]
  );
  const isTranslated = (page: BookPage): boolean => lang === "en" || !!page.texts?.[lang];

  // ---- Build the ordered list of single-page "faces": [Cover, ...story pages, The End] ----
  const faces = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    nodes.push(<CoverFace book={book} />);
    book.pages
      .slice()
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .forEach((p) =>
        nodes.push(
          <PageFace
            page={p}
            text={pageText(p)}
            translated={isTranslated(p)}
            zone={resolveZone(p)}
            editMode={editMode}
            saving={savingPage === p.pageNumber}
            message={pageMsg[p.pageNumber]}
            onNudgeZone={(z) => nudgeZone(p.pageNumber, z)}
            onSave={() => saveLayout(p.pageNumber, resolveZone(p))}
            onReset={() => saveLayout(p.pageNumber, null)}
          />
        )
      );
    // The End must land on the BACK of the final leaf so the last view shows it as a lone page
    // (mirroring the lone cover at the start). That needs an odd number of faces before it; when
    // it's even, slip a blank leaf-side in first. This also keeps the total even (clean leaves).
    if (nodes.length % 2 === 0) nodes.push(<BlankFace />);
    nodes.push(<EndFace childName={book.childName} />);
    return nodes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, pageText, lang, resolveZone, editMode, savingPage, pageMsg, nudgeZone, saveLayout]);

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

  // The layout editor only applies to the flip book (Thumbnail Grid doesn't render PageFace),
  // so leaving flip view exits edit mode to avoid a dangling, inert "Editing Layout" state.
  useEffect(() => {
    if (viewMode !== "flip") setEditMode(false);
  }, [viewMode]);

  return (
    <div className="space-y-6" id="book-preview">
      {/* Header controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Interactive Storybook Preview</h4>
          <p className="text-[11px] text-slate-400 font-medium">
            {editMode ? "Drag the ⁝⁝ handle to move text top/bottom, then Save." : "Click or drag a page to turn it."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Languages className="h-3.5 w-3.5 text-emerald-600" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              title="Reading language"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {viewMode === "flip" && (
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                editMode
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" /> {editMode ? "Editing Layout" : "Customize Layout"}
            </button>
          )}

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
          <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between aspect-square select-none">
            <div>
              <span className="text-[9px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">Book Cover</span>
              <h4 className="font-extrabold text-lg mt-2" style={{ fontFamily: SERIF }}>
                {book.title}
              </h4>
              <p className="text-[11px] text-amber-100 italic mt-0.5">{book.coverTitle}</p>
            </div>
            <div className="text-4xl text-center">📖</div>
            <span className="text-[9px] font-bold text-amber-200 block border-t border-white/10 pt-2">
              STARRING: {book.childName}
            </span>
          </div>

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
              <div className="p-3 bg-slate-50/50 border-t border-slate-100">
                <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed text-center" style={{ fontFamily: SERIF }}>
                  {pageText(p)}
                </p>
              </div>
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

interface PageFaceProps {
  page: BookPage;
  text: string;
  translated: boolean;
  /** Resolved text position: manual override (saved or pending) or the automatic alternation. */
  zone: "top" | "bottom";
  editMode: boolean;
  saving: boolean;
  message?: string;
  onNudgeZone: (zone: "top" | "bottom") => void;
  onSave: () => void;
  onReset: () => void;
}

function PageFace({ page, text, translated, zone, editMode, saving, message, onNudgeZone, onSave, onReset }: PageFaceProps) {
  const paragraphs = toParagraphs(text);
  const textOnTop = zone === "top";

  // Drag-to-reposition: grabbing the handle and moving past a threshold flips the zone once per
  // gesture. Deliberately delta-based (not absolute page-coordinate hit testing) — this book's
  // pages sit inside a 3D-transformed flip leaf, where live getBoundingClientRect reads have
  // proven unreliable, so a simple relative-movement threshold is both simpler and more robust.
  const dragState = useRef<{ startY: number; flipped: boolean } | null>(null);
  const FLIP_THRESHOLD = 46;
  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // don't let the book's page-turn handler also see this gesture
    dragState.current = { startY: e.clientY, flipped: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d || d.flipped) return;
    const delta = e.clientY - d.startY;
    if (zone === "top" && delta > FLIP_THRESHOLD) {
      d.flipped = true;
      onNudgeZone("bottom");
    } else if (zone === "bottom" && delta < -FLIP_THRESHOLD) {
      d.flipped = true;
      onNudgeZone("top");
    }
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragState.current = null;
  };

  // Text takes only the height it needs (capped at half the page); the illustration absorbs ALL
  // remaining space so there is never a dead gap, and the art stays large — the PuddlePages feel.
  const textBlock = (
    <div className={`shrink-0 overflow-hidden ${textOnTop ? "mb-[3%]" : "mt-[3%]"}`} style={{ maxHeight: "52%" }}>
      {page.title && (
        <div className="mb-2.5">
          <h3 className="text-center text-[#5b4321] leading-tight" style={{ fontFamily: SERIF, fontSize: "clamp(15px, 2.3vw, 25px)", fontWeight: 700 }}>
            {page.title}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-1.5 text-amber-700/50">
            <span className="h-px w-8 bg-current" />
            <span className="text-[11px] leading-none">&#10087;</span>
            <span className="h-px w-8 bg-current" />
          </div>
        </div>
      )}

      {/* Story text (HTML/CSS — never baked into the illustration) */}
      <div className="text-[#39301f]" style={{ fontFamily: SERIF, fontSize: "clamp(13px, 1.75vw, 19px)", lineHeight: 1.62, textAlign: "justify" }}>
        {paragraphs.map((para, idx) => (
          <p key={idx} className={idx === 0 ? "" : "mt-2"} style={{ textIndent: idx === 0 ? 0 : "1.4em" }}>
            {idx === 0 && para.length > 0 ? (
              <>
                <span className="float-left mr-1.5 text-[#7a531f]" style={{ fontFamily: SERIF, fontSize: "3em", lineHeight: 0.72, fontWeight: 700 }}>
                  {para.charAt(0)}
                </span>
                {para.slice(1)}
              </>
            ) : (
              para
            )}
          </p>
        ))}
        {!translated && <span className="block mt-2 text-[10px] text-amber-700/70 italic clear-both">Showing English — not translated yet</span>}
      </div>
    </div>
  );

  const imageBlock =
    page.imageStatus === "Completed" && page.imageUrl ? (
      // Background-image fills the whole remaining region (no <img> intrinsic-size quirks), scaled
      // to show the entire illustration (no crop), then feathered so its edges melt into the page.
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

  // The handle sits on the boundary between the text and image blocks — dragging it toward the
  // opposite half swaps their order. Reserved-zone-only: it can never land on top of the image.
  const dragHandle = editMode && (
    <div
      className="shrink-0 flex justify-center py-1 -my-0.5 cursor-grab active:cursor-grabbing touch-none"
      style={{ zIndex: 5 }}
      onPointerDown={onHandlePointerDown}
      onPointerMove={onHandlePointerMove}
      onPointerUp={onHandlePointerUp}
      onPointerCancel={onHandlePointerUp}
      title="Drag up or down to move the text"
    >
      <div className="flex items-center gap-1 bg-amber-700/90 text-white rounded-full px-2.5 py-1 shadow-md">
        <GripHorizontal className="h-3 w-3" />
        <span className="text-[9px] font-bold uppercase tracking-wide">Drag text</span>
      </div>
    </div>
  );

  return (
    <Page>
      {editMode && (
        <div className="absolute top-[4%] right-[4%] z-10 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={saving}
              className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={saving}
              className="flex items-center gap-1 bg-white/90 hover:bg-white text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-sm border border-slate-200 disabled:opacity-60"
              title="Revert to automatic top/bottom alternation"
            >
              <RotateCcw className="h-3 w-3" /> Auto
            </button>
          </div>
          {message && (
            <span className="text-[10px] font-semibold text-amber-900 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">{message}</span>
          )}
        </div>
      )}
      {textOnTop ? (
        <>
          {textBlock}
          {dragHandle}
          {imageBlock}
        </>
      ) : (
        <>
          {imageBlock}
          {dragHandle}
          {textBlock}
        </>
      )}
      <div className="absolute bottom-[2.5%] left-0 right-0 text-center pointer-events-none">
        <span className="text-[11px] font-semibold text-amber-900/50" style={{ fontFamily: SERIF, textShadow: "0 1px 3px rgba(246,239,221,0.95)" }}>
          &middot; {page.pageNumber} &middot;
        </span>
      </div>
    </Page>
  );
}

function CoverFace({ book }: { book: Book }) {
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col justify-between p-[9%] text-white" style={{ background: "linear-gradient(150deg, #8a5a1f 0%, #6d4417 45%, #3a2610 100%)" }}>
      <div className="absolute inset-3 border-2 border-amber-200/40 rounded pointer-events-none" />
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
        <div className="text-4xl md:text-5xl mt-4">📖</div>
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
