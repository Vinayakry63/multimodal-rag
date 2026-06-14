import { useState } from "react";
import { FileIcon, ImageIcon } from "./Icons";

type DocumentInspectorProps = {
  file: File;
  previewUrl: string;
};

export default function DocumentInspector({ file, previewUrl }: DocumentInspectorProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "text" | "images" | "pages">("preview");
  const [zoomed, setZoomed] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");

  const downloadFile = () => {
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = file.name;
    link.click();
  };

  return (
    <>
      <div className="doc-inspector">
        <div className="inspector-card">
          <div className="inspector-header">
            <div className="inspector-header-main">
              <div className="inspector-file-icon">
                {isImage ? <ImageIcon size={18} /> : <FileIcon size={18} />}
              </div>
              <div className="inspector-file-meta">
                <div className="inspector-file-name">{file.name}</div>
                <div className="inspector-file-sub">
                  {isPdf ? "PDF document" : isImage ? "Image file" : "Document"} · {sizeMb} MB
                </div>
              </div>
            </div>
            <span className="inspector-badge-current">In use</span>
          </div>

          <div className="inspector-tabs" role="tablist">
            {(["preview", "text", "images", "pages"] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={"inspector-tab" + (activeTab === tab ? " inspector-tab-active" : "")}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="inspector-ai-context">
            <span className="inspector-ai-dot" />
            <span>AI is using this document as context for answers</span>
          </div>

          {activeTab === "preview" ? (
            <div className="inspector-preview-shell">
              <div className="inspector-preview-frame">
                <div className={"inspector-preview-inner" + (zoomed ? " inspector-preview-inner-zoomed" : "")}>
                  {isImage && (
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="uploader-preview-image inspector-preview-media"
                    />
                  )}
                  {isPdf && (
                    <iframe
                      src={previewUrl}
                      title={file.name}
                      className="uploader-preview-pdf inspector-preview-media"
                    />
                  )}
                </div>
                <div className="inspector-actions">
                  <button type="button" className="inspector-action-btn" onClick={() => setZoomed(z => !z)}>
                    {zoomed ? "Reset zoom" : "Zoom"}
                  </button>
                  <button type="button" className="inspector-action-btn" onClick={downloadFile}>
                    Download
                  </button>
                  <button type="button" className="inspector-action-btn" onClick={() => setFocusOpen(true)}>
                    Full view
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="inspector-tab-placeholder">
              {activeTab === "text" && "Extracted text will appear here in a future update."}
              {activeTab === "images" && "Detected images from PDF pages will appear here."}
              {activeTab === "pages" && "Page-by-page overview will appear here."}
            </div>
          )}
        </div>
      </div>

      {focusOpen && (
        <div className="inspector-modal-backdrop" onClick={() => setFocusOpen(false)}>
          <div className="inspector-modal" onClick={e => e.stopPropagation()}>
            <div className="inspector-modal-header">
              <span className="inspector-modal-title">{file.name}</span>
              <button
                type="button"
                className="inspector-modal-close"
                onClick={() => setFocusOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="inspector-modal-body">
              {isImage && (
                <img src={previewUrl} alt={file.name} className="inspector-modal-media" />
              )}
              {isPdf && (
                <iframe src={previewUrl} title={file.name} className="uploader-preview-pdf inspector-modal-media" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
