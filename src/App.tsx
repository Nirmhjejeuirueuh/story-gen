/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Settings,
  Users,
  Activity,
  ChevronRight,
  ChevronLeft,
  BookMarked,
  User,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  AlertCircle
} from "lucide-react";

import { Character, Book, StoryTemplate, IllustrationStyle, Job, JobType } from "./types.js";
import ImageUploader from "./components/ImageUploader.tsx";
import CharacterSheetViewer from "./components/CharacterSheetViewer.tsx";
import StorySelector from "./components/StorySelector.tsx";
import StoryEditor from "./components/StoryEditor.tsx";
import BookPreview from "./components/BookPreview.tsx";
import ImageGenerationStatus from "./components/ImageGenerationStatus.tsx";
import PDFExportDialog from "./components/PDFExportDialog.tsx";
import TemplateConfig from "./components/TemplateConfig.tsx";
import SystemSettings from "./components/SystemSettings.tsx";
import { DEFAULT_STYLES } from "../server/config/config.js";

type Tab = "dashboard" | "wizard" | "books" | "templates" | "characters" | "jobs" | "settings";

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Entities state
  const [characters, setCharacters] = useState<Character[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Loading / Error states
  const [loading, setLoading] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Wizard Creation State (Step-by-step memory)
  const [wizardPhotos, setWizardPhotos] = useState<string[]>([]);
  const [charName, setCharName] = useState("");
  const [charAge, setCharAge] = useState(5);
  const [charGender, setCharGender] = useState("Boy");
  const [charDesc, setCharDesc] = useState("");
  const [charHairColor, setCharHairColor] = useState("Brown");
  const [charHairStyle, setCharHairStyle] = useState("Short");
  const [charEyeColor, setCharEyeColor] = useState("Brown");
  const [charSkinTone, setCharSkinTone] = useState("Fair");
  const [charClothingStyle, setCharClothingStyle] = useState("Colorful T-shirt and Jeans");
  const [charAccessories, setCharAccessories] = useState("None");
  const [charPersonality, setCharPersonality] = useState("Cheerful and Adventurous");
  const [charAdditionalNotes, setCharAdditionalNotes] = useState("");
  
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null);
  const [charSheetJobId, setCharSheetJobId] = useState<string | null>(null);
  const [charSheetApproved, setCharSheetApproved] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState<IllustrationStyle>(IllustrationStyle.STORYBOOK);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [storyJobId, setStoryJobId] = useState<string | null>(null);

  const [isRegeneratingPageId, setIsRegeneratingPageId] = useState<number | null>(null);

  // Poll for active jobs
  useEffect(() => {
    fetchTemplates();
    fetchCharacters();
    fetchBooks();
    fetchJobs();

    const interval = setInterval(() => {
      fetchJobs();
      // If we are waiting on a job, fetch updates for character/book
      if (charSheetJobId) {
        checkCharSheetStatus();
      }
      if (storyJobId) {
        checkStoryStatus();
      }
      if (activeBook) {
        refreshActiveBook();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [charSheetJobId, storyJobId, activeBook?.id]);

  // --- API QUERIES ---

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.warn(`[SafeFetch] Non-JSON or error response from ${url}: Status ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn(`[SafeFetch] Failed to fetch or parse from ${url}:`, err);
      return null;
    }
  };

  const fetchTemplates = async () => {
    const data = await safeFetchJson("/api/templates");
    if (Array.isArray(data)) setTemplates(data);
  };

  const fetchCharacters = async () => {
    const data = await safeFetchJson("/api/characters");
    if (Array.isArray(data)) setCharacters(data);
  };

  const fetchBooks = async () => {
    const data = await safeFetchJson("/api/books");
    if (Array.isArray(data)) setBooks(data);
  };

  const fetchJobs = async () => {
    const data = await safeFetchJson("/api/jobs");
    if (Array.isArray(data)) setJobs(data);
  };

  const refreshActiveBook = async () => {
    if (!activeBook) return;
    const data = await safeFetchJson(`/api/books/${activeBook.id}`);
    if (data && data.id) {
      setActiveBook(data);
    }
  };

  const checkCharSheetStatus = async () => {
    if (!charSheetJobId || !createdCharacter) return;
    const job: Job | null = await safeFetchJson(`/api/jobs/${charSheetJobId}`);
    if (job) {
      if (job.status === "Completed") {
        // Fetch generated sheet
        const sheet = await safeFetchJson(`/api/characters/${createdCharacter.id}/sheet`);
        if (sheet) {
          setCharSheetJobId(null);
          fetchCharacters();
        }
      } else if (job.status === "Failed") {
        setWizardError(`Character Sheet Generation Failed: ${job.error}`);
        setCharSheetJobId(null);
      }
    }
  };

  const checkStoryStatus = async () => {
    if (!storyJobId || !activeBook) return;
    const job: Job | null = await safeFetchJson(`/api/jobs/${storyJobId}`);
    if (job) {
      if (job.status === "Completed") {
        setStoryJobId(null);
        // Load populated pages
        const data = await safeFetchJson(`/api/books/${activeBook.id}`);
        if (data) {
          setActiveBook(data);
          fetchBooks();
          setWizardStep(6); // Forward to Illustrations progress step
        }
      } else if (job.status === "Failed") {
        setWizardError(`Story Outline Generation Failed: ${job.error}`);
        setStoryJobId(null);
      }
    }
  };

  // --- ACTIONS ---

  // Custom template save / delete
  const handleSaveTemplate = async (template: StoryTemplate) => {
    try {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  // Delete books
  const handleDeleteBook = async (id: string) => {
    try {
      await fetch(`/api/books/${id}`, { method: "DELETE" });
      fetchBooks();
      if (activeBook?.id === id) setActiveBook(null);
    } catch (err) {
      console.error("Failed to delete book:", err);
    }
  };

  // --- STORYBOOK WIZARD CONTROLLER ---

  const handleCreateProfile = async () => {
    if (!charName) {
      setWizardError("Character profile name is required.");
      return;
    }
    setWizardError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: charName,
          age: Number(charAge),
          gender: charGender,
          description: charDesc || `A joyful, active ${charGender.toLowerCase()}`,
          photos: wizardPhotos,
          hairColor: charHairColor,
          hairStyle: charHairStyle,
          eyeColor: charEyeColor,
          skinTone: charSkinTone,
          clothingStyle: charClothingStyle,
          accessories: charAccessories,
          personality: charPersonality,
          additionalNotes: charAdditionalNotes
        }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Server returned non-JSON response (status ${res.status}). Please verify configuration.`);
      }

      if (!res.ok) throw new Error(data.error || "Failed to create character");

      setCreatedCharacter(data.character);
      setCharSheetJobId(data.jobId);
      setCharSheetApproved(false);
      setWizardStep(2); // Jump to Character sheet view step
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSheet = async (approved: boolean) => {
    if (!createdCharacter) return;
    try {
      // Find sheet from list/db
      const sheetRes = await fetch(`/api/characters/${createdCharacter.id}/sheet`);
      if (!sheetRes.ok) return;
      const contentType = sheetRes.headers.get("content-type");
      const sheet = (contentType && contentType.includes("application/json")) ? await sheetRes.json() : null;
      if (!sheet) return;

      const approveRes = await fetch(`/api/character-sheet/${sheet.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });

      if (approveRes.ok) {
        setCharSheetApproved(approved);
        if (approved) setWizardStep(3); // Forward to Style Choose
      }
    } catch (err) {
      console.error("Failed to approve sheet:", err);
    }
  };

  const handleGenerateStoryText = async () => {
    if (!createdCharacter || !selectedTemplateId) {
      setWizardError("Please complete character profiles and select a story template.");
      return;
    }
    setWizardError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: createdCharacter.id,
          templateId: selectedTemplateId,
          style: selectedStyle,
          childName: createdCharacter.name,
          numberOfPages: 8,
        }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Server returned non-JSON response (status ${res.status}). Please verify configuration.`);
      }

      if (!res.ok) throw new Error(data.error || "Failed to initiate storybook outline");

      setActiveBook(data.book);
      setStoryJobId(data.jobId);
      setWizardStep(5); // Go to Story Text Drafting screen
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDrawIllustrations = async () => {
    if (!activeBook) return;
    try {
      await fetch(`/api/books/${activeBook.id}/generate`, { method: "POST" });
      refreshActiveBook();
    } catch (err) {
      console.error("Illustration batch start failed:", err);
    }
  };

  const handleRegeneratePageIllustration = async (pageNumber: number) => {
    if (!activeBook) return;
    setIsRegeneratingPageId(pageNumber);
    try {
      await fetch("/api/pages/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: activeBook.id,
          pageNumber,
        }),
      });
      refreshActiveBook();
    } catch (err) {
      console.error("Regeneration trigger failed:", err);
    } finally {
      setIsRegeneratingPageId(null);
    }
  };

  const handleUpdateBookInWizard = async (updates: Partial<Book>) => {
    if (!activeBook) return;
    try {
      const res = await fetch(`/api/books/${activeBook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setActiveBook(data.book);
          fetchBooks();
        }
      }
    } catch (err) {
      console.error("Failed to update book details:", err);
    }
  };

  const startNewWizard = () => {
    setWizardPhotos([]);
    setCharName("");
    setCharAge(5);
    setCharGender("Boy");
    setCharDesc("");
    setCreatedCharacter(null);
    setCharSheetJobId(null);
    setCharSheetApproved(false);
    setSelectedTemplateId(null);
    setActiveBook(null);
    setStoryJobId(null);
    setWizardStep(1);
    setActiveTab("wizard");
  };

  // Helper to fetch character sheet for standard displays
  const [activeSheet, setActiveSheet] = useState<any | null>(null);
  useEffect(() => {
    if (createdCharacter) {
      fetch(`/api/characters/${createdCharacter.id}/sheet`)
        .then((r) => {
          const contentType = r.headers.get("content-type");
          if (r.ok && contentType && contentType.includes("application/json")) {
            return r.json();
          }
          return null;
        })
        .then((d) => setActiveSheet(d))
        .catch(() => setActiveSheet(null));
    } else {
      setActiveSheet(null);
    }
  }, [createdCharacter?.id, charSheetJobId]);

  return (
    <div className="min-h-screen bg-slate-50 flex" id="applet-root">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 select-none border-r border-slate-800">
        <div className="space-y-6">
          {/* Logo / Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500 rounded-xl shadow-md text-white font-black">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-wide leading-none uppercase">StoryCraft AI</h1>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Children SaaS v1.0</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="px-3 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "dashboard" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </button>
            <button
              onClick={startNewWizard}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "wizard" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4" /> Story Wizard
            </button>
             <button
              onClick={() => setActiveTab("books")}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "books" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4" /> My Books
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "templates" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <BookMarked className="h-4 w-4" /> Config &amp; Prompts
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "settings" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4" /> System Settings
            </button>
            <button
              onClick={() => setActiveTab("characters")}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "characters" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" /> Characters
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "jobs" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Activity className="h-4 w-4" /> Active Jobs
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 font-bold tracking-wider text-center">
          HOST PORT: 3000 • SANDBOXED
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <AnimatePresence mode="wait">
          {/* --- TAB 1: DASHBOARD --- */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Cover intro */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-800 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg border border-emerald-700 select-none">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight leading-none">Personalized Storybooks</h2>
                  <p className="text-sm text-teal-100 max-w-xl">
                    Create unique, beautiful children's books staring their own face as a consistent character! No LoRAs or heavy trainings required.
                  </p>
                </div>
                <button
                  onClick={startNewWizard}
                  className="px-6 py-3 bg-white hover:bg-slate-50 text-emerald-800 font-black rounded-2xl text-sm transition shadow-lg flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Create Storybook
                </button>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <BookMarked className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase">Total Storybooks</h5>
                    <p className="text-2xl font-black text-slate-800 mt-1">{books.length}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase">Characters Created</h5>
                    <p className="text-2xl font-black text-slate-800 mt-1">{characters.length}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase">Running Queue Jobs</h5>
                    <p className="text-2xl font-black text-slate-800 mt-1">
                      {jobs.filter((j) => j.status === "Generating" || j.status === "Queued").length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Books List */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                  <BookOpen className="h-5 w-5 text-emerald-600" /> Recent Book Projects
                </h4>
                {books.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-semibold shadow-sm">
                    No books compiled yet. Click &ldquo;Create Storybook&rdquo; above to start!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {books.slice(0, 3).map((book) => (
                      <div
                        key={book.id}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                      >
                        <div className="aspect-[16/10] bg-slate-900 text-white p-5 flex flex-col justify-between border-b border-slate-200 select-none">
                          <div>
                            <span className="text-[9px] font-black uppercase bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">
                              Compiled Book
                            </span>
                            <h5 className="font-extrabold text-base mt-2 line-clamp-1">{book.title}</h5>
                            <p className="text-xs text-slate-300 italic line-clamp-1">{book.coverTitle}</p>
                          </div>
                          <span className="text-3xl text-center">📖</span>
                        </div>
                        <div className="p-4 flex justify-between items-center bg-slate-50">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Child: {book.childName}
                          </div>
                          <button
                            onClick={() => {
                              setActiveBook(book);
                              setCreatedCharacter(characters.find((c) => c.id === book.characterId) || null);
                              setSelectedTemplateId(book.templateId);
                              setSelectedStyle(book.style);
                              setWizardStep(7); // Go to book preview step in wizard!
                              setActiveTab("wizard");
                            }}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Open Book →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* --- TAB 2: WIZARD --- */}
          {activeTab === "wizard" && (
            <motion.div
              key="wizard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Step indicator header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex justify-between items-center select-none overflow-x-auto gap-4">
                {[
                  "1. Photo Upload",
                  "2. Character Sheet",
                  "3. Style",
                  "4. Choose Story",
                  "5. Text Draft",
                  "6. Render Illustrations",
                  "7. Book Preview",
                  "8. Print Ready",
                ].map((step, i) => {
                  const num = i + 1;
                  const isActive = wizardStep === num;
                  const isPast = wizardStep > num;
                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-1.5 font-bold text-xs whitespace-nowrap ${
                        isActive
                          ? "text-emerald-600"
                          : isPast
                          ? "text-slate-400"
                          : "text-slate-300"
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center border ${
                        isActive
                          ? "bg-emerald-100 border-emerald-600 text-emerald-800"
                          : isPast
                          ? "bg-slate-100 border-slate-300 text-slate-500"
                          : "bg-transparent border-slate-200 text-slate-400"
                      }`}>
                        {num}
                      </span>
                      <span>{step.substring(3)}</span>
                    </div>
                  );
                })}
              </div>

              {wizardError && (
                <div className="flex items-center gap-2.5 p-4 bg-red-50 text-red-800 border border-red-100 rounded-2xl text-sm font-semibold">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{wizardError}</span>
                  <button onClick={() => setWizardError(null)} className="ml-auto font-bold">✕</button>
                </div>
              )}

              {/* Wizard Step 1: Upload Photos */}
              {wizardStep === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
                      Step 1: Upload Portraits of Your Child
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Our system will analyze these reference photos to draw a consistent character sheet. No AI training required!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Kid Basic Details */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Child Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Liam"
                          value={charName}
                          onChange={(e) => setCharName(e.target.value)}
                          className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 bg-slate-50 font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Age</label>
                          <input
                            type="number"
                            min={1}
                            max={18}
                            value={charAge}
                            onChange={(e) => setCharAge(Number(e.target.value))}
                            className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Gender</label>
                          <select
                            value={charGender}
                            onChange={(e) => setCharGender(e.target.value)}
                            className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                          >
                            <option value="Boy">Boy</option>
                            <option value="Girl">Girl</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Overall Kid Description</label>
                        <textarea
                          rows={3}
                          placeholder="A cheerful little child who loves to explore and play outside..."
                          value={charDesc}
                          onChange={(e) => setCharDesc(e.target.value)}
                          className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50"
                        />
                      </div>

                      <div className="space-y-1.5 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/70">
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          💡 Visual Attributes Mode
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          You can describe the child below. Uploading photos is <strong>completely optional</strong>! The AI can generate consistent illustrations purely from your custom styling inputs.
                        </p>
                      </div>
                    </div>

                    {/* Middle Column: Detailed Visual Style Attributes */}
                    <div className="lg:col-span-1 space-y-4 bg-slate-50/40 p-4 rounded-3xl border border-slate-100">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Configure Visual Attributes</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold text-slate-500">Hair Style</label>
                          <select
                            value={charHairStyle}
                            onChange={(e) => setCharHairStyle(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
                          >
                            <option value="Short">Short</option>
                            <option value="Short & Curly">Short & Curly</option>
                            <option value="Short & Straight">Short & Straight</option>
                            <option value="Long Straight with Bangs">Long Straight</option>
                            <option value="Long Wavy">Long Wavy</option>
                            <option value="Ponytail">Ponytail</option>
                            <option value="Pigtails">Pigtails</option>
                            <option value="Spiky Cute">Spiky Cute</option>
                            <option value="Messy Bedhead">Messy Bedhead</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold text-slate-500">Hair Color</label>
                          <select
                            value={charHairColor}
                            onChange={(e) => setCharHairColor(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
                          >
                            <option value="Brown">Brown</option>
                            <option value="Black">Black</option>
                            <option value="Blonde">Blonde</option>
                            <option value="Red / Ginger">Red / Ginger</option>
                            <option value="Dirty Blonde">Dirty Blonde</option>
                            <option value="Auburn">Auburn</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold text-slate-500">Eye Color</label>
                          <select
                            value={charEyeColor}
                            onChange={(e) => setCharEyeColor(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
                          >
                            <option value="Brown">Brown</option>
                            <option value="Blue">Blue</option>
                            <option value="Green">Green</option>
                            <option value="Hazel">Hazel</option>
                            <option value="Dark">Dark / Black</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold text-slate-500">Skin Tone</label>
                          <select
                            value={charSkinTone}
                            onChange={(e) => setCharSkinTone(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
                          >
                            <option value="Fair">Fair</option>
                            <option value="Light Warm">Light Warm</option>
                            <option value="Medium / Tan">Medium / Tan</option>
                            <option value="Dark / Deep">Dark / Deep</option>
                            <option value="Olive">Olive</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-500">Clothing Style</label>
                        <input
                          type="text"
                          placeholder="e.g. Colorful T-shirt and Jeans"
                          value={charClothingStyle}
                          onChange={(e) => setCharClothingStyle(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-500">Accessories</label>
                        <select
                          value={charAccessories}
                          onChange={(e) => setCharAccessories(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
                        >
                          <option value="None">None</option>
                          <option value="Round Glasses">Round Glasses</option>
                          <option value="Square Glasses">Square Glasses</option>
                          <option value="Cute Baseball Cap">Cute Baseball Cap</option>
                          <option value="Red Cape">Red Cape</option>
                          <option value="Tiny Backpack">Tiny Backpack</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-500">Personality Traits</label>
                        <input
                          type="text"
                          placeholder="e.g. Cheerful and Adventurous"
                          value={charPersonality}
                          onChange={(e) => setCharPersonality(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-500">Additional Visual Details (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. has freckles, wearing red sneakers"
                          value={charAdditionalNotes}
                          onChange={(e) => setCharAdditionalNotes(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white"
                        />
                      </div>
                    </div>

                    {/* Right Column: Reference Photos (Optional) */}
                    <div className="lg:col-span-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Reference Photos (Optional)</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">Optional</span>
                      </div>
                      <ImageUploader onImagesSelected={setWizardPhotos} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleCreateProfile}
                      disabled={loading || !charName}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1"
                    >
                      {loading ? "Processing..." : "Generate Character Sheet"} <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Wizard Step 2: Character Sheet */}
              {wizardStep === 2 && createdCharacter && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <CharacterSheetViewer
                    character={createdCharacter}
                    sheet={activeSheet}
                    onApprove={handleApproveSheet}
                    onRegenerate={() => {
                      setCharSheetJobId(null);
                      handleCreateProfile();
                    }}
                    isGenerating={!!charSheetJobId}
                  />

                  {charSheetApproved && (
                    <div className="flex justify-end pt-4 border-t border-slate-200">
                      <button
                        onClick={() => setWizardStep(3)}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1"
                      >
                        Choose Illustration Style <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Wizard Step 3: Choose Style */}
              {wizardStep === 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
                      Step 3: Choose Illustration Style
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Select the visual style for your storybook's page illustrations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {DEFAULT_STYLES.map((style) => {
                      const isSel = selectedStyle === style.value;
                      return (
                        <div
                          key={style.value}
                          onClick={() => setSelectedStyle(style.value)}
                          className={`border rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow transition-all flex flex-col justify-between aspect-square ${
                            isSel ? "ring-2 ring-emerald-500 border-transparent bg-emerald-50/10" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="text-4xl text-center">{style.preview.split(" ")[0]}</div>
                          <div className="mt-4 space-y-1">
                            <h5 className="font-bold text-slate-800 text-sm">{style.label}</h5>
                            <p className="text-[11px] text-slate-500 leading-normal line-clamp-3">{style.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
                    >
                      Back to Poses
                    </button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1"
                    >
                      Choose Story theme <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Wizard Step 4: Story selector */}
              {wizardStep === 4 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <StorySelector
                    templates={templates}
                    selectedId={selectedTemplateId}
                    onSelect={setSelectedTemplateId}
                    onAddCustomTemplate={handleSaveTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                  />

                  {selectedTemplateId && (
                    <div className="flex justify-between pt-4 border-t border-slate-200">
                      <button
                        onClick={() => setWizardStep(3)}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
                      >
                        Back to Style
                      </button>
                      <button
                        onClick={handleGenerateStoryText}
                        disabled={loading}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1"
                      >
                        {loading ? "Generating Story Outline..." : "Generate Story text"} <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Wizard Step 5: Draft Story Text (Wait screen) */}
              {wizardStep === 5 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-sm"
                >
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <div className="relative rounded-full h-10 w-10 bg-emerald-600 flex items-center justify-center text-white font-bold">
                      <Sparkles className="animate-spin h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mt-4">Drafting Story Outline &amp; Text...</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-md">
                    Our AI is generating a customized 8-chapter narrative based on the chosen theme. We are crafting engaging story blocks and detailed illustration prompts in structured format.
                  </p>
                </motion.div>
              )}

              {/* Wizard Step 6: Render Illustrations */}
              {wizardStep === 6 && activeBook && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <ImageGenerationStatus
                    book={activeBook}
                    onStartGeneration={handleBatchDrawIllustrations}
                  />

                  {/* Move to preview once illustrations are generated */}
                  <div className="flex justify-between pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setWizardStep(4)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
                    >
                      Change Theme / Template
                    </button>
                    <button
                      onClick={() => setWizardStep(7)}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1"
                    >
                      Book Flip Preview <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Wizard Step 7: Book Preview & Editor */}
              {wizardStep === 7 && activeBook && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <BookPreview book={activeBook} />

                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-1.5">
                      <Settings className="h-5 w-5 text-emerald-600" /> Story Customizer Board
                    </h4>
                    <StoryEditor
                      book={activeBook}
                      onUpdateBook={handleUpdateBookInWizard}
                      onRegeneratePage={handleRegeneratePageIllustration}
                      isRegeneratingPage={isRegeneratingPageId}
                    />
                  </div>

                  <div className="flex justify-between pt-6 border-t border-slate-200">
                    <button
                      onClick={() => setWizardStep(6)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
                    >
                      Back to Render Pipeline
                    </button>
                    <button
                      onClick={() => setWizardStep(8)}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1"
                    >
                      Export Print-Ready book <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Wizard Step 8: Print-Ready Export */}
              {wizardStep === 8 && activeBook && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <PDFExportDialog book={activeBook} />

                  <div className="pt-4 border-t border-slate-200 flex justify-between">
                    <button
                      onClick={() => setWizardStep(7)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
                    >
                      Back to Preview
                    </button>
                    <button
                      onClick={() => setActiveTab("books")}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow transition"
                    >
                      View in My Books
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* --- TAB 3: MY BOOKS --- */}
          {activeTab === "books" && (
            <motion.div
              key="books-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-xl font-black text-slate-800">Your Compiled Books</h3>
                <p className="text-xs text-slate-500 mt-1">Browse, read, edit or print your personalized children's adventure library.</p>
              </div>

              {books.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 font-semibold shadow-sm">
                  Your library is currently empty. Run the Story Wizard to build your first book!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {books.map((book) => (
                    <div
                      key={book.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition hover:shadow-md"
                    >
                      <div className="aspect-[16/10] bg-gradient-to-br from-emerald-600 to-slate-900 text-white p-5 flex flex-col justify-between border-b border-slate-200 select-none">
                        <div>
                          <span className="text-[9px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">
                            Custom Book
                          </span>
                          <h4 className="font-extrabold text-base mt-2 line-clamp-1">{book.title}</h4>
                          <p className="text-xs text-slate-300 italic line-clamp-1">{book.coverTitle}</p>
                        </div>
                        <span className="text-4xl text-center">📖</span>
                      </div>
                      <div className="p-4 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Child: {book.childName}</span>
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => {
                              setActiveBook(book);
                              setCreatedCharacter(characters.find((c) => c.id === book.characterId) || null);
                              setSelectedTemplateId(book.templateId);
                              setSelectedStyle(book.style);
                              setWizardStep(7); // Jump directly to Flip Book preview
                              setActiveTab("wizard");
                            }}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Open Book
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="text-slate-400 hover:text-red-500 transition"
                            title="Delete Book"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* --- TAB 4: TEMPLATE CONFIGS --- */}
          {activeTab === "templates" && (
            <motion.div
              key="templates-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <TemplateConfig
                templates={templates}
                onSaveTemplate={handleSaveTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            </motion.div>
          )}

          {/* --- TAB 5: CHARACTERS --- */}
          {activeTab === "characters" && (
            <motion.div
              key="characters-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-xl font-black text-slate-800">Character Model Sheets</h3>
                <p className="text-xs text-slate-500 mt-1">Review the AI-generated model sheets created for your profiles.</p>
              </div>

              {characters.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 font-semibold shadow-sm">
                  No character profiles created. Start a new book inside the Story Wizard!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex gap-2.5 items-center">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold">
                            👤
                          </div>
                          <div>
                            <h5 className="font-extrabold text-slate-800 text-sm">{char.name}</h5>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{char.age} y/o {char.gender}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 leading-normal line-clamp-3 italic">
                          &ldquo;{char.description}&rdquo;
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setCreatedCharacter(char);
                            setWizardStep(2); // Character Sheet steps
                            setActiveTab("wizard");
                          }}
                          className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Poses Sheet
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/characters/${char.id}`, { method: "DELETE" });
                            fetchCharacters();
                          }}
                          className="text-slate-400 hover:text-red-500 transition"
                          title="Delete Character Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* --- TAB 6: JOBS MONITOR --- */}
          {activeTab === "jobs" && (
            <motion.div
              key="jobs-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-xl font-black text-slate-800">Job Trace Tracker</h3>
                <p className="text-xs text-slate-500 mt-1">Real-time status of AI pipelines and export compilations.</p>
              </div>

              {jobs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 font-semibold shadow-sm">
                  No queue tasks trace logged.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <th className="p-4">Job ID</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Progress</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-mono text-xs font-bold text-slate-600">{job.id}</td>
                          <td className="p-4 font-semibold text-slate-700">{job.type}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 border border-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${job.progress}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{job.progress}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              job.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : job.status === "Generating"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : job.status === "Failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-400">
                            {new Date(job.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* --- TAB 7: SYSTEM SETTINGS --- */}
          {activeTab === "settings" && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <SystemSettings />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
