import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Toast from "./Toast";
import {
  ChatIcon,
  GlobeIcon,
  CodeIcon,
  VideoIcon,
  SparklesIcon,
  SendIcon,
  AttachIcon,
  FileIcon,
} from "./Icons";

const API = process.env.NEXT_PUBLIC_API_URL!;

type ChatMessage = {
  role: "user" | "bot";
  content: string;
};

type ChatBoxProps = {
  docId?: string | null;
  docName?: string | null;
  onDocumentChange?: (docId: string, fileName: string, type?: "youtube") => void;
  existingNames?: string[];
};

type ChatMode = "rag" | "web_search" | "ui_generator" | "youtube";

const MODE_CONFIG: { id: ChatMode; label: string; icon: React.ReactNode }[] = [
  { id: "rag", label: "Documents", icon: <ChatIcon size={14} /> },
  { id: "web_search", label: "Web Search", icon: <GlobeIcon size={14} /> },
  { id: "ui_generator", label: "UI Generator", icon: <CodeIcon size={14} /> },
  { id: "youtube", label: "YouTube", icon: <VideoIcon size={14} /> },
];

const SUGGESTIONS: Record<ChatMode, string[]> = {
  rag: [
    "Summarize the key points",
    "What are the main topics covered?",
    "Explain this in simple terms",
  ],
  web_search: [
    "Latest developments in AI",
    "Compare top vector databases",
    "What is retrieval-augmented generation?",
  ],
  ui_generator: [
    "A login card with email and password",
    "A pricing table with 3 tiers",
    "A dashboard stats widget",
  ],
  youtube: [
    "What is this video about?",
    "List the key takeaways",
    "Summarize in 3 bullet points",
  ],
};

const PLACEHOLDERS: Record<ChatMode, string> = {
  rag: "Ask a question about your document...",
  web_search: "Search the web for up-to-date information...",
  ui_generator: "Describe the UI component you want to generate...",
  youtube: "Ask a question about the loaded video...",
};

const urlRegex = /(https?:\/\/[^\s]+)/g;

