/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Book } from "../types.js";
import { FileDown, Archive, Sparkles, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

interface PDFExportDialogProps {
  book: Book;
}

export default function PDFExportDialog({ book }: PDFExportDialogProps) {
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingZIP, setExportingZIP] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerPDFGeneration = async (isPrintReady: boolean) => {
    setExportingPDF(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Create jsPDF document: 800x500 landscape layout matching landscape book size
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [800, 500],
      });

      // 1. Draw cover page
      doc.setFillColor(16, 185, 129); // Emerald cover fill
      doc.rect(0, 0, 800, 500, "F");

      // Draw spine lines
      doc.setDrawColor(4, 120, 87);
      doc.setLineWidth(5);
      doc.line(10, 0, 10, 500);

      // Book Titles
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(36);
      doc.text(book.title, 400, 180, { align: "center" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(18);
      doc.text(book.coverTitle || "", 400, 220, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("📖", 400, 300, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Starring: ${book.childName}  •  Style: ${book.style}`, 400, 420, { align: "center" });

      // 2. Loop through pages and add to PDF
      for (const page of book.pages) {
        doc.addPage([800, 500], "landscape");

        // Split sheet into left half (image) and right half (story text)
        doc.setFillColor(248, 250, 252); // Soft gray left
        doc.rect(0, 0, 400, 500, "F");

        // Set page text half on right
        doc.setFillColor(255, 255, 255); // White right
        doc.rect(400, 0, 400, 500, "F");

        // Draw image on left
        if (page.imageUrl) {
          try {
            // Embed image
            doc.addImage(page.imageUrl, "JPEG", 20, 40, 360, 360);
          } catch (imgErr) {
            console.warn(`Could not draw image for page ${page.pageNumber} in PDF. drawing placeholder.`, imgErr);
            doc.setDrawColor(203, 213, 225);
            doc.rect(20, 40, 360, 360);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.setTextColor(148, 163, 184);
            doc.text("Illustration Drawing placeholder", 200, 220, { align: "center" });
          }
        } else {
          doc.setDrawColor(203, 213, 225);
          doc.rect(20, 40, 360, 360);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(148, 163, 184);
          doc.text("No illustration compiled", 200, 220, { align: "center" });
        }

        // Draw page text on right
        doc.setTextColor(30, 41, 59); // Charcoal
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        
        const splitText = doc.splitTextToSize(page.storyText, 320);
        doc.text(splitText, 440, 180);

        // Page numbering
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(10);
        doc.text(`Page ${page.pageNumber}`, 600, 460, { align: "center" });
      }

      // Save compiled PDF
      const filename = `${book.title.toLowerCase().replace(/\s+/g, "_")}_storybook.pdf`;
      doc.save(filename);

      setSuccessMsg(`Your landscape children's book PDF "${filename}" compiled successfully!`);
    } catch (error: any) {
      console.error("PDF compiling failed:", error);
      setErrorMsg("Failed to generate PDF document: " + error.message);
    } finally {
      setExportingPDF(false);
    }
  };

  const triggerZIPGeneration = async () => {
    setExportingZIP(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const zip = new JSZip();

      // Compile raw text index
      let txtContent = `STORYBOOK INDEX: ${book.title}\n`;
      txtContent += `Starring: ${book.childName}\n`;
      txtContent += `Illustration style: ${book.style}\n`;
      txtContent += `=====================================\n\n`;

      book.pages.forEach((p) => {
        txtContent += `PAGE ${p.pageNumber}:\n`;
        txtContent += `${p.storyText}\n`;
        txtContent += `Illustration prompt used: ${p.illustrationPrompt}\n`;
        txtContent += `-------------------------------------\n\n`;
      });

      zip.file("story_script.txt", txtContent);

      // Add base64 images
      const imgFolder = zip.folder("illustrations");
      if (imgFolder) {
        book.pages.forEach((p) => {
          if (p.imageUrl && p.imageUrl.startsWith("data:")) {
            const commaIndex = p.imageUrl.indexOf(",");
            const base64Data = p.imageUrl.substring(commaIndex + 1);
            const ext = p.imageUrl.includes("image/png") ? "png" : "jpg";
            imgFolder.file(`page_${p.pageNumber}_illustration.${ext}`, base64Data, { base64: true });
          }
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const filename = `${book.title.toLowerCase().replace(/\s+/g, "_")}_illustrations.zip`;

      // Trigger standard browser download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = filename;
      link.click();

      setSuccessMsg(`Your illustrations archive "${filename}" compiled and downloaded successfully!`);
    } catch (error: any) {
      console.error("ZIP packaging failed:", error);
      setErrorMsg("Failed to create ZIP package: " + error.message);
    } finally {
      setExportingZIP(false);
    }
  };

  const pagesCompleted = book.pages.filter((p) => p.imageStatus === "Completed").length;
  const isReady = pagesCompleted === book.pages.length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="pdf-export-dialog">
      <div>
        <h4 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
          <FileText className="h-5 w-5 text-emerald-600" /> Print &amp; Compile storybook assets
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Compile your final, approved storybook chapters into ready-to-print landscape files or raw archives.
        </p>
      </div>

      {/* Warning if pages are still rendering */}
      {!isReady && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span>Warning: Only {pagesCompleted} of {book.pages.length} illustrations are completed.</span>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5">
              Exporting now will result in placeholder blanks for incomplete pages. We recommend finishing all drawings in Step 6 first!
            </p>
          </div>
        </div>
      )}

      {/* Success/Error displays */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-100 font-bold">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-xl text-xs border border-red-100 font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Export Button Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Landscape storybook PDF */}
        <button
          onClick={() => triggerPDFGeneration(false)}
          disabled={exportingPDF}
          className="p-5 border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 rounded-2xl text-left transition-all hover:scale-[1.01] flex flex-col justify-between group disabled:opacity-50"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileDown className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-black uppercase text-slate-400">PDF FORMAT</span>
          </div>
          <div className="mt-4">
            <h5 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">
              {exportingPDF ? "Compiling PDF Book..." : "High-Res Storybook PDF"}
            </h5>
            <p className="text-xs text-slate-500 mt-1">
              Creates a beautiful landscape presentation format containing your double-page spread layouts.
            </p>
          </div>
        </button>

        {/* ZIP Illustrations bundle */}
        <button
          onClick={triggerZIPGeneration}
          disabled={exportingZIP}
          className="p-5 border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 rounded-2xl text-left transition-all hover:scale-[1.01] flex flex-col justify-between group disabled:opacity-50"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-xl">
              <Archive className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-black uppercase text-slate-400">ZIP PACKAGE</span>
          </div>
          <div className="mt-4">
            <h5 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">
              {exportingZIP ? "Packing Illustrations..." : "Download Illustrations ZIP"}
            </h5>
            <p className="text-xs text-slate-500 mt-1">
              Downloads a zip archive containing all individual page illustrations as full-size high-res images and index.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
