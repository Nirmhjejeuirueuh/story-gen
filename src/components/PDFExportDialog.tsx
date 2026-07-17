/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Book } from "../types.js";
import { personalizeStoryText } from "../utils/personalize.js";
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
      // Fixed 1:1 square print canvas (8.5x8.5in @ 72pt/in) — matches the on-screen BookPreview's
      // square page ratio exactly, so the printed layout never diverges from what was previewed.
      const SIZE = 612;
      const MARGIN = 44;
      const CONTENT_W = SIZE - MARGIN * 2;
      const doc = new jsPDF({
        unit: "pt",
        format: [SIZE, SIZE],
      });

      // 1. Draw cover page (square)
      doc.setFillColor(109, 68, 23); // Warm brown, matches CoverFace gradient midtone
      doc.rect(0, 0, SIZE, SIZE, "F");
      doc.setDrawColor(230, 200, 150);
      doc.setLineWidth(1.5);
      doc.rect(14, 14, SIZE - 28, SIZE - 28);

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(30);
      doc.text(doc.splitTextToSize(book.title, CONTENT_W), SIZE / 2, SIZE / 2 - 60, { align: "center" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(15);
      doc.text(doc.splitTextToSize(book.coverTitle || "", CONTENT_W), SIZE / 2, SIZE / 2, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("📖", SIZE / 2, SIZE / 2 + 70, { align: "center" });

      doc.setFontSize(11);
      doc.text(`Starring ${book.childName}`, SIZE / 2, SIZE - 50, { align: "center" });

      // 2. Loop through pages — one square PDF page per book page, text stacked with the
      // illustration (never side-by-side), alternating top/bottom exactly like BookPreview's
      // textOnTop rule so the printed spread matches what the reader saw on screen.
      for (const page of book.pages) {
        doc.addPage([SIZE, SIZE]);
        doc.setFillColor(246, 239, 221); // Parchment
        doc.rect(0, 0, SIZE, SIZE, "F");

        const textOnTop = Math.floor((page.pageNumber - 1) / 2) % 2 === 0;
        const textZoneH = 210;
        const textY = textOnTop ? MARGIN : SIZE - MARGIN - textZoneH;
        const imageY = textOnTop ? textY + textZoneH + 16 : MARGIN;
        const imageH = SIZE - MARGIN * 2 - textZoneH - 16;

        // Chapter title, if authored for this page.
        let textCursorY = textY + 20;
        if (page.title) {
          doc.setTextColor(91, 67, 33);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(15);
          doc.text(doc.splitTextToSize(page.title, CONTENT_W), SIZE / 2, textCursorY, { align: "center" });
          textCursorY += 30;
        }

        // Story text (HTML on screen; plain vector text here — same words, same page).
        doc.setTextColor(58, 48, 36);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(13);
        const splitText = doc.splitTextToSize(personalizeStoryText(page.storyText, book.childName), CONTENT_W);
        doc.text(splitText, MARGIN, textCursorY);

        // Illustration — text-free artwork, drawn in its own reserved region.
        if (page.imageUrl) {
          try {
            doc.addImage(page.imageUrl, "JPEG", MARGIN, imageY, CONTENT_W, imageH);
          } catch (imgErr) {
            console.warn(`Could not draw image for page ${page.pageNumber} in PDF. drawing placeholder.`, imgErr);
            doc.setDrawColor(203, 178, 130);
            doc.rect(MARGIN, imageY, CONTENT_W, imageH);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(160, 140, 100);
            doc.text("Illustration drawing placeholder", SIZE / 2, imageY + imageH / 2, { align: "center" });
          }
        } else {
          doc.setDrawColor(203, 178, 130);
          doc.rect(MARGIN, imageY, CONTENT_W, imageH);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(160, 140, 100);
          doc.text("No illustration compiled", SIZE / 2, imageY + imageH / 2, { align: "center" });
        }

        // Page numbering
        doc.setTextColor(160, 140, 100);
        doc.setFontSize(9);
        doc.text(`${page.pageNumber}`, SIZE / 2, SIZE - 18, { align: "center" });
      }

      // Save compiled PDF
      const filename = `${book.title.toLowerCase().replace(/\s+/g, "_")}_storybook.pdf`;
      doc.save(filename);

      setSuccessMsg(`Your square children's book PDF "${filename}" compiled successfully!`);
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
        txtContent += `${personalizeStoryText(p.storyText, book.childName)}\n`;
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
          Compile your final, approved storybook chapters into ready-to-print square-page files or raw archives.
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
              Creates a print-ready square-page PDF (8.5&times;8.5in) matching the on-screen book preview exactly.
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
