/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Book } from "../types.js";
import { BookOpen, Grid, ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon } from "lucide-react";

interface BookPreviewProps {
  book: Book;
}

export default function BookPreview({ book }: BookPreviewProps) {
  const [viewMode, setViewMode] = useState<"flip" | "grid">("flip");
  const [activeSpreadIndex, setActiveSpreadIndex] = useState(0); // 0 = Cover, 1 = Pages 1 & 2, 2 = Pages 3 & 4...

  const totalSpreads = 1 + Math.ceil(book.pages.length / 2); // Cover + internal spreads

  const nextSpread = () => {
    if (activeSpreadIndex < totalSpreads - 1) {
      setActiveSpreadIndex(activeSpreadIndex + 1);
    }
  };

  const prevSpread = () => {
    if (activeSpreadIndex > 0) {
      setActiveSpreadIndex(activeSpreadIndex - 1);
    }
  };

  return (
    <div className="space-y-6" id="book-preview">
      {/* Header controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Interactive Storybook Preview</h4>
          <p className="text-[11px] text-slate-400 font-medium">Behold your compiled children's masterpiece.</p>
        </div>
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

      {/* --- FLIP BOOK LAYOUT --- */}
      {viewMode === "flip" && (
        <div className="flex flex-col items-center space-y-6" id="flip-book-container">
          <div className="relative w-full max-w-4xl aspect-[16/10] md:aspect-[16/9] flex items-center justify-center">
            {/* Left/Right Buttons */}
            <button
              onClick={prevSpread}
              disabled={activeSpreadIndex === 0}
              className="absolute left-1 md:-left-4 z-10 p-3 bg-white/95 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full shadow-lg transition-all hover:scale-105 disabled:opacity-20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Book Body */}
            <div className="w-full h-full bg-slate-200/50 p-4 md:p-6 rounded-3xl border border-slate-300 shadow-xl flex items-center justify-center">
              {activeSpreadIndex === 0 ? (
                /* --- FRONT COVER --- */
                <div className="w-1/2 aspect-square max-w-md bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-r-2xl border-l-8 border-emerald-800 shadow-2xl flex flex-col justify-between p-6 md:p-8 select-none transition-transform duration-300 hover:scale-[1.01]">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full letter-spacing">
                      Custom Storybook
                    </span>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight leading-snug mt-2">{book.title}</h2>
                    <p className="text-xs md:text-sm text-teal-100 italic mt-1">{book.coverTitle}</p>
                  </div>
                  <div className="my-auto flex items-center justify-center h-32 text-6xl md:text-7xl">
                    📖
                  </div>
                  <div className="text-center pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-bold text-teal-200">
                    <span>DESIGN: {book.style.toUpperCase()}</span>
                    <span>STARING: {book.childName}</span>
                  </div>
                </div>
              ) : (
                /* --- DOUBLE PAGE SPREAD --- */
                <div className="w-full h-full flex bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                  {/* Left Page (Image) */}
                  <div className="w-1/2 h-full bg-slate-50 border-r border-slate-100 flex flex-col relative select-none">
                    {(() => {
                      const pageNum = (activeSpreadIndex - 1) * 2 + 1;
                      const page = book.pages.find((p) => p.pageNumber === pageNum);
                      if (!page) return <div className="m-auto text-xs text-slate-400">End of Book</div>;
                      return (
                        <>
                          <div className="flex-1 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                            {page.imageUrl ? (
                              <img
                                src={page.imageUrl}
                                alt={`Page ${pageNum}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-4">
                                <ImageIcon className="h-8 w-8 text-slate-300 mx-auto" />
                                <span className="text-[10px] text-slate-400 mt-1 block">Illustration Drawing...</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 bg-white text-center border-t border-slate-100 text-xs font-bold text-slate-400">
                            Page {pageNum}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Right Page (Story Text) */}
                  <div className="w-1/2 h-full bg-white flex flex-col justify-between select-none">
                    {(() => {
                      const pageNum = (activeSpreadIndex - 1) * 2 + 2;
                      const page = book.pages.find((p) => p.pageNumber === pageNum);
                      if (!page) {
                        return (
                          <div className="m-auto text-center p-8 space-y-2">
                            <Sparkles className="h-10 w-10 text-emerald-500 mx-auto animate-pulse" />
                            <h5 className="font-bold text-slate-700 text-sm">The End</h5>
                            <p className="text-xs text-slate-400">We hope you enjoyed your custom storybook!</p>
                          </div>
                        );
                      }
                      return (
                        <>
                          <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
                            <p className="text-slate-700 font-medium text-sm md:text-base leading-relaxed text-center">
                              {page.storyText}
                            </p>
                          </div>
                          <div className="p-3 bg-white text-center border-t border-slate-100 text-xs font-bold text-slate-400">
                            Page {pageNum}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={nextSpread}
              disabled={activeSpreadIndex === totalSpreads - 1}
              className="absolute right-1 md:-right-4 z-10 p-3 bg-white/95 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full shadow-lg transition-all hover:scale-105 disabled:opacity-20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Indicator Dot Navigation */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSpreads }).map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSpreadIndex(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeSpreadIndex === i ? "w-6 bg-emerald-600" : "w-2.5 bg-slate-300 hover:bg-slate-400"
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
          {/* Front Cover Card */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between aspect-square select-none">
            <div>
              <span className="text-[9px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">Book Cover</span>
              <h4 className="font-extrabold text-lg mt-2">{book.title}</h4>
              <p className="text-[11px] text-teal-100 italic mt-0.5">{book.coverTitle}</p>
            </div>
            <div className="text-4xl text-center">📖</div>
            <span className="text-[9px] font-bold text-teal-200 block border-t border-white/10 pt-2">
              STARRING: {book.childName}
            </span>
          </div>

          {/* Book Pages */}
          {book.pages.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between aspect-square"
            >
              <div className="flex-1 overflow-hidden relative bg-slate-50 flex items-center justify-center">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={`Page ${p.pageNumber}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
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
                <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed text-center">
                  {p.storyText}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
