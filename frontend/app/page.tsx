"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import ChatBox from "./components/ChatBox";
import FileUploader from "./components/FileUploader";
import {
  LogoIcon,
  SearchIcon,
  FileIcon,
  ImageIcon,
  VideoIcon,
  TrashIcon,
  SunIcon,
  MoonIcon,
  FolderIcon,
} from "./components/Icons";

const API = process.env.NEXT_PUBLIC_API_URL!;

type DocMeta = {
  id: string;
  name: string;
  type?: "pdf" | "image" | "youtube" | "text";
};

function guessDocType(name: string): DocMeta["type"] {
  const lower = name.toLowerCase();
  if (lower.includes("youtube")) return "youtube";
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(lower)) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  return "text";
}

function DocTypeIcon({ type }: { type?: DocMeta["type"] }) {
  if (type === "image") return <ImageIcon size={15} />;
  if (type === "youtube") return <VideoIcon size={15} />;
  return <FileIcon size={15} />;
}

export default function Home() {
  const [docId, setDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const filteredDocs = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDocumentChange = (id: string, name: string, type?: DocMeta["type"]) => {
    setDocId(id);
    setDocName(name);
    setDocs(prev => {
      if (prev.some(d => d.id === id)) return prev;
      return [...prev, { id, name, type: type ?? guessDocType(name) }];
    });
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const handleDeleteDocument = async (id: string) => {
    const target = docs.find(d => d.id === id);
    if (!target) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Delete "${target.name}" from your library?`);
      if (!ok) return;
    }

    try {
      await axios.post(`${API}/delete_document`, { doc_id: id });
    } catch {
      // still remove from local list
    }

    setDocs(prev => prev.filter(d => d.id !== id));
    if (docId === id) {
      setDocId(null);
      setDocName(null);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = prefersDark ? "dark" : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);

  return (
    <main className="app-root">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-logo">
            <LogoIcon size={20} />
          </div>
          <div className="app-brand-text">
            <p>Multimodal knowledge assistant</p>
          </div>
        </div>
        <div className="app-header-actions">
          <div className="status-pill">
            <span className="status-dot" />
            Ready
          </div>
          <button type="button" className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <div className="sidebar-title">
                <FolderIcon size={18} />
                Knowledge Base
                <span className="doc-count-badge">{docs.length}</span>
              </div>
            </div>

            <div className="search-wrapper">
              <SearchIcon size={15} className="search-icon" />
              <input
                className="doc-search-input"
                placeholder="Search documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <FileUploader
              onUploaded={handleDocumentChange}
              existingNames={docs.map(d => d.name)}
              activeDocName={docName}
            />

            <div className="doc-list">
              {docs.length === 0 ? (
                <div className="doc-empty-state">
                  <div className="doc-empty-icon">
                    <FileIcon size={22} />
                  </div>
                  <span className="doc-empty-title">No documents yet</span>
                  <span className="doc-empty-desc">
                    Upload a PDF or image above, or load a YouTube video from the chat panel.
                  </span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="doc-empty-state">
                  <span className="doc-empty-title">No matches</span>
                  <span className="doc-empty-desc">Try a different search term.</span>
                </div>
              ) : (
                filteredDocs.map(d => (
                  <div
                    key={d.id}
                    className={"doc-row" + (d.id === docId ? " doc-row-active" : "")}
                  >
                    <button
                      type="button"
                      className="doc-row-main"
                      onClick={() => {
                        setDocId(d.id);
                        setDocName(d.name);
                      }}
                    >
                      <span className="doc-type-icon">
                        <DocTypeIcon type={d.type} />
                      </span>
                      <span className="doc-meta">
                        <span className="doc-name">{d.name}</span>
                        <span className="doc-status">
                          {d.id === docId ? "Active context" : "Click to select"}
                        </span>
                      </span>
                      {d.id === docId && <span className="doc-inuse-badge">Active</span>}
                    </button>
                    <button
                      type="button"
                      className="doc-row-delete"
                      onClick={() => handleDeleteDocument(d.id)}
                      aria-label={`Delete ${d.name}`}
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="main-panel">
          <ChatBox
            docId={docId}
            docName={docName}
            onDocumentChange={handleDocumentChange}
            existingNames={docs.map(d => d.name)}
          />
        </section>
      </div>
    </main>
  );
}
