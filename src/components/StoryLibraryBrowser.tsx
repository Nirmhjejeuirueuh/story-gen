/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { StoryLibraryEntry } from "../types.js";
import { Library, Sparkles, Users, Images, ChevronDown, ChevronUp, RefreshCw, ImageOff, Tag, X, Loader2, FileText } from "lucide-react";

interface SelectedCharacter {
  storyId: string;
  key: string;
  displayName: string;
}

interface CharacterDetail {
  key: string;
  displayName: string;
  prompt: string | null;
  hasImage: boolean;
  displaySheetImageUrl: string | null;
}

interface StoryLibraryBrowserProps {
  onCreate: (libraryStoryId: string) => void;
  isCreating?: boolean;
}

export default function StoryLibraryBrowser({ onCreate, isCreating = false }: StoryLibraryBrowserProps) {
  const [stories, setStories] = useState<StoryLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null); // `${storyId}:${pageNumber}`
  const [cacheBust, setCacheBust] = useState<Record<string, number>>({});

  // Cast preview pop-up: the clicked character, plus its fetched sheet prompt / image flag.
  const [selectedChar, setSelectedChar] = useState<SelectedCharacter | null>(null);
  const [charDetail, setCharDetail] = useState<CharacterDetail | null>(null);
  const [charDetailLoading, setCharDetailLoading] = useState(false);
  const [sheetGenerating, setSheetGenerating] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const handleGenerateSheet = async () => {
    if (!selectedChar) return;
    setSheetGenerating(true);
    setSheetError(null);
    try {
      const res = await fetch(`/api/story-library/${selectedChar.storyId}/characters/${encodeURIComponent(selectedChar.key)}/regenerate-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = res.ok ? await res.json() : null;
      if (!data?.displaySheetImageUrl) throw new Error("Generation failed");
      setCharDetail((prev) => (prev ? { ...prev, displaySheetImageUrl: data.displaySheetImageUrl } : prev));
    } catch (err) {
      console.error("Failed to generate character sheet:", err);
      setSheetError("Couldn't generate the sheet. Check the image provider in System Settings and try again.");
    } finally {
      setSheetGenerating(false);
    }
  };

  useEffect(() => {
    if (!selectedChar) {
      setCharDetail(null);
      return;
    }
    let cancelled = false;
    setCharDetailLoading(true);
    setCharDetail(null);
    setSheetError(null);
    setSheetGenerating(false);
    fetch(`/api/story-library/${selectedChar.storyId}/characters/${encodeURIComponent(selectedChar.key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setCharDetail(data); })
      .catch(() => { if (!cancelled) setCharDetail(null); })
      .finally(() => { if (!cancelled) setCharDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedChar]);

  // Close the pop-up on Escape.
  useEffect(() => {
    if (!selectedChar) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedChar(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedChar]);

  useEffect(() => {
    fetch("/api/story-library")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setStories(Array.isArray(data) ? data : []))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (id: string) => {
    setCreatingId(id);
    onCreate(id);
  };

  const chapterKey = (storyId: string, pageNumber: number) => `${storyId}:${pageNumber}`;

  const handleRegenerateIllustration = async (storyId: string, pageNumber: number) => {
    const key = chapterKey(storyId, pageNumber);
    setRegenerating(key);
    try {
      const res = await fetch(`/api/story-library/${storyId}/chapters/${pageNumber}/regenerate-illustration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Regeneration failed");

      setStories((prev) =>
        prev.map((s) =>
          s.id !== storyId
            ? s
            : {
                ...s,
                chapters: s.chapters.map((c) =>
                  c.pageNumber === pageNumber ? { ...c, hasIllustration: true } : c
                ),
              }
        )
      );
      setCacheBust((prev) => ({ ...prev, [key]: Date.now() }));
    } catch (err) {
      console.error("Failed to regenerate chapter illustration:", err);
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
          <Library className="h-5 w-5 text-emerald-600" /> Classic Story Library
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Ready-made storybooks with their own fixed cast and hand-crafted illustration prompts. No personalization needed - pick one and generate the illustrations instantly.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 font-semibold shadow-sm">
          Loading story library...
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 font-semibold shadow-sm">
          No story library templates found. Add one under <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">server/stories/&lt;id&gt;/</code> with a <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">chapters/</code> folder and a <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">charators/</code> folder.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              <div className="p-5 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-base">{story.title}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase">{story.numberOfPages} pages</p>

                {story.tags && story.tags.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Themes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {story.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {story.characters.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" /> Cast
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {story.characters.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setSelectedChar({ storyId: story.id, key: c.key, displayName: c.displayName })}
                          title={`View ${c.displayName}'s character sheet & prompt`}
                          className="flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-full pl-1 pr-2.5 py-1 transition cursor-pointer"
                        >
                          <img
                            src={`/api/story-library/${story.id}/characters/${encodeURIComponent(c.key)}/image`}
                            alt={c.displayName}
                            referrerPolicy="no-referrer"
                            className="h-6 w-6 rounded-full object-cover bg-white border border-slate-200"
                          />
                          <span className="text-[10px] font-bold text-slate-600">{c.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(expandedId === story.id ? null : story.id)}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg py-1.5 transition"
                >
                  <Images className="h-3.5 w-3.5" />
                  {expandedId === story.id ? "Hide Illustrations" : "View & Manage Illustrations"}
                  {expandedId === story.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {expandedId === story.id && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {story.chapters.map((chapter) => {
                      const key = chapterKey(story.id, chapter.pageNumber);
                      const isRegenerating = regenerating === key;
                      const bust = cacheBust[key];
                      return (
                        <div
                          key={chapter.pageNumber}
                          className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex flex-col"
                        >
                          <div className="aspect-square w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {chapter.hasIllustration ? (
                              <img
                                src={`/api/story-library/${story.id}/chapters/${chapter.pageNumber}/illustration${bust ? `?v=${bust}` : ""}`}
                                alt={`Chapter ${chapter.pageNumber} illustration`}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageOff className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div className="p-1.5 flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-slate-500">Ch. {chapter.pageNumber}</span>
                            <button
                              onClick={() => handleRegenerateIllustration(story.id, chapter.pageNumber)}
                              disabled={isRegenerating}
                              title={chapter.hasIllustration ? "Regenerate illustration" : "Generate illustration"}
                              className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 disabled:text-slate-400 px-1.5 py-0.5 rounded-md hover:bg-emerald-50 transition"
                            >
                              <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                              {isRegenerating ? "..." : chapter.hasIllustration ? "Redo" : "Generate"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                <button
                  onClick={() => handleCreate(story.id)}
                  disabled={isCreating}
                  className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isCreating && creatingId === story.id ? "Creating..." : "Create This Storybook"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cast character preview pop-up: reference sheet + the prompt used to generate it */}
      {selectedChar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedChar(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h4 className="font-black text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> {selectedChar.displayName}
              </h4>
              <button
                onClick={() => setSelectedChar(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Character sheet: the generated multi-view sheet if one exists, else the single reference */}
              <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                <img
                  key={charDetail?.displaySheetImageUrl || "single"}
                  src={charDetail?.displaySheetImageUrl || `/api/story-library/${selectedChar.storyId}/characters/${encodeURIComponent(selectedChar.key)}/image`}
                  alt={`${selectedChar.displayName} character sheet`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Generate / regenerate the multi-view display sheet (on demand) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400">
                    {charDetail?.displaySheetImageUrl ? "Multi-view sheet" : "Single reference image"}
                  </span>
                  <button
                    onClick={handleGenerateSheet}
                    disabled={sheetGenerating}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 disabled:text-slate-400 border border-emerald-200 hover:bg-emerald-50 disabled:border-slate-200 rounded-lg px-2.5 py-1.5 transition"
                  >
                    {sheetGenerating
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating sheet...</>
                      : <><Sparkles className="h-3.5 w-3.5" /> {charDetail?.displaySheetImageUrl ? "Regenerate multi-view sheet" : "Generate multi-view sheet"}</>}
                  </button>
                </div>
                {sheetError && <p className="text-[11px] text-red-600 font-medium">{sheetError}</p>}
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  A full multi-pose sheet is for viewing only — the clean single image above stays the reference used to keep {selectedChar.displayName} consistent across the story's illustrations.
                </p>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Character Sheet Prompt
                </span>
                {charDetailLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading prompt...
                  </div>
                ) : charDetail?.prompt ? (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre-wrap">
                    {charDetail.prompt}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl p-3">
                    No written prompt for this character — its reference sheet is used directly for consistency.
                  </p>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                This reference sheet is used automatically when generating this story's illustrations, so {selectedChar.displayName} stays visually consistent across every page.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
