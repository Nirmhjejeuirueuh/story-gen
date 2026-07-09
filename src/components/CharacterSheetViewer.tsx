/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Character, CharacterSheet } from "../types.js";
import { Check, ShieldCheck, RefreshCw, Eye, Sparkles, User, FileText } from "lucide-react";

interface CharacterSheetViewerProps {
  character: Character;
  sheet: CharacterSheet | null;
  onApprove: (approved: boolean) => void;
  onRegenerate: () => void;
  isGenerating?: boolean;
}

export default function CharacterSheetViewer({
  character,
  sheet,
  onApprove,
  onRegenerate,
  isGenerating = false,
}: CharacterSheetViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-emerald-50/20 border border-emerald-100 rounded-2xl" id="character-sheet-loading">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <div className="relative rounded-full h-10 w-10 bg-emerald-600 flex items-center justify-center text-white font-bold">
            <Sparkles className="animate-spin h-5 w-5" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mt-4">Drafting Character Sheet...</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          Our AI is analyzing the uploaded photos to draw a consistent model containing all 11 standardized children's book reference poses. This may take about a minute.
        </p>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-xl" id="character-sheet-not-found">
        <p className="text-slate-500 font-medium">No character sheet draft found for this profile.</p>
        <button
          onClick={onRegenerate}
          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
        >
          <RefreshCw className="h-4 w-4" /> Generate Sheet Draft
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="character-sheet-viewer">
      {/* Header Profile Summary */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md border border-slate-700">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white px-2.5 py-1 rounded-full shadow-sm">
            AI Model Sheet Draft
          </span>
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-emerald-400" />
            <h3 className="text-xl font-bold">{character.name} ({character.age} y/o {character.gender})</h3>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl italic">
            &ldquo;{character.description}&rdquo;
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={onRegenerate}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl font-semibold text-sm transition flex items-center gap-1.5 border border-slate-600"
          >
            <RefreshCw className="h-4 w-4" /> Re-Draft
          </button>
          {sheet.approved ? (
            <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-md">
              <ShieldCheck className="h-4 w-4 text-white" /> Approved Model
            </div>
          ) : (
            <button
              onClick={() => onApprove(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition flex items-center gap-1.5 shadow-md"
            >
              <Check className="h-4 w-4" /> Approve &amp; Continue
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Reference Sheet Image */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <FileText className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-bold text-slate-700">
            Comprehensive Reference Sheet (proportions, three-view, expressions, poses, costume)
          </h4>
        </div>
        <div
          onClick={() => setIsZoomed(true)}
          className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="bg-slate-50 relative flex items-center justify-center p-2">
            <img
              src={sheet.sheetImage}
              alt={`${character.name} reference sheet`}
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain max-h-[600px]"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <span className="p-2 bg-white/95 rounded-full text-slate-700 shadow shadow-black/20">
                <Eye className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal / Zoom View */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h5 className="font-bold text-slate-800 text-lg">{character.name}&apos;s Reference Sheet</h5>
              <button
                onClick={() => setIsZoomed(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 hover:bg-slate-100 rounded"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-100 flex items-center justify-center p-4 max-h-[80vh] overflow-auto">
              <img
                src={sheet.sheetImage}
                alt="Character reference sheet"
                referrerPolicy="no-referrer"
                className="max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