function renderMessageContent(text: string) {
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a key={index} href={part} target="_blank" rel="noreferrer" className="chat-link">
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function ChatBox({ docId, docName, onDocumentChange, existingNames }: ChatBoxProps) {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mode, setMode] = useState<ChatMode>("rag");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || uploadingImage) return;

    setChat(prev => [...prev, { role: "user", content: trimmed }]);
    setMsg("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, { message: trimmed, doc_id: docId, mode });
      setChat(prev => [
        ...prev,
        { role: "bot", content: res.data.response ?? "No response received." },
      ]);
    } catch {
      setChat(prev => [
        ...prev,
        { role: "bot", content: "Something went wrong while contacting the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const send = () => sendMessage(msg);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const ingestYoutube = async () => {
    const url = youtubeUrl.trim();
    if (!url || youtubeLoading) return;

    setYoutubeLoading(true);
    try {
      const res = await axios.post(`${API}/youtube_ingest`, { url });
      const data = res.data as {
        doc_id?: string;
        title?: string;
        summary?: string;
        error?: string;
      };

      if (data.error) {
        setChat(prev => [...prev, { role: "bot", content: `Could not load video: ${data.error}` }]);
        return;
      }

      if (data.doc_id && onDocumentChange) {
        onDocumentChange(data.doc_id, data.title ?? url, "youtube");
      }

      if (data.summary) {
        setChat(prev => [
          ...prev,
          {
            role: "bot",
            content: `Video indexed${data.title ? ` — ${data.title}` : ""}.\n\nSummary:\n${data.summary}`,
          },
        ]);
      }

      setYoutubeUrl("");
      setToast({ message: "YouTube video indexed successfully.", type: "success" });
    } catch {
      setChat(prev => [...prev, { role: "bot", content: "Failed to load YouTube video. Check the URL and try again." }]);
    } finally {
      setYoutubeLoading(false);
    }
  };

  const openImagePicker = () => {
    if (!loading && !uploadingImage && !youtubeLoading) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || youtubeLoading) return;

    if (existingNames?.includes(file.name)) {
      setToast({ message: "This image has already been uploaded.", type: "error" });
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setUploadingImage(true);
    try {
      const res = await axios.post(`${API}/upload`, form);
      const data = res.data as { doc_id?: string; file_name?: string };
      if (data.doc_id && onDocumentChange) {
        onDocumentChange(data.doc_id, data.file_name ?? file.name);
      }
      setChat(prev => [
        ...prev,
        { role: "bot", content: `Image "${file.name}" uploaded and indexed. You can now ask questions about it.` },
      ]);
      setToast({ message: "Image uploaded successfully.", type: "success" });
    } catch {
      setToast({ message: "Image upload failed.", type: "error" });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const panelSubtitle = {
    rag: "Answers grounded in your uploaded documents and images.",
    web_search: "Search the web and get AI-summarized results.",
    ui_generator: "Generate React/TSX components from a text description.",
    youtube: "Load a YouTube transcript, then ask questions about it.",
  }[mode];

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div>
          <div className="chat-panel-title">Chat</div>
          <div className="chat-panel-subtitle">{panelSubtitle}</div>
        </div>
        {docName && mode === "rag" && (
          <div className="active-doc-chip" title={docName}>
            <FileIcon size={14} />
            <span>{docName}</span>
          </div>
        )}
      </div>

      <div className="chat-box">
        <div className="mode-selector" role="tablist">
          {MODE_CONFIG.map(m => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={"mode-btn" + (mode === m.id ? " mode-btn-active" : "")}
              onClick={() => setMode(m.id)}
              disabled={loading}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        {mode === "youtube" && (
          <div className="youtube-panel">
            <div className="youtube-field">
              <label className="youtube-label" htmlFor="youtube-url">YouTube video URL</label>
              <input
                id="youtube-url"
                className="youtube-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") ingestYoutube(); }}
              />
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={ingestYoutube}
              disabled={!youtubeUrl.trim() || youtubeLoading}
            >
              {youtubeLoading ? "Loading..." : "Load video"}
            </button>
          </div>
        )}

        <div className="chat-messages">
          {chat.length === 0 && !loading ? (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <SparklesIcon size={26} />
              </div>
              <h2>How can I help you?</h2>
              <p>
                {mode === "rag" && !docId
                  ? "Upload a document from the sidebar, then ask questions about its content."
                  : mode === "rag"
                  ? `Ask anything about "${docName}". I'll search your indexed content for answers.`
                  : panelSubtitle}
              </p>
              <div className="suggestion-chips">
                {SUGGESTIONS[mode].map(s => (
                  <button
                    key={s}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => sendMessage(s)}
                    disabled={loading || (mode === "rag" && !docId)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`message-row message-row-${m.role}`}
                >
                  <div className={`message-bubble message-bubble-${m.role}`}>
                    <span className="message-author">{m.role === "user" ? "You" : "Assistant"}</span>
                    <p className="message-text">{renderMessageContent(m.content)}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message-row message-row-bot">
                  <div className="typing-indicator" aria-label="Thinking">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area">
          <form className="chat-input-row" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              placeholder={PLACEHOLDERS[mode]}
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || uploadingImage || youtubeLoading}
            />
            <div className="chat-input-actions">
              <button
                type="button"
                className="btn-icon"
                onClick={openImagePicker}
                disabled={loading || uploadingImage || youtubeLoading}
                title="Upload image"
                aria-label="Upload image"
              >
                <AttachIcon />
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!msg.trim() || loading || uploadingImage || youtubeLoading}
              >
                <SendIcon size={16} />
                {loading ? "Thinking" : "Send"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </form>
          <p className="chat-input-hint">
            Press Enter to send · Shift+Enter for new line
            {uploadingImage && " · Uploading image..."}
          </p>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
