import axios from "axios";
import { useState, useRef, useEffect } from "react";
import DocumentInspector from "./DocumentInspector";
import Toast from "./Toast";
import { UploadIcon } from "./Icons";

const API = process.env.NEXT_PUBLIC_API_URL!;

type FileUploaderProps = {
  onUploaded?: (docId: string, fileName: string, type?: "pdf" | "image" | "text") => void;
  existingNames?: string[];
  activeDocName?: string | null;
};

type LocalDoc = {
  name: string;
  file: File;
  url: string;
};

export default function FileUploader({
  onUploaded,
  existingNames,
  activeDocName,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [localDocs, setLocalDocs] = useState<LocalDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!activeDocName) return;
    const match = localDocs.find(d => d.name === activeDocName);
    if (!match) {
      setShowPreview(false);
      return;
    }
    setSelectedFile(match.file);
    setPreviewUrl(match.url);
  }, [activeDocName, localDocs]);

  const processFile = async (file: File) => {
    if (existingNames?.includes(file.name)) {
      setToast({ message: "This file has already been uploaded.", type: "error" });
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setUploading(true);
    try {
      const res = await axios.post(`${API}/upload`, form);
      const data = res.data as { doc_id?: string; file_name?: string };
      const fileName = data.file_name ?? file.name;
      const docType = file.type === "application/pdf" ? "pdf" : file.type.startsWith("image/") ? "image" : "text";

      if (data.doc_id && onUploaded) {
        onUploaded(data.doc_id, fileName, docType);
      }

      const url = URL.createObjectURL(file);
      setLocalDocs(prev => [...prev, { name: file.name, file, url }]);
      setSelectedFile(file);
      setPreviewUrl(url);
      setShowPreview(false);
      setToast({ message: `"${fileName}" indexed successfully.`, type: "success" });
    } catch {
      setToast({ message: "Upload failed. Please try again.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  return (
    <div className="uploader">
      <div
        className={
          "upload-dropzone" +
          (dragOver ? " drag-over" : "") +
          (uploading ? " uploading" : "")
        }
        onClick={openPicker}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openPicker(); }}
      >
        <div className="upload-dropzone-icon">
          <UploadIcon />
        </div>
        <span className="upload-dropzone-title">
          {uploading ? "Uploading & indexing..." : "Drop file here or click to upload"}
        </span>
        <span className="upload-dropzone-hint">PDF documents and images supported</span>
        <span className="upload-dropzone-formats">.pdf · .png · .jpg · .webp</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={upload}
          className="uploader-input"
        />
      </div>

      {selectedFile && (
        <div className="uploader-actions">
          <button type="button" className="uploader-secondary" onClick={openPicker}>
            Upload another
          </button>
          <button
            type="button"
            className="uploader-secondary"
            onClick={() => setShowPreview(p => !p)}
          >
            {showPreview ? "Hide preview" : "Preview document"}
          </button>
        </div>
      )}

      {selectedFile && showPreview && previewUrl && (
        <div className="uploader-preview">
          <DocumentInspector file={selectedFile} previewUrl={previewUrl} />
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
