/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { StoryLibraryEntry } from "../types.js";
import { Library, Sparkles, Users } from "lucide-react";

interface StoryLibraryBrowserProps {
  onCreate: (libraryStoryId: string) => void;
  isCreating?: boolean;
}

export default function StoryLibraryBrowser({ onCreate, isCreating = false }: StoryLibraryBrowserProps) {
  const [stories, setStories] = useState<StoryLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

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

                {story.characters.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" /> Cast
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {story.characters.map((c) => (
                        <div key={c.key} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full pl-1 pr-2.5 py-1">
                          <img
                            src={`/api/story-library/${story.id}/characters/${encodeURIComponent(c.key)}/image`}
                            alt={c.displayName}
                            referrerPolicy="no-referrer"
                            className="h-6 w-6 rounded-full object-cover bg-white border border-slate-200"
                          />
                          <span className="text-[10px] font-bold text-slate-600">{c.displayName}</span>
                        </div>
                      ))}
                    </div>
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
    </div>
  );
}
