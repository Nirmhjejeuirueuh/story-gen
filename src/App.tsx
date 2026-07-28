/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
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
  AlertCircle,
  Library,
  LogOut
} from "lucide-react";

import { Character, Book, Job, JobType } from "./types.js";
import ImageUploader from "./components/ImageUploader.tsx";
import CharacterSheetViewer from "./components/CharacterSheetViewer.tsx";
import StoryEditor from "./components/StoryEditor.tsx";
import BookPreview from "./components/BookPreview.tsx";
import ImageGenerationStatus from "./components/ImageGenerationStatus.tsx";
import PDFExportDialog from "./components/PDFExportDialog.tsx";
import SystemSettings from "./components/SystemSettings.tsx";
import StoryLibraryBrowser from "./components/StoryLibraryBrowser.tsx";
import { useAuth } from "./auth/AuthContext.tsx";

type Tab = "dashboard" | "wizard" | "books" | "characters" | "jobs" | "settings" | "library";

export default function App() {
  // Authenticated user (drives admin-only UI + the sign-out control)
  const { user, isAdmin, logout } = useAuth();

  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Entities state
  const [characters, setCharacters] = useState<Character[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
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
  const [charPersonality, setCharPersonality] = useState("Cheerful and Adventurous");
  const [charAdditionalNotes, setCharAdditionalNotes] = useState("");
  
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null);
  const [charSheetJobId, setCharSheetJobId] = useState<string | null>(null);
  const [charSetupMode, setCharSetupMode] = useState<"new" | "existing">("new");

  const [activeBook, setActiveBook] = useState<Book | null>(null);

  const [isRegeneratingPageId, setIsRegeneratingPageId] = useState<number | null>(null);

  // Poll for active jobs
  useEffect(() => {
    fetchCharacters();
    fetchBooks();
    fetchJobs();

    const interval = setInterval(() => {
      fetchJobs();
      // If we are waiting on a job, fetch updates for character/book
      if (charSheetJobId) {
        checkCharSheetStatus();
      }
      if (activeBook) {
        refreshActiveBook();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [charSheetJobId, activeBook?.id]);

  // Adaptive fast polling: while the active book still has illustrations queued or
  // generating, refresh it every 1.5s so page statuses (Queued → Drawing → Ready)
  // update live. Stops automatically once every page has finished rendering.
  const activeBookHasPendingPages =
    !!activeBook?.pages?.some((p) => p.imageStatus === "Queued" || p.imageStatus === "Generating") ||
    activeBook?.coverImageStatus === "Queued" ||
    activeBook?.coverImageStatus === "Generating";
  useEffect(() => {
    if (!activeBook?.id || !activeBookHasPendingPages) return;
    const fastInterval = setInterval(() => {
      refreshActiveBook();
      fetchJobs();
    }, 1500);
    return () => clearInterval(fastInterval);
  }, [activeBook?.id, activeBookHasPendingPages]);

  // Auto-start batch illustration rendering when the wizard lands on Step 6.
  // Pages are created with imageStatus "Queued", but no image job actually exists until
  // POST /api/books/:id/generate is called — previously only the manual "Draw" button did
  // that, so the pipeline sat at 0% until the user clicked it. Fire it automatically exactly
  // once per book (guarded by a ref) when every page is still untouched ("Queued", no image).
  const autoStartedBookIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (wizardStep !== 6 || activeTab !== "wizard" || !activeBook?.id) return;
    if (autoStartedBookIdsRef.current.has(activeBook.id)) return;
    const pages = activeBook.pages || [];
    const allUntouched = pages.length > 0 && pages.every((p) => p.imageStatus === "Queued" && !p.imageUrl);
    if (allUntouched) {
      autoStartedBookIdsRef.current.add(activeBook.id);
      handleBatchDrawIllustrations();
    }
  }, [wizardStep, activeTab, activeBook?.id, activeBook?.pages]);

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

  // --- ACTIONS ---

  // Delete books
  const handleDeleteBook = async (id: string) => {
    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Couldn't delete this storybook. You can only delete books you created yourself.");
        return;
      }
      fetchBooks();
      if (activeBook?.id === id) setActiveBook(null);
    } catch (err) {
      console.error("Failed to delete book:", err);
      alert("Couldn't delete this storybook — check your connection and try again.");
    }
  };

  // Create a book from a Story Library entry. Optionally stars an uploaded character as the
  // MAIN_CHARACTER hero (personalized illustrations + name); otherwise uses the story's cast.
  const [isCreatingFromLibrary, setIsCreatingFromLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryHeroCharacterId, setLibraryHeroCharacterId] = useState<string>("");
  const [libraryHeroName, setLibraryHeroName] = useState<string>("");
  const [artStyles, setArtStyles] = useState<{ id: string; label: string }[]>([{ id: "vintage-watercolor", label: "Vintage Watercolor" }]);
  const [libraryStyleId, setLibraryStyleId] = useState<string>("vintage-watercolor");
  useEffect(() => {
    fetch("/api/styles")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (Array.isArray(data) && data.length) setArtStyles(data); })
      .catch(() => {});
  }, []);
  const handleCreateFromLibrary = async (libraryStoryId: string) => {
    setIsCreatingFromLibrary(true);
    setLibraryError(null);
    try {
      const hero = characters.find((c) => c.id === libraryHeroCharacterId) || null;
      const heroName = libraryHeroName.trim() || hero?.name || "";
      const res = await fetch("/api/books/from-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryStoryId,
          characterId: hero?.id || undefined,
          childName: heroName || undefined,
          styleId: libraryStyleId,
        }),
      });
      const contentType = res.headers.get("content-type");
      const data = (contentType && contentType.includes("application/json")) ? await res.json() : null;
      if (!res.ok || !data) throw new Error(data?.error || "Failed to create storybook from library.");

      setActiveBook(data.book);
      setCreatedCharacter(hero);
      fetchBooks();
      setWizardStep(6); // Straight to illustration rendering
      setActiveTab("wizard");
    } catch (err: any) {
      setLibraryError(err.message);
    } finally {
      setIsCreatingFromLibrary(false);
    }
  };

  // Wizard step 3: the created character stars in the chosen Story Library story (their
  // photo-based sheet conditions the illustrations). Jumps straight to rendering.
  const handleWizardSelectStory = async (libraryStoryId: string) => {
    if (!createdCharacter) {
      setWizardError("Please create a character first.");
      return;
    }
    setIsCreatingFromLibrary(true);
    setLibraryError(null);
    try {
      const res = await fetch("/api/books/from-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryStoryId,
          characterId: createdCharacter.id,
          childName: createdCharacter.name,
          styleId: libraryStyleId,
        }),
      });
      const ct = res.headers.get("content-type");
      const data = (ct && ct.includes("application/json")) ? await res.json() : null;
      if (!res.ok || !data) throw new Error(data?.error || "Failed to create storybook.");
      setActiveBook(data.book);
      fetchBooks();
      setWizardStep(6); // straight to illustration rendering
      setActiveTab("wizard");
    } catch (err: any) {
      setLibraryError(err.message);
    } finally {
      setIsCreatingFromLibrary(false);
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
      setWizardStep(2); // Jump to Character sheet view step
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSheet = async (approved: boolean) => {
    if (!activeSheet) return;
    try {
      const approveRes = await fetch(`/api/character-sheet/${activeSheet.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });

      const contentType = approveRes.headers.get("content-type");
      if (approveRes.ok && contentType && contentType.includes("application/json")) {
        const data = await approveRes.json();
        setActiveSheet(data.sheet);
        if (approved) setWizardStep(3); // Forward to Story Book Template
      }
    } catch (err) {
      console.error("Failed to approve sheet:", err);
    }
  };

  const handleRegenerateSheet = async () => {
    if (!createdCharacter) return;
    try {
      const res = await fetch(`/api/characters/${createdCharacter.id}/regenerate-sheet`, { method: "POST" });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setCharSheetJobId(data.jobId);
      }
    } catch (err) {
      console.error("Failed to regenerate character sheet:", err);
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

  // On-demand front-cover generation. Optimistically flips the book to "Queued" so the button
  // shows "Designing cover…" immediately; the poll loop then picks up the rendered image.
  const handleGenerateCover = async () => {
    if (!activeBook) return;
    setActiveBook({ ...activeBook, coverImageStatus: "Queued", coverImageError: undefined });
    try {
      await fetch(`/api/books/${activeBook.id}/generate-cover`, { method: "POST" });
      refreshActiveBook();
    } catch (err) {
      console.error("Cover generation trigger failed:", err);
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
    setCharSetupMode(characters.length > 0 ? "existing" : "new");
    setActiveBook(null);
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
              onClick={() => setActiveTab("library")}
              className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                activeTab === "library" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Library className="h-4 w-4" /> Story Library
            </button>
            {/* Config & Prompts (AI-template editor) retired — the Story Library is now the single source of stories. */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full p-3 rounded-xl font-bold text-sm flex items-center gap-3 transition ${
                  activeTab === "settings" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Settings className="h-4 w-4" /> System Settings
              </button>
            )}
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

        {/* Footer: signed-in user + sign out */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 uppercase">
              {(user?.displayName || user?.email || "?").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.displayName || "Signed in"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}{isAdmin ? " • Admin" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-slate-400 hover:bg-slate-800/50 hover:text-white transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
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
                        <div className="aspect-[16/10] relative overflow-hidden bg-slate-900 text-white border-b border-slate-200 select-none">
                          {book.coverImageStatus === "Completed" && book.coverImageUrl ? (
                            <>
                              <img src={book.coverImageUrl} alt={book.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                              <span className="absolute top-3 left-3 text-[9px] font-black uppercase bg-black/50 px-2 py-0.5 rounded-full text-emerald-300">
                                Compiled Book
                              </span>
                            </>
                          ) : (
                            <div className="absolute inset-0 p-5 flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] font-black uppercase bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">
                                  Compiled Book
                                </span>
                                <h5 className="font-extrabold text-base mt-2 line-clamp-1">{book.title}</h5>
                                <p className="text-xs text-slate-300 italic line-clamp-1">{book.coverTitle}</p>
                              </div>
                              <span className="text-3xl text-center">📖</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex justify-between items-center bg-slate-50">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Child: {book.childName}
                          </div>
                          <button
                            onClick={() => {
                              setActiveBook(book);
                              setCreatedCharacter(characters.find((c) => c.id === book.characterId) || null);
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
                  { num: 1, label: "Character" },
                  { num: 2, label: "Character Sheet" },
                  { num: 3, label: "Choose Story" },
                  { num: 6, label: "Render Illustrations" },
                  { num: 7, label: "Book Preview" },
                  { num: 8, label: "Print Ready" },
                ].map((step, i) => {
                  const num = step.num;
                  const displayNum = i + 1;
                  const isActive = wizardStep === num;
                  const isPast = wizardStep > num;
                  return (
                    <div
                      key={step.num}
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
                        {displayNum}
                      </span>
                      <span>{step.label}</span>
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
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
                        Step 1: Choose Your Character
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {charSetupMode === "existing"
                          ? "Reuse a previously generated character reference sheet to start a new storybook instantly."
                          : "Our system will analyze these reference photos to draw a consistent character sheet. No AI training required!"}
                      </p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit shrink-0">
                      <button
                        onClick={() => setCharSetupMode("existing")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                          charSetupMode === "existing" ? "bg-white shadow text-emerald-700" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Use Existing Character
                      </button>
                      <button
                        onClick={() => setCharSetupMode("new")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                          charSetupMode === "new" ? "bg-white shadow text-emerald-700" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Create New Character
                      </button>
                    </div>
                  </div>

                  {charSetupMode === "existing" ? (
                    <div className="space-y-4">
                      {characters.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center text-slate-400 font-semibold">
                          No existing character profiles yet. Switch to &ldquo;Create New Character&rdquo; to get started.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {characters.map((char) => (
                            <button
                              key={char.id}
                              onClick={() => {
                                setCreatedCharacter(char);
                                setCharSheetJobId(null);
                                setWizardStep(2);
                              }}
                              className="text-left bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-4 transition space-y-2.5"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold shrink-0">
                                  👤
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-extrabold text-slate-800 text-sm truncate">{char.name}</h5>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">{char.age} y/o {char.gender}</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 leading-normal line-clamp-2 italic">
                                &ldquo;{char.description}&rdquo;
                              </p>
                              <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                char.characterSheetId ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {char.characterSheetId ? "Reference Sheet Ready" : "Sheet Not Generated"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                  <>
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
                          📸 Photo-Driven Likeness
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Upload a clear photo of the child — the AI builds their character sheet from it, capturing their real hair, skin tone, and features. <strong>A photo is strongly recommended</strong> for an accurate likeness.
                        </p>
                      </div>
                    </div>

                    {/* Middle Column: Detailed Visual Style Attributes */}
                    <div className="lg:col-span-1 space-y-4 bg-slate-50/40 p-4 rounded-3xl border border-slate-100">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Optional Details</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        The child's appearance — hair (braids, curls, anything), skin tone, eye colour, features — is captured automatically from the uploaded photo. No need to pick from lists. Add a note below only for details a photo can't show.
                      </p>

                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-500">Personality Traits (Optional)</label>
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

                    {/* Right Column: Reference Photo (drives the character's appearance) */}
                    <div className="lg:col-span-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Reference Photo</span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">Recommended</span>
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
                  </>
                  )}
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
                    onRegenerate={handleRegenerateSheet}
                    isGenerating={!!charSheetJobId}
                  />

                  {activeSheet?.approved && (
                    <div className="flex justify-end pt-4 border-t border-slate-200">
                      <button
                        onClick={() => setWizardStep(3)}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1"
                      >
                        Choose Story Book Template <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Wizard Step 3: Story Book Template selector */}
              {wizardStep === 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pick a story for <strong className="text-slate-700">{createdCharacter?.name}</strong> to star in — their photo-based character sheet is used automatically so they look consistent on every page.
                      </p>
                      <button
                        onClick={() => setWizardStep(2)}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition whitespace-nowrap"
                      >
                        Back
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Art Style</label>
                      <select
                        value={libraryStyleId}
                        onChange={(e) => setLibraryStyleId(e.target.value)}
                        className="w-full sm:w-64 text-sm p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                      >
                        {artStyles.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {libraryError && (
                    <div className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">{libraryError}</div>
                  )}
                  <StoryLibraryBrowser onCreate={handleWizardSelectStory} isCreating={isCreatingFromLibrary} />
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
                      onClick={() => setWizardStep(3)}
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
                  <BookPreview book={activeBook} onGenerateCover={handleGenerateCover} />

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

          {/* --- TAB: STORY LIBRARY (fixed-cast, filesystem-authored storybooks) --- */}
          {activeTab === "library" && (
            <motion.div
              key="library-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {libraryError && (
                <div className="flex items-center gap-2.5 p-4 bg-red-50 text-red-800 border border-red-100 rounded-2xl text-sm font-semibold">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{libraryError}</span>
                  <button onClick={() => setLibraryError(null)} className="ml-auto font-bold">✕</button>
                </div>
              )}

              {/* Optional hero personalization applied to any story created below */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                    <Sparkles className="h-5 w-5 text-emerald-600" /> Personalize the hero (optional)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Star an uploaded character as the <strong>MAIN_CHARACTER</strong> hero of any story below — their photo shapes the illustrations and their name fills the text. Leave blank for the generic version with the story&apos;s own cast.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Hero Character</label>
                    <select
                      value={libraryHeroCharacterId}
                      onChange={(e) => {
                        setLibraryHeroCharacterId(e.target.value);
                        const c = characters.find((ch) => ch.id === e.target.value);
                        if (c && !libraryHeroName.trim()) setLibraryHeroName(c.name);
                      }}
                      className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                    >
                      <option value="">— None (use the story&apos;s own cast) —</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.age} y/o {c.gender}){c.characterSheetId ? " • sheet ready" : ""}
                        </option>
                      ))}
                    </select>
                    {characters.length === 0 && (
                      <p className="text-[11px] text-slate-400">No characters yet — create one in the Story Wizard (upload a photo) to personalize.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Hero Name (shown in the story text)</label>
                    <input
                      type="text"
                      placeholder="e.g. Liam"
                      value={libraryHeroName}
                      onChange={(e) => setLibraryHeroName(e.target.value)}
                      className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Art Style</label>
                    <select
                      value={libraryStyleId}
                      onChange={(e) => setLibraryStyleId(e.target.value)}
                      className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                    >
                      {artStyles.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {libraryHeroCharacterId && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Stories created below will star {libraryHeroName.trim() || "this character"} as the hero.</span>
                  </div>
                )}
              </div>

              <StoryLibraryBrowser onCreate={handleCreateFromLibrary} isCreating={isCreatingFromLibrary} />
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
                      <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-emerald-600 to-slate-900 text-white border-b border-slate-200 select-none">
                        {book.coverImageStatus === "Completed" && book.coverImageUrl ? (
                          <>
                            <img src={book.coverImageUrl} alt={book.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                            <span className="absolute top-3 left-3 text-[9px] font-bold uppercase bg-black/50 px-2 py-0.5 rounded-full">
                              Custom Book
                            </span>
                          </>
                        ) : (
                          <div className="absolute inset-0 p-5 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">
                                Custom Book
                              </span>
                              <h4 className="font-extrabold text-base mt-2 line-clamp-1">{book.title}</h4>
                              <p className="text-xs text-slate-300 italic line-clamp-1">{book.coverTitle}</p>
                            </div>
                            <span className="text-4xl text-center">📖</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Child: {book.childName}</span>
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => {
                              setActiveBook(book);
                              setCreatedCharacter(characters.find((c) => c.id === book.characterId) || null);
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
