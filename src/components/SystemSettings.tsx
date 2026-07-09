/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Settings, Check, Key, Cpu, Eye, EyeOff, Shield, Info, Sparkles, Image, CheckCircle2, Sliders, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { SystemSettings as ISystemSettings } from "../types.js";

export default function SystemSettings() {
  const [settings, setSettings] = useState<ISystemSettings>({
    textProvider: "gemini",
    imageProvider: "gemini",
    geminiApiKey: "",
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini",
    openaiImageModel: "gpt-image-1"
  });

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setSettings({
            textProvider: data.textProvider || "gemini",
            imageProvider: data.imageProvider || "gemini",
            geminiApiKey: data.geminiApiKey || "",
            openaiApiKey: data.openaiApiKey || "",
            openaiModel: data.openaiModel || "gpt-4o-mini",
            openaiImageModel: data.openaiImageModel || "dall-e-3"
          });
        } else {
          throw new Error("Server returned a non-JSON response. Ensure you are authorized.");
        }
      } else {
        throw new Error("Failed to load settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setSaveSuccess(true);
          if (data.settings) {
            setSettings(data.settings);
          }
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          throw new Error("Server returned a non-JSON response. Ensure you are authorized.");
        }
      } else {
        throw new Error("Failed to save settings to repository.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-8 max-w-4xl mx-auto" id="system-settings-panel">
      {/* Header controls */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-1.5">
            <Settings className="h-5 w-5 text-emerald-600" /> Multi-Provider System Settings
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Configure your preferred API engines, custom models, and access credentials.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 text-red-800 border border-red-100 rounded-2xl text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Row 1: Engine Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-emerald-600" /> Story Writing Provider
            </h5>
            <p className="text-xs text-slate-500 pb-2">Select which AI writing assistant designs your story books and narrates chapters.</p>
            <select
              value={settings.textProvider}
              onChange={(e) => setSettings({ ...settings, textProvider: e.target.value as any })}
              className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-1 focus:ring-emerald-500"
            >
              <option value="gemini">Google Gemini AI (gemini-3.5-flash)</option>
              <option value="openai">OpenAI ChatGPT (gpt-4o-mini / custom)</option>
            </select>
          </div>

          <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Image className="h-4 w-4 text-emerald-600" /> Illustration Drawing Provider
            </h5>
            <p className="text-xs text-slate-500 pb-2">Select the illustration suite responsible for rendering character reference sheets and page drawings.</p>
            <select
              value={settings.imageProvider}
              onChange={(e) => setSettings({ ...settings, imageProvider: e.target.value as any })}
              className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-1 focus:ring-emerald-500"
            >
              <option value="gemini">Google Imagen (gemini-3.1-flash-lite-image)</option>
              <option value="openai">OpenAI Image Engine (gpt-image-1 / custom)</option>
              <option value="procedural">Procedural Vector Artwork (No-Key Offline Sandbox)</option>
            </select>
          </div>
        </div>

        {/* Section 2: Gemini Setup */}
        <div className="space-y-4 border border-slate-100 p-5 rounded-2xl">
          <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Google Gemini API Credentials
          </h5>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini API Token Key</label>
            <div className="relative">
              <input
                type={showGeminiKey ? "text" : "password"}
                placeholder={settings.geminiApiKey ? "••••••••••••••••••••••••" : "Paste your Gemini API key (starts with AIza...)"}
                value={settings.geminiApiKey}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                className="w-full text-sm p-3 pr-10 border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-emerald-500 font-mono font-medium"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 p-3 bg-indigo-50/50 text-indigo-800 text-xs rounded-xl border border-indigo-100/30">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
            <p>
              <strong>Tip:</strong> If left blank, Gemini will fall back to the workspace secret key (environment variable). You can create free, high-limit Gemini API keys on Google AI Studio.
            </p>
          </div>
        </div>

        {/* Section 3: OpenAI Setup */}
        <div className="space-y-4 border border-slate-100 p-5 rounded-2xl">
          <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-emerald-600" /> OpenAI / ChatGPT Engine Configuration
          </h5>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">OpenAI API Key Token</label>
            <div className="relative">
              <input
                type={showOpenaiKey ? "text" : "password"}
                placeholder={settings.openaiApiKey ? "••••••••••••••••••••••••" : "sk-..."}
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                className="w-full text-sm p-3 pr-10 border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-emerald-500 font-mono font-medium"
              />
              <button
                type="button"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ChatGPT Text Model</label>
              <select
                value={settings.openaiModel}
                onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:ring-1 focus:ring-emerald-500"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended - Ultra fast &amp; cheap)</option>
                <option value="gpt-4o">gpt-4o (Premium reasoning &amp; detail)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy standard)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">OpenAI Image Model</label>
              <select
                value={settings.openaiImageModel}
                onChange={(e) => setSettings({ ...settings, openaiImageModel: e.target.value })}
                className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:ring-1 focus:ring-emerald-500"
              >
                <option value="gpt-image-1">gpt-image-1 (Recommended - Highly detailed children illustrations)</option>
                <option value="gpt-image-1-mini">gpt-image-1-mini (Fast, simpler cartoon style)</option>
                <option value="gpt-image-1.5">gpt-image-1.5 (Higher fidelity)</option>
                <option value="gpt-image-2">gpt-image-2 (Latest, highest quality)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Button and Status Feedback */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-100"
              >
                <CheckCircle2 className="h-4 w-4" /> Preferences Saved Successfully!
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition shadow flex items-center gap-1.5"
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-4 w-4" /> Save System Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
