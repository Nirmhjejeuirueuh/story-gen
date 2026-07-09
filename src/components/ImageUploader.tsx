/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageUploaderProps {
  onImagesSelected: (base64Images: string[]) => void;
  maxImages?: number;
  minImages?: number;
}

export default function ImageUploader({
  onImagesSelected,
  maxImages = 10,
  minImages = 1,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ id: string; url: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setError("Please select valid image files (PNG, JPEG, etc.).");
      return;
    }

    if (previews.length + validFiles.length > maxImages) {
      setError(`You can upload a maximum of ${maxImages} reference photos.`);
      return;
    }

    const loadPromises = validFiles.map((file) => {
      return new Promise<{ id: string; url: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: `img_${Math.random().toString(36).substring(2, 9)}`,
            url: reader.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loadPromises).then((newImages) => {
      const updatedPreviews = [...previews, ...newImages];
      setPreviews(updatedPreviews);
      onImagesSelected(updatedPreviews.map((p) => p.url));
      
      if (updatedPreviews.length < minImages) {
        setError(`Please upload at least ${minImages} photos (current: ${updatedPreviews.length}) for robust face analysis.`);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const removeImage = (id: string) => {
    const updated = previews.filter((p) => p.id !== id);
    setPreviews(updated);
    onImagesSelected(updated.map((p) => p.url));
    if (updated.length < minImages) {
      setError(`Please upload at least ${minImages} photos (current: ${updated.length}) for robust character analysis.`);
    }
  };

  return (
    <div className="space-y-4" id="image-uploader-container">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? "border-emerald-500 bg-emerald-50/50"
            : "border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-white rounded-full shadow-sm text-slate-500">
            <Upload className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-lg">
              Drag &amp; Drop photos of the child
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or <span className="text-emerald-600 font-medium hover:underline">browse your computer</span>
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Upload {minImages}-{maxImages} clear, well-lit portraits or candid photos
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {previews.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-emerald-600" />
              Uploaded References ({previews.length} of {maxImages})
            </h4>
            {previews.length >= minImages && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                Ready to generate
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 p-3 bg-slate-100/50 rounded-xl border border-slate-200">
            {previews.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 shadow-sm">
                <img
                  src={img.url}
                  alt="Child Reference Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700 shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
