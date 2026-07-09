/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { StoryTemplate } from "../types.js";
import { Settings, Plus, Edit2, Trash2, Check, X, Shield, BookOpen } from "lucide-react";

interface TemplateConfigProps {
  templates: StoryTemplate[];
  onSaveTemplate: (template: StoryTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function TemplateConfig({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
}: TemplateConfigProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  // Form State
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("📚");
  const [ageRange, setAgeRange] = useState("3-6 years");
  const [numberOfPages, setNumberOfPages] = useState(8);
  const [promptTemplate, setPromptTemplate] = useState("");

  const startEdit = (t: StoryTemplate) => {
    setEditingId(t.id);
    setId(t.id);
    setTitle(t.title);
    setDescription(t.description);
    setCoverImage(t.coverImage);
    setAgeRange(t.ageRange);
    setNumberOfPages(t.numberOfPages);
    setPromptTemplate(t.promptTemplate);
    setShowCreator(true);
  };

  const startNew = () => {
    setEditingId(null);
    setId("template_" + Math.random().toString(36).substring(2, 9));
    setTitle("");
    setDescription("");
    setCoverImage("✨");
    setAgeRange("3-6 years");
    setNumberOfPages(8);
    setPromptTemplate("");
    setShowCreator(true);
  };

  const cancelForm = () => {
    setShowCreator(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !promptTemplate) return;

    onSaveTemplate({
      id,
      title,
      description,
      coverImage,
      ageRange,
      numberOfPages: Number(numberOfPages),
      promptTemplate,
    });

    setShowCreator(false);
    setEditingId(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="template-config">
      {/* Header controls */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h4 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
            <Settings className="h-5 w-5 text-emerald-600" /> Administrative Config &amp; Prompt Panel
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Configure story templates and global prompts.</p>
        </div>
        {!showCreator && (
          <button
            onClick={startNew}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Add Template
          </button>
        )}
      </div>

      {/* Editor / Form */}
      {showCreator && (
        <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" />
              {editingId ? `Modify: ${title}` : "New Story Archetype Config"}
            </h5>
            <button type="button" onClick={cancelForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Template ID (Unique)</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={!!editingId}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white disabled:opacity-50"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Adventure Title</label>
              <input
                type="text"
                placeholder="e.g. Dinosaur Land"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Cover Icon / Emoji</label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white text-center"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Age Range</label>
              <input
                type="text"
                placeholder="e.g. 3-6 years"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Standard Page count</label>
              <input
                type="number"
                min={4}
                max={20}
                value={numberOfPages}
                onChange={(e) => setNumberOfPages(Number(e.target.value))}
                className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Short Description</label>
            <input
              type="text"
              placeholder="Short plot summary shown to users."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              Prompt Instructions <span className="text-slate-400 font-medium">(Supports MAIN_CHARACTER tags)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Provide a comprehensive narrative setup for the story prompt engine."
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-1"
            >
              <Check className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        </form>
      )}

      {/* Templates List */}
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-slate-600 flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5 text-emerald-600" /> Active System story templates
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{t.coverImage}</span>
                    <div>
                      <h6 className="font-bold text-slate-800 text-sm">{t.title}</h6>
                      <span className="text-[10px] text-slate-400 font-mono">{t.id}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-500">
                    {t.numberOfPages} Pages
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {t.description || "No description provided."}
                </p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Target: {t.ageRange}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => startEdit(t)}
                    className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition flex items-center gap-1 text-[10px] font-bold"
                    title="Edit Template"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(t.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-red-500 transition flex items-center gap-1 text-[10px] font-bold"
                    title="Delete Template"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
