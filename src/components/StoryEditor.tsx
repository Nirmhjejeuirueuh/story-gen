/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Book, BookPage } from "../types.js";
import { Edit3, Image as ImageIcon, RefreshCw, Layers, ArrowUp, ArrowDown, Sparkles, BookOpen, Check } from "lucide-react";

interface StoryEditorProps {
  book: Book;
  onUpdateBook: (updates: Partial<Book>) => void;
  onRegeneratePage: (pageNumber: number) => void;
  isRegeneratingPage?: number | null;
}

export default function StoryEditor({
  book,
  onUpdateBook,
  onRegeneratePage,
  isRegeneratingPage = null,
}: StoryEditorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(book.title);
  const [tempCover, setTempCover] = useState(book.coverTitle);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  const handleSaveBookDetails = () => {
    onUpdateBook({
      title: tempTitle,
      coverTitle: tempCover,
    });
    setEditingTitle(false);
  };

  const handleUpdatePageText = (pageNumber: number, text: string) => {
    const updatedPages = book.pages.map((p) => {
      if (p.pageNumber === pageNumber) {
        return { ...p, storyText: text };
      }
      return p;
    });
    onUpdateBook({ pages: updatedPages });
  };

  const handleUpdatePagePrompt = (pageNumber: number, prompt: string) => {
    const updatedPages = book.pages.map((p) => {
      if (p.pageNumber === pageNumber) {
        return { ...p, illustrationPrompt: prompt };
      }
      return p;
    });
    onUpdateBook({ pages: updatedPages });
  };

  const movePage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === book.pages.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reorderedPages = [...book.pages];

    // Swap pages
    const temp = reorderedPages[index];
    reorderedPages[index] = reorderedPages[targetIndex];
    reorderedPages[targetIndex] = temp;

    // Fix pageNumbers
    const finalPages = reorderedPages.map((p, i) => ({
      ...p,
      pageNumber: i + 1,
    }));

    onUpdateBook({ pages: finalPages });
    setActivePageIndex(targetIndex);
  };

  const activePage = book.pages[activePageIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="story-editor">
      {/* Sidebar: Navigation List of Pages */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 max-h-[600px] overflow-y-auto">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-emerald-600" /> Page Navigator
          </h4>
          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {book.pages.length} Pages
          </span>
        </div>

        {/* Title Editing */}
        {editingTitle ? (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Book Main Title</label>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="w-full text-sm p-1.5 border border-slate-300 rounded bg-white font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Cover Subtitle</label>
              <input
                type="text"
                value={tempCover}
                onChange={(e) => setTempCover(e.target.value)}
                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white text-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveBookDetails}
                className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1"
              >
                <Check className="h-3 w-3" /> Save Details
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                className="py-1 px-3 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Personalized Book</p>
              <h5 className="font-bold text-slate-800 text-sm truncate max-w-[180px]">{book.title}</h5>
            </div>
            <button
              onClick={() => {
                setTempTitle(book.title);
                setTempCover(book.coverTitle);
                setEditingTitle(true);
              }}
              className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition"
              title="Edit Book Details"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* List of Pages */}
        <div className="space-y-2">
          {book.pages.map((p, index) => {
            const isActive = index === activePageIndex;
            return (
              <div
                key={p.id}
                onClick={() => setActivePageIndex(index)}
                className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-center justify-between ${
                  isActive
                    ? "bg-slate-900 border-slate-900 text-white shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                    isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {p.pageNumber}
                  </span>
                  <p className="text-xs font-medium truncate pr-2">
                    {p.storyText || "(Drafting Story...)"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(index, "up");
                    }}
                    disabled={index === 0}
                    className={`p-1 rounded ${isActive ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"} disabled:opacity-30`}
                    title="Move Page Up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(index, "down");
                    }}
                    disabled={index === book.pages.length - 1}
                    className={`p-1 rounded ${isActive ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"} disabled:opacity-30`}
                    title="Move Page Down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Panel: Active Page Detail Customizer */}
      <div className="lg:col-span-8 space-y-6">
        {activePage ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Active Page Header Banner */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <h4 className="font-bold text-slate-800 text-base">Editing Page {activePage.pageNumber}</h4>
              </div>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                activePage.imageStatus === "Completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : activePage.imageStatus === "Generating"
                  ? "bg-amber-100 text-amber-800 animate-pulse"
                  : activePage.imageStatus === "Failed"
                  ? "bg-red-100 text-red-800"
                  : "bg-slate-100 text-slate-600"
              }`}>
                Illustration: {activePage.imageStatus}
              </span>
            </div>

            {/* Split Grid: Left Text Edit, Right Image Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Text Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Page Story Text
                  </label>
                  <textarea
                    rows={4}
                    value={activePage.storyText}
                    onChange={(e) => handleUpdatePageText(activePage.pageNumber, e.target.value)}
                    className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                    placeholder="Enter the storytelling text..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-slate-500" /> Page Illustration Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={activePage.illustrationPrompt}
                    onChange={(e) => handleUpdatePagePrompt(activePage.pageNumber, e.target.value)}
                    className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                    placeholder="Describe what our AI should draw for this page..."
                  />
                </div>
              </div>

              {/* Image Preview / Generation */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="aspect-square bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center">
                  {activePage.imageUrl ? (
                    <img
                      src={activePage.imageUrl}
                      alt={`Page ${activePage.pageNumber}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <ImageIcon className="h-10 w-10 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">Illustration not drawn yet</p>
                    </div>
                  )}

                  {/* Loading overlay */}
                  {activePage.imageStatus === "Generating" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <RefreshCw className="animate-spin h-8 w-8 text-emerald-400" />
                      <span className="text-xs font-bold mt-2.5">AI is drawing illustration...</span>
                    </div>
                  )}
                </div>

                {/* Draw Buttons */}
                <button
                  type="button"
                  onClick={() => onRegeneratePage(activePage.pageNumber)}
                  disabled={activePage.imageStatus === "Generating" || isRegeneratingPage === activePage.pageNumber}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${(activePage.imageStatus === "Generating" || isRegeneratingPage === activePage.pageNumber) ? "animate-spin" : ""}`} />
                  {activePage.imageUrl ? "Regenerate Illustration" : "Draw Illustration"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm font-semibold">
            Please wait... book is being drafted.
          </div>
        )}
      </div>
    </div>
  );
}
