/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Book } from "../types.js";
import { RefreshCw, Play, CheckCircle, AlertCircle, Sparkles, Loader2 } from "lucide-react";

interface ImageGenerationStatusProps {
  book: Book;
  onStartGeneration: () => void;
  isGeneratingBatch?: boolean;
}

export default function ImageGenerationStatus({
  book,
  onStartGeneration,
  isGeneratingBatch = false,
}: ImageGenerationStatusProps) {
  const pages = book.pages;
  const completed = pages.filter((p) => p.imageStatus === "Completed").length;
  const generating = pages.filter((p) => p.imageStatus === "Generating").length;
  const queued = pages.filter((p) => p.imageStatus === "Queued").length;
  const failed = pages.filter((p) => p.imageStatus === "Failed").length;

  const total = pages.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="image-generation-status">
      {/* Title / Summary Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />
            Illustration Pipeline
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, render, or regenerate your custom story illustrations.
          </p>
        </div>

        {completed < total && (
          <button
            onClick={onStartGeneration}
            disabled={isGeneratingBatch || generating > 0 || queued > 0}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-sm border border-transparent"
          >
            {generating > 0 || queued > 0 ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 text-emerald-500" /> Rendering pages...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" /> Draw Remaining ({total - completed} left)
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
          <span>Overall Illustration Render Progress</span>
          <span className="text-emerald-600">{progressPercent}% Completed</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="bg-amber-400 h-full animate-pulse"
            style={{ width: `${(generating / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Statistics Tills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-emerald-700">Completed</p>
          <p className="text-xl font-black text-emerald-900 mt-1">{completed}</p>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-amber-700">Drawing</p>
          <p className="text-xl font-black text-amber-900 mt-1">{generating}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-slate-500">In Queue</p>
          <p className="text-xl font-black text-slate-800 mt-1">{queued}</p>
        </div>
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-red-700">Failed</p>
          <p className="text-xl font-black text-red-900 mt-1">{failed}</p>
        </div>
      </div>

      {/* Pages Render Progress Status Cards */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {pages.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="h-7 w-7 bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg flex items-center justify-center shrink-0">
                {p.pageNumber}
              </span>
              <p className="text-slate-700 font-medium line-clamp-1 max-w-[200px] md:max-w-md">
                {p.storyText}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {p.imageStatus === "Completed" && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                  <CheckCircle className="h-3.5 w-3.5" /> Ready
                </span>
              )}
              {p.imageStatus === "Generating" && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 animate-pulse">
                  <RefreshCw className="animate-spin h-3.5 w-3.5" /> Drawing...
                </span>
              )}
              {p.imageStatus === "Queued" && (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                  In Queue
                </span>
              )}
              {p.imageStatus === "Failed" && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                  <AlertCircle className="h-3.5 w-3.5" /> Error
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
