/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { StoryLibraryEntry } from "../types.js";
import {
  Library, Sparkles, Users, ChevronDown, ChevronUp, Tag, X, Loader2, FileText, Wand2,
  Save, Image as ImageIcon, Palette,
} from "lucide-react";

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

interface ArtStyleOption {
  id: string;
  label: string;
}

const DEFAULT_STYLE_ID = "vintage-watercolor";

/** One generated template page (server shape: TemplatePageDoc). Layout is AI-chosen, not user-editable. */
interface TemplatePage {
  pageNumber: number;
  storyText: string;
  illustrationPrompt: string;
  characterKeys?: string[];
  layoutId?: number;
  imageUrl?: string; // the DEFAULT style's image
  imageUrls?: Record<string, string>; // image per style id
}

interface StoryLibraryBrowserProps {
  onCreate: (libraryStoryId: string) => void;
  isCreating?: boolean;
}

export default function StoryLibraryBrowser({ onCreate, isCreating = false }: StoryLibraryBrowserProps) {
  const [stories, setStories] = useState<StoryLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  // Art style switcher: one global choice that every story's cast avatars/preview render in.
  // Vintage Watercolor is always available (it's the original art, generated up front); other
  // styles are rendered lazily per story the first time you switch to them.
  const [styles, setStyles] = useState<ArtStyleOption[]>([{ id: DEFAULT_STYLE_ID, label: "Vintage Watercolor" }]);
  // Persisted so the picked style survives a reload. localStorage can throw outright (Safari
  // private mode, blocked third-party storage), and an unguarded throw in a useState initializer
  // takes the whole page down — so remembering the choice must never be load-bearing.
  const [styleId, setStyleIdState] = useState<string>(() => {
    try {
      return localStorage.getItem("storyLibraryStyleId") || DEFAULT_STYLE_ID;
    } catch {
      return DEFAULT_STYLE_ID;
    }
  });
  const setStyleId = (id: string) => {
    setStyleIdState(id);
    try {
      localStorage.setItem("storyLibraryStyleId", id);
    } catch { /* non-fatal: the style just won't persist across reloads */ }
  };
  const [castImgVersion, setCastImgVersion] = useState(0); // bumped after a per-story style generation, to bust <img> caches
  const [generatingCastForStory, setGeneratingCastForStory] = useState<string | null>(null);
  const [castMissingForStory, setCastMissingForStory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/styles")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (Array.isArray(data) && data.length) setStyles(data); })
      .catch(() => {});
  }, []);

  // Switching styles: nothing to fetch up front — each story's cast avatars just start
  // requesting `?styleId=`, and any that 404 (not generated for this style yet) flip
  // castMissingForStory so that story's card offers a one-click "Generate cast" action.
  useEffect(() => {
    setCastMissingForStory({});
  }, [styleId]);

  const generateCastForStory = async (story: StoryLibraryEntry) => {
    setGeneratingCastForStory(story.id);
    try {
      const res = await fetch(`/api/story-library/${story.id}/styles/${encodeURIComponent(styleId)}/generate-cast`, { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      setCastMissingForStory((m) => ({ ...m, [story.id]: false }));
      setCastImgVersion((v) => v + 1);
    } catch (err) {
      console.error(`Failed to generate ${story.id}'s cast in style ${styleId}:`, err);
    } finally {
      setGeneratingCastForStory(null);
    }
  };

  // The single "Generate" accordion (any signed-in user): which story's page list is open, its pages,
  // and per-page editor state. Only one story's panel is open at a time.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pages, setPages] = useState<TemplatePage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [generatingPages, setGeneratingPages] = useState(false);
  const [expandedPage, setExpandedPage] = useState<number | null>(null);
  const [savingPage, setSavingPage] = useState<number | null>(null);
  const [imagingPage, setImagingPage] = useState<number | null>(null);
  const [pageMsg, setPageMsg] = useState<Record<number, { text: string; error?: boolean }>>({});

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
        body: JSON.stringify({ styleId }),
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
    fetch(`/api/story-library/${selectedChar.storyId}/characters/${encodeURIComponent(selectedChar.key)}?styleId=${encodeURIComponent(styleId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setCharDetail(data); })
      .catch(() => { if (!cancelled) setCharDetail(null); })
      .finally(() => { if (!cancelled) setCharDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedChar, styleId]);

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

  // Toggles the single "Generate" accordion for a story, loading its generated pages on open.
  const toggleGenerate = async (story: StoryLibraryEntry) => {
    if (expandedId === story.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(story.id);
    setExpandedPage(null);
    setPagesError(null);
    setPageMsg({});
    setPagesLoading(true);
    try {
      const res = await fetch(`/api/story-library/${story.id}/pages`);
      setPages(res.ok ? await res.json() : []);
    } catch {
      setPages([]);
      setPagesError("Couldn't load pages.");
    } finally {
      setPagesLoading(false);
    }
  };

  const handleGeneratePages = async (story: StoryLibraryEntry) => {
    if (pages.length > 0 && !window.confirm("Regenerate all pages? This replaces the current text and prompts (generated images are cleared).")) return;
    setGeneratingPages(true);
    setPagesError(null);
    try {
      const res = await fetch(`/api/story-library/${story.id}/generate-pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numPages: story.numberOfPages }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.pages) {
        // Surface the backend's actual reason (e.g. Gemini quota/billing, invalid JSON) instead of
        // a generic message — otherwise a credits-exhausted failure is indistinguishable from a
        // real bug.
        throw new Error(data?.error || "Page generation failed. Check the text provider in System Settings and try again.");
      }
      setPages(data.pages);
    } catch (err: any) {
      setPagesError(err.message || "Page generation failed. Check the text provider in System Settings and try again.");
    } finally {
      setGeneratingPages(false);
    }
  };

  const patchPageLocal = (pageNumber: number, patch: Partial<TemplatePage>) =>
    setPages((prev) => prev.map((p) => (p.pageNumber === pageNumber ? { ...p, ...patch } : p)));

  /** The rendered page image for the currently selected art style, if one has been generated. */
  const pageImageFor = (page: TemplatePage): string | undefined =>
    page.imageUrls?.[styleId] ?? (styleId === DEFAULT_STYLE_ID ? page.imageUrl : undefined);

  const savePage = async (storyId: string, page: TemplatePage) => {
    setSavingPage(page.pageNumber);
    setPageMsg((m) => ({ ...m, [page.pageNumber]: { text: "" } }));
    try {
      const res = await fetch(`/api/story-library/${storyId}/pages/${page.pageNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyText: page.storyText, illustrationPrompt: page.illustrationPrompt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Save failed");
      }
      setPageMsg((m) => ({ ...m, [page.pageNumber]: { text: "Saved" } }));
    } catch (err: any) {
      setPageMsg((m) => ({ ...m, [page.pageNumber]: { text: err.message || "Save failed", error: true } }));
    } finally {
      setSavingPage(null);
    }
  };

  const generatePageImage = async (storyId: string, page: TemplatePage) => {
    setImagingPage(page.pageNumber);
    setPageMsg((m) => ({ ...m, [page.pageNumber]: { text: "" } }));
    try {
      // Persist any edits first so the image reflects the current text/prompt.
      await fetch(`/api/story-library/${storyId}/pages/${page.pageNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyText: page.storyText, illustrationPrompt: page.illustrationPrompt }),
      });
      const res = await fetch(`/api/story-library/${storyId}/pages/${page.pageNumber}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || "Image generation failed");
      const versioned = `${data.imageUrl}${data.imageUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
      patchPageLocal(page.pageNumber, { imageUrls: { ...page.imageUrls, [data.styleId || styleId]: versioned } });
    } catch (err: any) {
      setPageMsg((m) => ({ ...m, [page.pageNumber]: { text: err.message || "Image generation failed", error: true } }));
    } finally {
      setImagingPage(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
            <Library className="h-5 w-5 text-emerald-600" /> Classic Story Library
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ready-made storybooks with their own fixed cast and hand-crafted illustration prompts. No personalization needed - pick one and generate the illustrations instantly.
          </p>
        </div>
        <label className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl pl-2.5 pr-1.5 py-1.5 shrink-0">
          <Palette className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Art Style</span>
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
          >
            {styles.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
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
                            key={`${c.key}-${styleId}-${castImgVersion}`}
                            src={`/api/story-library/${story.id}/characters/${encodeURIComponent(c.key)}/image?styleId=${encodeURIComponent(styleId)}`}
                            alt={c.displayName}
                            referrerPolicy="no-referrer"
                            className="h-6 w-6 rounded-full object-cover bg-white border border-slate-200"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                              if (styleId !== DEFAULT_STYLE_ID) setCastMissingForStory((m) => ({ ...m, [story.id]: true }));
                            }}
                          />
                          <span className="text-[10px] font-bold text-slate-600">{c.displayName}</span>
                        </button>
                      ))}
                    </div>
                    {castMissingForStory[story.id] && (
                      <button
                        type="button"
                        onClick={() => generateCastForStory(story)}
                        disabled={generatingCastForStory === story.id}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 disabled:text-slate-400 border border-emerald-200 hover:bg-emerald-50 disabled:border-slate-200 rounded-lg px-2.5 py-1.5 transition"
                      >
                        {generatingCastForStory === story.id
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating cast in {styles.find((s) => s.id === styleId)?.label || styleId}...</>
                          : <><Sparkles className="h-3 w-3" /> Generate cast in {styles.find((s) => s.id === styleId)?.label || styleId}</>}
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={() => toggleGenerate(story)}
                  title="Generate or edit this story's page text + illustrations"
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg py-1.5 transition"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Generate
                  {expandedId === story.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {expandedId === story.id && (
                  <div className="space-y-2 pt-1">
                    {pagesError && <p className="text-[11px] text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg p-2">{pagesError}</p>}

                    {pagesLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-4 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading pages...
                      </div>
                    ) : pages.length === 0 ? (
                      <div className="text-center py-4 space-y-2">
                        <p className="text-[11px] text-slate-400">No pages yet for this story.</p>
                        <button
                          onClick={() => handleGeneratePages(story)}
                          disabled={generatingPages}
                          className="flex items-center gap-1.5 mx-auto text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg px-3 py-1.5 transition"
                        >
                          {generatingPages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {generatingPages ? "Generating..." : "Generate Pages"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleGeneratePages(story)}
                          disabled={generatingPages}
                          className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 disabled:text-slate-300 py-1 transition"
                        >
                          {generatingPages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {generatingPages ? "Regenerating all pages..." : "Regenerate all pages"}
                        </button>

                        {pages.map((page) => {
                          const isOpen = expandedPage === page.pageNumber;
                          return (
                            <div key={page.pageNumber} className="border border-slate-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => setExpandedPage(isOpen ? null : page.pageNumber)}
                                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                              >
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[10px] font-black text-slate-700 shrink-0">Pg {page.pageNumber}</span>
                                  <span className="text-[10px] text-slate-400 truncate">{page.storyText || "(no text)"}</span>
                                </span>
                                <span className="flex items-center gap-1 shrink-0">
                                  {pageImageFor(page) && <ImageIcon className="h-3 w-3 text-emerald-600" />}
                                  {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                                </span>
                              </button>

                              {isOpen && (
                                <div className="p-2.5 space-y-2 border-t border-slate-100">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Story text (rendered on the page)</label>
                                    <textarea
                                      value={page.storyText}
                                      onChange={(e) => patchPageLocal(page.pageNumber, { storyText: e.target.value })}
                                      rows={2}
                                      className="w-full text-[11px] text-slate-700 border border-slate-200 rounded-md p-2 focus:outline-none focus:border-emerald-300 resize-y"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Illustration prompt (scene)</label>
                                    <textarea
                                      value={page.illustrationPrompt}
                                      onChange={(e) => patchPageLocal(page.pageNumber, { illustrationPrompt: e.target.value })}
                                      rows={3}
                                      className="w-full text-[11px] text-slate-700 border border-slate-200 rounded-md p-2 focus:outline-none focus:border-emerald-300 resize-y"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => savePage(story.id, page)}
                                      disabled={savingPage === page.pageNumber}
                                      className="flex items-center gap-1 text-[10px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md px-2 py-1 transition disabled:opacity-50"
                                    >
                                      {savingPage === page.pageNumber ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                                    </button>
                                    <button
                                      onClick={() => generatePageImage(story.id, page)}
                                      disabled={imagingPage === page.pageNumber}
                                      className="flex items-center gap-1 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md px-2 py-1 transition disabled:bg-slate-300"
                                    >
                                      {imagingPage === page.pageNumber ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                      {imagingPage === page.pageNumber ? "Rendering..." : pageImageFor(page) ? `Regenerate Image (${styles.find((s) => s.id === styleId)?.label || styleId})` : `Generate Image (${styles.find((s) => s.id === styleId)?.label || styleId})`}
                                    </button>
                                  </div>

                                  {pageMsg[page.pageNumber]?.text && (
                                    <p className={`text-[10px] font-semibold ${pageMsg[page.pageNumber].error ? "text-red-600" : "text-emerald-700"}`}>
                                      {pageMsg[page.pageNumber].text}
                                    </p>
                                  )}

                                  {pageImageFor(page) && (
                                    <div className="w-full aspect-square max-w-[200px] mx-auto bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                      <img key={styleId} src={pageImageFor(page)} alt={`Page ${page.pageNumber}`} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
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
                  key={charDetail?.displaySheetImageUrl || `single-${styleId}`}
                  src={charDetail?.displaySheetImageUrl || `/api/story-library/${selectedChar.storyId}/characters/${encodeURIComponent(selectedChar.key)}/image?styleId=${encodeURIComponent(styleId)}`}
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
