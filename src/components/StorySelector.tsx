/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { StoryTemplate } from "../types.js";
import { BookOpen, Calendar, HelpCircle, Plus, Settings, Sparkles, Trash2 } from "lucide-react";

interface StorySelectorProps {
  templates: StoryTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddCustomTemplate?: (template: StoryTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
}

export default function StorySelector({
  templates,
  selectedId,
  onSelect,
  onAddCustomTemplate,
  onDeleteTemplate,
}: StorySelectorProps) {
  const [showCreator, setShowCreator] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customAge, setCustomAge] = useState("3-6 years");
  const [customPages, setCustomPages] = useState(8);
  const [customCover, setCustomCover] = useState("✨");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customPrompt) return;

    const newTemplate: StoryTemplate = {
      id: "template_" + Math.random().toString(36).substring(2, 9),
      title: customTitle,
      description: customDesc || "A custom personalized adventure story tailored to your child.",
      coverImage: customCover,
      ageRange: customAge,
      numberOfPages: Number(customPages),
      promptTemplate: customPrompt,
    };

    if (onAddCustomTemplate) {
      onAddCustomTemplate(newTemplate);
    }

    // Reset Form
    setCustomTitle("");
    setCustomDesc("");
    setCustomPrompt("");
    setCustomAge("3-6 years");
    setCustomPages(8);
    setCustomCover("✨");
    setShowCreator(false);
  };

  return (
    <div className="space-y-6" id="story-selector">
      {/* Title block */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            Select Story Archetype Template
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">Choose an adventure theme or design your own customized storytelling script.</p>
        </div>
        <button
          onClick={() => setShowCreator(!showCreator)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-300"
        >
          <Plus className="h-3.5 w-3.5 text-slate-600" /> Custom Template
        </button>
      </div>

      {/* Custom Template Form panel */}
      {showCreator && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 space-y-4 animate-fadeIn"
        >
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-emerald-500" /> Configure Custom Story Script
            </h5>
            <button
              type="button"
              onClick={() => setShowCreator(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Adventure Title</label>
              <input
                type="text"
                placeholder="e.g. Secret Treehouse Guild"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                required
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-600">Brief Pitch / Description</label>
              <input
                type="text"
                placeholder="Brief plot outline that is displayed to the user."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Cover Emoji</label>
              <input
                type="text"
                placeholder="🏠"
                value={customCover}
                onChange={(e) => setCustomCover(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg text-center bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Age Range</label>
              <select
                value={customAge}
                onChange={(e) => setCustomAge(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="1-4 years">1-4 years</option>
                <option value="3-6 years">3-6 years</option>
                <option value="4-8 years">4-8 years</option>
                <option value="6-10 years">6-10 years</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-600">Number of Pages (10-20 standard)</label>
              <input
                type="number"
                min={4}
                max={20}
                value={customPages}
                onChange={(e) => setCustomPages(Number(e.target.value))}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              AI Story prompt script <span className="text-slate-400 font-medium">(Use MAIN_CHARACTER placeholder)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Write an exciting treehouse story where MAIN_CHARACTER starts a secret code-breaking guild with a wise badger in the garden."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
          >
            Save custom story archetype
          </button>
        </form>
      )}

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <div
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`group relative bg-white border rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                isSelected
                  ? "ring-2 ring-emerald-500 border-transparent bg-emerald-50/10"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition-transform duration-200">
                    {template.coverImage}
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      {template.ageRange}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      {template.numberOfPages} Pages
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                    {template.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {template.description}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                <span className={`text-xs font-bold ${isSelected ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-500"}`}>
                  {isSelected ? "Selected Template ✓" : "Click to select"}
                </span>
                
                {onDeleteTemplate && template.id.startsWith("template_") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTemplate(template.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                    title="Delete custom template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
