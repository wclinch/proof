"use client";

import { useState, useRef, useEffect } from "react";
import Nav from "@/components/Nav";

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceStatus = "queued" | "loading" | "done" | "error";

interface AnalysisResult {
  title: string;
  authors: string[];
  year: string | null;
  journal: string | null;
  doi: string | null;
  type: string;
  abstract: string | null;
  sample_n: string | null;
  sample_desc: string | null;
  methodology: string | null;
  stats: string[];
  findings: string[];
  conclusions: string[];
  quotes: string[];
  limitations: string[];
  concepts: string[];
  keywords: string[];
}

interface QueuedSource {
  id: string;
  raw: string;
  status: SourceStatus;
  result: AnalysisResult | null;
  rawText: string | null;
  error: string | null;
  label?: string;
}

interface Project {
  id: string;
  name: string;
  sources: QueuedSource[];
  draft: string;
  draftTitle: string;
  draftCreated: boolean;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "proof-v2-projects";
const ACTIVE_KEY = "proof-v2-active";
const SELECTED_KEY = "proof-v2-selected";
const SESSION_KEY = "proof-v2-session";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uid() + uid();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function newProject(n: number): Project {
  return {
    id: uid(),
    name: `untitled-${n}`,
    sources: [],
    draft: "",
    draftTitle: "",
    draftCreated: false,
  };
}

function loadProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? [];
  } catch {
    return [];
  }
}

function saveProjects(ps: Project[]) {
  // Truncate rawText to 20k chars — keeps highlight/jump working after reload
  // while staying well within the 5MB localStorage quota
  const slim = ps.map((p) => ({
    ...p,
    sources: p.sources.map((s) => ({
      ...s,
      rawText: s.rawText ? s.rawText.slice(0, 20000) : null,
    })),
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Quota exceeded — retry with rawText fully stripped
    try {
      const bare = ps.map((p) => ({
        ...p,
        sources: p.sources.map((s) => ({ ...s, rawText: null })),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bare));
    } catch {
      /* still failing — silently ignore */
    }
  }
}

function parseInput(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [confirmDeleteSrcId, setConfirmDeleteSrcId] = useState<string | null>(
    null,
  );
  const [confirmDeleteProjId, setConfirmDeleteProjId] = useState<string | null>(
    null,
  );
  const [editingSrcId, setEditingSrcId] = useState<string | null>(null);
  const [projContextMenu, setProjContextMenu] = useState<{
    projId: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [projNameInput, setProjNameInput] = useState("");
  const [srcLabelInput, setSrcLabelInput] = useState("");
  const [centerView, setCenterView] = useState<"analysis" | "source">(
    "analysis",
  );
  const [contextMenu, setContextMenu] = useState<{
    srcId: string;
    x: number;
    y: number;
  } | null>(null);
  const [highlightText, setHighlightText] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftTitleRef = useRef<HTMLInputElement>(null);
  const analyzing = useRef(false);
  const reanalyzeCooldown = useRef<Set<string>>(new Set());

  // Close projects modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowProjects(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Dismiss source context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => {
      setContextMenu(null);
      setConfirmDeleteSrcId(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  // Dismiss project context menu on outside click
  useEffect(() => {
    if (!projContextMenu) return;
    const handler = () => {
      setProjContextMenu(null);
      setConfirmDeleteProjId(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [projContextMenu]);

  // Reset center view + highlight when switching sources
  useEffect(() => {
    setCenterView("analysis");
    setHighlightText(null);
  }, [selectedId]);

  // Reset multi-selection when switching projects
  useEffect(() => {
    setSelectedIds(new Set());
    setAnchorId(null);
  }, [activeId]);

  // Reset project delete confirm when modal opens/closes
  useEffect(() => {
    setConfirmDeleteProjId(null);
  }, [showProjects]);

  useEffect(() => {
    const saved = loadProjects();
    if (saved.length) {
      setProjects(saved);
      const savedActive = localStorage.getItem(ACTIVE_KEY);
      const match = saved.find((p) => p.id === savedActive) ?? saved[0];
      setActiveId(match.id);
      setProjectName(match.name);
      const savedSelected = localStorage.getItem(SELECTED_KEY);
      if (savedSelected && match.sources.find((s) => s.id === savedSelected)) {
        setSelectedId(savedSelected);
      }
    } else {
      const p = newProject(1);
      setProjects([p]);
      setActiveId(p.id);
      setProjectName(p.name);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (projects.length) saveProjects(projects);
  }, [projects]);
  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);
  useEffect(() => {
    if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId);
    else localStorage.removeItem(SELECTED_KEY);
  }, [selectedId]);

  const activeProject = projects.find((p) => p.id === activeId) ?? null;
  const sources = activeProject?.sources ?? [];
  const draft = activeProject?.draft ?? "";
  const selectedSource = sources.find((s) => s.id === selectedId) ?? null;
  const doneCount = sources.filter((s) => s.status === "done").length;
  const loadingCount = sources.filter((s) => s.status === "loading").length;

  function updateProject(id: string, update: Partial<Project>) {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...update } : p)));
  }

  function patchSource(
    projId: string,
    srcId: string,
    patch: Partial<QueuedSource>,
  ) {
    setProjects((ps) =>
      ps.map((p) =>
        p.id !== projId
          ? p
          : {
              ...p,
              sources: p.sources.map((s) =>
                s.id === srcId ? { ...s, ...patch } : s,
              ),
            },
      ),
    );
  }

  function setDraft(val: string) {
    if (activeId) updateProject(activeId, { draft: val });
  }

  function setDraftTitle(val: string) {
    if (activeId) updateProject(activeId, { draftTitle: val });
  }

  function jumpToSource(text: string) {
    setCenterView("source");
    setHighlightText(text);
  }

  async function analyzeSources() {
    if (!activeId || !inputText.trim() || analyzing.current) return;
    const urls = parseInput(inputText);
    if (!urls.length) return;

    const newSources: QueuedSource[] = urls.map((raw) => ({
      id: uid(),
      raw,
      status: "queued",
      result: null,
      rawText: null,
      error: null,
    }));

    updateProject(activeId, { sources: [...sources, ...newSources] });
    setInputText("");
    setSelectedId(newSources[0].id);
    analyzing.current = true;

    const projId = activeId;
    for (const src of newSources) {
      patchSource(projId, src.id, { status: "loading" });
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: src.raw,
            session_id: getSessionId(),
            draft_title: activeProject?.draftTitle?.trim() || null,
          }),
        });
        const data = await res.json();
        if (data.error) {
          patchSource(projId, src.id, { status: "error", error: data.error });
        } else {
          patchSource(projId, src.id, {
            status: "done",
            result: data.analysis,
            rawText: data.content ?? null,
          });
        }
      } catch {
        patchSource(projId, src.id, {
          status: "error",
          error: "Network error",
        });
      }
    }

    analyzing.current = false;
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!activeId || analyzing.current) return;
    const list = Array.from(files).filter(
      (f) =>
        f.type === "application/pdf" ||
        f.name.toLowerCase().endsWith(".pdf") ||
        f.type === "text/plain" ||
        f.name.toLowerCase().endsWith(".txt"),
    );
    if (!list.length) return;

    const newSources: QueuedSource[] = list.map((f) => ({
      id: uid(),
      raw: `file:${f.name}`,
      status: "queued",
      result: null,
      rawText: null,
      error: null,
      label: f.name,
    }));

    updateProject(activeId, { sources: [...sources, ...newSources] });
    setSelectedId(newSources[0].id);
    analyzing.current = true;

    const projId = activeId;
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const src = newSources[i];
      patchSource(projId, src.id, { status: "loading" });
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("session_id", getSessionId());
        form.append("draft_title", activeProject?.draftTitle?.trim() || "");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (data.error) {
          patchSource(projId, src.id, { status: "error", error: data.error });
        } else {
          patchSource(projId, src.id, {
            status: "done",
            result: data.analysis,
            rawText: data.content ?? null,
          });
        }
      } catch {
        patchSource(projId, src.id, {
          status: "error",
          error: "Upload failed",
        });
      }
    }
    analyzing.current = false;
  }

  function removeSource(srcId: string) {
    if (!activeId) return;
    const updated = sources.filter((s) => s.id !== srcId);
    updateProject(activeId, { sources: updated });
    if (selectedId === srcId) setSelectedId(updated[0]?.id ?? null);
    setSelectedIds(new Set());
    setAnchorId(null);
  }

  function removeSelected() {
    if (!activeId || !selectedIds.size) return;
    const updated = sources.filter((s) => !selectedIds.has(s.id));
    updateProject(activeId, { sources: updated });
    const nextSelected =
      selectedId && !selectedIds.has(selectedId)
        ? selectedId
        : (updated[0]?.id ?? null);
    setSelectedId(nextSelected);
    setSelectedIds(new Set());
    setAnchorId(null);
  }

  async function reanalyzeSource(srcId: string) {
    if (!activeId) return
    const src = sources.find(s => s.id === srcId)
    if (!src || src.raw.startsWith('file:')) return
    if (reanalyzeCooldown.current.has(srcId)) return
    reanalyzeCooldown.current.add(srcId)
    setTimeout(() => reanalyzeCooldown.current.delete(srcId), 30000)
    const projId = activeId
    patchSource(projId, srcId, { status: 'loading', error: null })
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: src.raw,
          session_id: getSessionId(),
          draft_title: activeProject?.draftTitle?.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.error) {
        patchSource(projId, srcId, { status: 'error', error: data.error })
      } else {
        patchSource(projId, srcId, { status: 'done', result: data.analysis, rawText: data.content ?? null })
      }
    } catch {
      patchSource(projId, srcId, { status: 'error', error: 'Network error' })
    }
  }

  function createProject() {
    const p = newProject(projects.length + 1);
    setProjects((ps) => [...ps, p]);
    setActiveId(p.id);
    setProjectName(p.name);
    setShowProjects(false);
    setSelectedId(null);
  }

  function switchProject(id: string) {
    const p = projects.find((q) => q.id === id);
    if (!p) return;
    setActiveId(id);
    setProjectName(p.name);
    setShowProjects(false);
    setSelectedId(null);
  }

  function deleteProject(id: string) {
    const updated = projects.filter((p) => p.id !== id);
    if (!updated.length) {
      const p = newProject(1);
      setProjects([p]);
      setActiveId(p.id);
      setProjectName(p.name);
      setShowProjects(false);
    } else {
      setProjects(updated);
      if (activeId === id) {
        setActiveId(updated[0].id);
        setProjectName(updated[0].name);
      }
    }
  }

  function saveName() {
    if (!activeId) return;
    const untitledCount = projects.filter((p) =>
      p.name.startsWith("untitled-"),
    ).length;
    const name = projectName.trim() || `untitled-${untitledCount + 1}`;
    updateProject(activeId, { name });
    setProjectName(name);
    setEditingName(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!mounted)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          background: "#080808",
        }}
      >
        <Nav />
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "#080808",
      }}
    >
      <Nav />

      {/* Project bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          height: "40px",
          flexShrink: 0,
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        {editingName ? (
          <input
            ref={nameRef}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setProjectName(activeProject?.name ?? "");
                setEditingName(false);
              }
            }}
            autoFocus
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "12px",
              color: "#aaa",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "inherit",
              padding: 0,
              margin: 0,
              height: "20px",
              lineHeight: "20px",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "text",
              outline: "none",
              fontSize: "11px",
              color: "#444",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#777")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          >
            {activeProject?.name ?? "untitled"}
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {sources.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                color: "#444",
                letterSpacing: "0.06em",
              }}
            >
              {doneCount}/{sources.length} analyzed
              {loadingCount > 0 ? " · analyzing..." : ""}
            </span>
          )}
          <button
            onClick={() => setShowProjects((v) => !v)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              outline: "none",
              fontSize: "11px",
              color: "#444",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#777")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          >
            Projects
          </button>
          <button
            onClick={createProject}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              outline: "none",
              fontSize: "11px",
              color: "#444",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#777")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          >
            New
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left — Source hopper */}
        <div
          style={{
            width: "280px",
            flexShrink: 0,
            borderRight: "1px solid #1a1a1a",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid #1a1a1a",
              flexShrink: 0,
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length)
                uploadFiles(e.dataTransfer.files);
            }}
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  analyzeSources();
                }
              }}
              placeholder={
                "Paste URLs or DOIs\none per line or comma-separated"
              }
              style={{
                width: "100%",
                height: "88px",
                boxSizing: "border-box",
                background: dragOver ? "#141414" : "#0f0f0f",
                border: `1px solid ${dragOver ? "#333" : "#1a1a1a"}`,
                borderRadius: "4px",
                color: "#ccc",
                fontSize: "13px",
                padding: "10px 12px",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
                transition: "border-color 0.15s, background 0.15s",
              }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button
                onClick={analyzeSources}
                disabled={!inputText.trim()}
                style={{
                  flex: 1,
                  padding: "9px",
                  background: "#0f0f0f",
                  border: "1px solid #1a1a1a",
                  borderRadius: "4px",
                  color: inputText.trim() ? "#bbb" : "#333",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "inherit",
                  cursor: inputText.trim() ? "pointer" : "default",
                  transition: "border-color 0.15s, color 0.15s",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (inputText.trim()) {
                    e.currentTarget.style.borderColor = "#444";
                    e.currentTarget.style.color = "#e8e8e8";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1a1a1a";
                  e.currentTarget.style.color = inputText.trim()
                    ? "#bbb"
                    : "#333";
                }}
              >
                Analyze ⌘↵
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                title="Upload PDF or TXT"
                style={{
                  padding: "9px 12px",
                  background: "#0f0f0f",
                  border: "1px solid #1a1a1a",
                  borderRadius: "4px",
                  color: "#555",
                  fontSize: "14px",
                  lineHeight: 1,
                  cursor: "pointer",
                  outline: "none",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#444";
                  e.currentTarget.style.color = "#aaa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1a1a1a";
                  e.currentTarget.style.color = "#555";
                }}
              >
                ↑
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.length) {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </div>

          {/* Source list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {sources.length === 0 ? (
              <div
                style={{
                  padding: "20px 16px",
                  fontSize: "13px",
                  color: "#333",
                  letterSpacing: "0.04em",
                }}
              >
                No sources yet.
              </div>
            ) : (
              sources.map((src) => {
                const displayName = src.label || src.result?.title || src.raw;
                const isEditing = editingSrcId === src.id;
                return (
                  <div
                    key={src.id}
                    onClick={(e) => {
                      if (e.shiftKey && anchorId) {
                        const anchorIdx = sources.findIndex(
                          (s) => s.id === anchorId,
                        );
                        const clickIdx = sources.findIndex(
                          (s) => s.id === src.id,
                        );
                        const [lo, hi] =
                          anchorIdx < clickIdx
                            ? [anchorIdx, clickIdx]
                            : [clickIdx, anchorIdx];
                        setSelectedIds(
                          new Set(sources.slice(lo, hi + 1).map((s) => s.id)),
                        );
                        setSelectedId(src.id);
                      } else {
                        setSelectedIds(new Set([src.id]));
                        setSelectedId(src.id);
                        setAnchorId(src.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // If right-clicking outside the current selection, re-select just this one
                      if (!selectedIds.has(src.id)) {
                        setSelectedIds(new Set([src.id]));
                        setSelectedId(src.id);
                        setAnchorId(src.id);
                      }
                      setContextMenu({
                        srcId: src.id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      background: selectedIds.has(src.id)
                        ? "#111"
                        : "transparent",
                      borderLeft: `2px solid ${selectedId === src.id ? "#333" : selectedIds.has(src.id) ? "#222" : "transparent"}`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "9px",
                      transition: "background 0.1s",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedIds.has(src.id))
                        e.currentTarget.style.background = "#0d0d0d";
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedIds.has(src.id))
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        marginTop: "5px",
                        background:
                          src.status === "done"
                            ? "#2a6"
                            : src.status === "error"
                              ? "#933"
                              : src.status === "loading"
                                ? "#555"
                                : "#2a2a2a",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={srcLabelInput}
                          onChange={(e) => setSrcLabelInput(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => {
                            const val = srcLabelInput.trim();
                            if (activeId)
                              patchSource(activeId, src.id, {
                                label: val || undefined,
                              });
                            setEditingSrcId(null);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                              const val = srcLabelInput.trim();
                              if (activeId)
                                patchSource(activeId, src.id, {
                                  label: val || undefined,
                                });
                              setEditingSrcId(null);
                            }
                            if (e.key === "Escape") setEditingSrcId(null);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            width: "100%",
                            fontSize: "13px",
                            color: "#ccc",
                            fontFamily: "inherit",
                            padding: 0,
                            height: "18px",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.4,
                            color: src.status === "done" ? "#ccc" : "#555",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayName}
                        </div>
                      )}
                      {src.status === "loading" && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#444",
                            marginTop: "3px",
                            letterSpacing: "0.04em",
                          }}
                        >
                          analyzing...
                        </div>
                      )}
                      {src.status === "error" && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#733",
                            marginTop: "3px",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {src.error}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Middle — Analysis */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #1a1a1a",
            overflow: "hidden",
          }}
        >
          {/* Center panel header */}
          <div
            style={{
              padding: "0 20px",
              height: "40px",
              flexShrink: 0,
              borderBottom: "1px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "16px",
            }}
          >
            {selectedSource?.status === "done" && (
              <>
                <button
                  onClick={() => setCenterView("analysis")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    outline: "none",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "inherit",
                    color: centerView === "analysis" ? "#aaa" : "#333",
                  }}
                >
                  Analysis
                </button>
                <button
                  onClick={() => setCenterView("source")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    outline: "none",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "inherit",
                    color: centerView === "source" ? "#aaa" : "#333",
                  }}
                >
                  Source
                </button>
              </>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            {!selectedSource && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#333",
                  paddingTop: "60px",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                }}
              >
                Select a source to view its analysis.
              </div>
            )}
            {selectedSource?.status === "queued" && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#333",
                  paddingTop: "60px",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                }}
              >
                Queued.
              </div>
            )}
            {selectedSource?.status === "loading" && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#444",
                  paddingTop: "60px",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                }}
              >
                Analyzing...
              </div>
            )}
            {selectedSource?.status === "error" && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#733",
                  paddingTop: "60px",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                }}
              >
                {selectedSource.error}
              </div>
            )}
            {selectedSource?.status === "done" &&
              selectedSource.result &&
              (centerView === "source" ? (
                <SourceTextView
                  text={selectedSource.rawText ?? "No source text available."}
                  highlight={highlightText}
                />
              ) : (
                <AnalysisView
                  result={selectedSource.result}
                  url={selectedSource.raw}
                  onJump={jumpToSource}
                />
              ))}
          </div>
        </div>

        {/* Right — Draft */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0 20px",
              height: "40px",
              flexShrink: 0,
              borderBottom: "1px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#444",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>Draft</span>
            {(activeProject?.draftCreated ||
              activeProject?.draftTitle ||
              activeProject?.draft) && (
              <button
                onClick={() => {
                  if (activeId)
                    updateProject(activeId, {
                      draftCreated: false,
                      draft: "",
                      draftTitle: "",
                    });
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  outline: "none",
                  fontSize: "11px",
                  color: "#333",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#666")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
              >
                Discard
              </button>
            )}
          </div>

          {!(
            activeProject?.draftCreated ||
            activeProject?.draftTitle ||
            activeProject?.draft
          ) ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <button
                onClick={() => {
                  if (activeId) updateProject(activeId, { draftCreated: true });
                  requestAnimationFrame(() => draftTitleRef.current?.focus());
                }}
                style={{
                  background: "#0f0f0f",
                  border: "1px solid #1a1a1a",
                  borderRadius: "4px",
                  padding: "9px 20px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#555",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.style.color = "#999";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1a1a1a";
                  e.currentTarget.style.color = "#555";
                }}
              >
                New Draft
              </button>
              <span
                style={{
                  fontSize: "11px",
                  color: "#2a2a2a",
                  letterSpacing: "0.04em",
                }}
              >
                no draft yet
              </span>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "20px 28px 0",
                  flexShrink: 0,
                  borderBottom: "1px solid #111",
                }}
              >
                <input
                  ref={draftTitleRef}
                  value={activeProject?.draftTitle ?? ""}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Title your draft..."
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "#aaa",
                    fontFamily: "inherit",
                    padding: "0 0 16px 0",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!activeProject?.draftTitle?.trim()}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    const next =
                      draft.slice(0, start) + "    " + draft.slice(end);
                    setDraft(next);
                    requestAnimationFrame(() => {
                      el.selectionStart = el.selectionEnd = start + 4;
                    });
                  }
                }}
                placeholder={
                  activeProject?.draftTitle?.trim()
                    ? "Start writing..."
                    : "Add a title first..."
                }
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: activeProject?.draftTitle?.trim() ? "#bbb" : "#2a2a2a",
                  fontSize: "14px",
                  lineHeight: 1.9,
                  padding: "20px 28px",
                  resize: "none",
                  fontFamily: "inherit",
                  overflowY: "auto",
                  cursor: activeProject?.draftTitle?.trim()
                    ? "text"
                    : "default",
                  WebkitTextFillColor: "inherit",
                  opacity: 1,
                }}
              />
              <div
                style={{
                  padding: "0 20px",
                  height: "34px",
                  flexShrink: 0,
                  borderTop: "1px solid #1a1a1a",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  color: "#333",
                  letterSpacing: "0.06em",
                }}
              >
                <span>{draft.split(/\s+/).filter(Boolean).length} words</span>
                {draft.trim() && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowExportMenu(v => !v)}
                      style={{
                        background: "none", border: "none", padding: 0,
                        cursor: "pointer", fontSize: "11px", color: "#333",
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        fontFamily: "inherit", outline: "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#666")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                    >
                      Export ↑
                    </button>
                    {showExportMenu && (
                      <div style={{
                        position: 'absolute', bottom: '24px', right: 0,
                        background: '#141414', border: '1px solid #2a2a2a',
                        borderRadius: '4px', overflow: 'hidden',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)', minWidth: '100px',
                      }}>
                        {(['txt', 'md'] as const).map(fmt => (
                          <button
                            key={fmt}
                            onClick={() => {
                              const title = activeProject?.draftTitle?.trim() || 'draft'
                              const slug = title.replace(/\s+/g, '-').toLowerCase()
                              let content: string
                              if (fmt === 'md') {
                                content = `# ${title}\n\n${draft}`
                              } else {
                                content = `${title}\n${'—'.repeat(title.length)}\n\n${draft}`
                              }
                              const blob = new Blob([content], { type: 'text/plain' })
                              const a = document.createElement('a')
                              a.href = URL.createObjectURL(blob)
                              a.download = `${slug}.${fmt}`
                              a.click()
                              URL.revokeObjectURL(a.href)
                              setShowExportMenu(false)
                            }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              background: 'none', border: 'none', padding: '8px 14px',
                              cursor: 'pointer', fontSize: '11px', color: '#777',
                              letterSpacing: '0.06em', textTransform: 'uppercase',
                              fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            .{fmt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Projects modal */}
      {showProjects && (
        <div
          onClick={() => setShowProjects(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0d0d0d",
              border: "1px solid #1a1a1a",
              borderRadius: "6px",
              width: "320px",
              maxHeight: "400px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #1a1a1a",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#555",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Projects
              </span>
              <button
                onClick={createProject}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#555",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#999")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
                New
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => switchProject(p.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setProjContextMenu({
                      projId: p.id,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  style={{
                    padding: "11px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: p.id === activeId ? "#111" : "transparent",
                    borderLeft: `2px solid ${p.id === activeId ? "#333" : "transparent"}`,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (p.id !== activeId)
                      e.currentTarget.style.background = "#0d0d0d";
                  }}
                  onMouseLeave={(e) => {
                    if (p.id !== activeId)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {editingProjId === p.id ? (
                    <input
                      autoFocus
                      value={projNameInput}
                      onChange={(e) => setProjNameInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        const name = projNameInput.trim() || p.name;
                        updateProject(p.id, { name });
                        if (activeId === p.id) setProjectName(name);
                        setEditingProjId(null);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          const name = projNameInput.trim() || p.name;
                          updateProject(p.id, { name });
                          if (activeId === p.id) setProjectName(name);
                          setEditingProjId(null);
                        }
                        if (e.key === "Escape") setEditingProjId(null);
                      }}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        fontSize: "13px",
                        color: "#ccc",
                        fontFamily: "inherit",
                        padding: 0,
                        letterSpacing: "0.03em",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        fontSize: "13px",
                        color: p.id === activeId ? "#ddd" : "#555",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {p.name}
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: "#333" }}>
                    {p.sources.length}{" "}
                    {p.sources.length === 1 ? "source" : "sources"}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "8px 20px",
                borderTop: "1px solid #111",
                fontSize: "11px",
                color: "#2a2a2a",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Esc to close
            </div>
          </div>
        </div>
      )}

      {/* Project context menu */}
      {projContextMenu &&
        (() => {
          const proj = projects.find((p) => p.id === projContextMenu.projId);
          if (!proj) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                left: projContextMenu.x,
                top: projContextMenu.y,
                background: "#141414",
                border: "1px solid #2a2a2a",
                borderRadius: "4px",
                zIndex: 300,
                minWidth: "140px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              <button
                onClick={() => {
                  setEditingProjId(proj.id);
                  setProjNameInput(proj.name);
                  setProjContextMenu(null);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: "9px 14px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#777",
                  letterSpacing: "0.04em",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1e1e1e")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                Rename
              </button>
              <div style={{ height: "1px", background: "#1e1e1e" }} />
              {projects.length === 1 ? (
                <div
                  style={{
                    padding: "9px 14px",
                    fontSize: "12px",
                    color: "#333",
                    letterSpacing: "0.04em",
                    userSelect: "none",
                  }}
                >
                  {"Can't delete only project"}
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (confirmDeleteProjId === proj.id) {
                      deleteProject(proj.id)
                      setConfirmDeleteProjId(null)
                      setProjContextMenu(null)
                    } else {
                      setConfirmDeleteProjId(proj.id)
                    }
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "9px 14px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#c55",
                    letterSpacing: "0.04em",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#1e1e1e")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  {confirmDeleteProjId === proj.id ? "Confirm?" : "Remove"}
                </button>
              )}
            </div>
          );
        })()}

      {/* Source context menu */}
      {contextMenu &&
        (() => {
          const src = sources.find((s) => s.id === contextMenu.srcId);
          if (!src) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                left: contextMenu.x,
                top: contextMenu.y,
                background: "#141414",
                border: "1px solid #2a2a2a",
                borderRadius: "4px",
                zIndex: 200,
                minWidth: "140px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              {selectedIds.size <= 1 && (
                <>
                  <button
                    onClick={() => {
                      setEditingSrcId(src.id);
                      setSrcLabelInput(
                        src.label ?? src.result?.title ?? src.raw,
                      );
                      setContextMenu(null);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      padding: "9px 14px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "#777",
                      letterSpacing: "0.04em",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#1e1e1e")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    Rename
                  </button>
                  {!src.raw.startsWith('file:') && (
                    <button
                      onClick={() => {
                        reanalyzeSource(src.id)
                        setContextMenu(null)
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        padding: "9px 14px",
                        cursor: reanalyzeCooldown.current.has(src.id) ? "default" : "pointer",
                        fontSize: "12px",
                        color: reanalyzeCooldown.current.has(src.id) ? "#333" : "#777",
                        letterSpacing: "0.04em",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => {
                        if (!reanalyzeCooldown.current.has(src.id))
                          e.currentTarget.style.background = "#1e1e1e"
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      {reanalyzeCooldown.current.has(src.id) ? "Re-analyze (wait 30s)" : "Re-analyze"}
                    </button>
                  )}
                  <div style={{ height: "1px", background: "#1e1e1e" }} />
                </>
              )}
              <button
                onClick={() => {
                  if (confirmDeleteSrcId === src.id) {
                    if (selectedIds.size > 1) removeSelected(); else removeSource(src.id)
                    setConfirmDeleteSrcId(null)
                    setContextMenu(null)
                  } else {
                    setConfirmDeleteSrcId(src.id)
                  }
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: "9px 14px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#c55",
                  letterSpacing: "0.04em",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1e1e1e")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                {confirmDeleteSrcId === src.id
                  ? "Confirm?"
                  : `Remove${selectedIds.size > 1 ? ` ${selectedIds.size} sources` : ""}`}
              </button>
            </div>
          );
        })()}
    </div>
  );
}

// ─── Source text view ────────────────────────────────────────────────────────

function SourceTextView({
  text,
  highlight,
}: {
  text: string;
  highlight: string | null;
}) {
  const markRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (markRef.current) {
      markRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  const pre: React.CSSProperties = {
    fontSize: "13px",
    color: "#666",
    lineHeight: 1.75,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    margin: 0,
    padding: 0,
    fontFamily: "inherit",
  };

  if (!highlight) return <pre style={pre}>{text}</pre>;

  // Normalize newlines→spaces for search (positions stay identical, it's 1:1)
  const searchText = text.replace(/\n/g, " ");
  const needle = highlight.slice(0, 120).toLowerCase();
  const idx = searchText.toLowerCase().indexOf(needle);
  if (idx === -1) return <pre style={pre}>{text}</pre>;

  // Use needle only to find position; highlight the full original text length
  const matchLen = highlight.length;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + matchLen);
  const after = text.slice(idx + matchLen);

  return (
    <pre style={pre}>
      {before}
      <span
        ref={markRef}
        style={{
          background: "#1e3020",
          color: "#aaa",
          borderRadius: "2px",
          padding: "1px 2px",
          outline: "1px solid #2a4a30",
        }}
      >
        {match}
      </span>
      {after}
    </pre>
  );
}

// ─── Analysis view ────────────────────────────────────────────────────────────

function AnalysisView({
  result,
  url,
  onJump,
}: {
  result: AnalysisResult;
  url: string;
  onJump: (text: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div
        style={{
          paddingBottom: "18px",
          borderBottom: "1px solid #1a1a1a",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: "#aaa",
            lineHeight: 1.4,
            marginBottom: "6px",
          }}
        >
          {result.title}
        </div>
        <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.7 }}>
          {result.authors?.join(", ")}
        </div>
        <div style={{ fontSize: "12px", color: "#444", marginTop: "3px" }}>
          {[result.year, result.journal, result.type]
            .filter(Boolean)
            .join(" · ")}
          {result.doi && <span style={{ color: "#333" }}> · {result.doi}</span>}
        </div>
      </div>

      {result.abstract && (
        <Field label="Abstract">
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#777",
                lineHeight: 1.75,
                margin: 0,
                flex: 1,
              }}
            >
              {result.abstract}
            </p>
            <CopyBtn text={result.abstract} />
            <JumpBtn onClick={() => onJump(result.abstract!)} />
          </div>
        </Field>
      )}

      {(result.sample_n || result.sample_desc) && (
        <Field label="Sample">
          {result.sample_n && <Row value={result.sample_n} onJump={onJump} />}
          {result.sample_desc && (
            <Row value={result.sample_desc} onJump={onJump} />
          )}
        </Field>
      )}

      {result.methodology && (
        <Field label="Methodology">
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#777",
                lineHeight: 1.75,
                margin: 0,
                flex: 1,
              }}
            >
              {result.methodology}
            </p>
            <CopyBtn text={result.methodology} />
            <JumpBtn onClick={() => onJump(result.methodology!)} />
          </div>
        </Field>
      )}

      {result.stats?.length > 0 && (
        <Field label="Statistics">
          {result.stats.map((s, i) => (
            <Row key={i} value={s} onJump={onJump} />
          ))}
        </Field>
      )}

      {result.findings?.length > 0 && (
        <Field label="Findings">
          {result.findings.map((f, i) => (
            <Row key={i} value={f} onJump={onJump} />
          ))}
        </Field>
      )}

      {result.conclusions?.length > 0 && (
        <Field label="Conclusions">
          {result.conclusions.map((c, i) => (
            <Row key={i} value={c} onJump={onJump} />
          ))}
        </Field>
      )}

      {result.quotes?.length > 0 && (
        <Field label="Direct Quotes">
          {result.quotes.map((q, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#666",
                  lineHeight: 1.7,
                  padding: "8px 12px",
                  borderLeft: "2px solid #222",
                  fontStyle: "italic",
                  flex: 1,
                }}
              >
                &ldquo;{q}&rdquo;
              </div>
              <JumpBtn onClick={() => onJump(q)} />
            </div>
          ))}
        </Field>
      )}

      {result.limitations?.length > 0 && (
        <Field label="Limitations">
          {result.limitations.map((l, i) => (
            <Row key={i} value={l} onJump={onJump} />
          ))}
        </Field>
      )}

      {result.concepts?.length > 0 && (
        <Field label="Concepts & Frameworks">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {result.concepts.map((c, i) => (
              <Tag key={i}>{c}</Tag>
            ))}
          </div>
        </Field>
      )}

      {result.keywords?.length > 0 && (
        <Field label="Keywords">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {result.keywords.map((k, i) => (
              <Tag key={i}>{k}</Tag>
            ))}
          </div>
        </Field>
      )}

      <div
        style={{
          paddingTop: "16px",
          marginTop: "4px",
          borderTop: "1px solid #111",
        }}
      >
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: "11px",
            color: "#2a2a2a",
            textDecoration: "none",
            wordBreak: "break-all",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#2a2a2a")}
        >
          {url}
        </a>
      </div>
    </div>
  );
}

function JumpBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Find in source"
      style={{
        background: "none",
        border: "none",
        padding: "2px 4px",
        cursor: "pointer",
        color: "#2a2a2a",
        fontSize: "12px",
        lineHeight: 1,
        outline: "none",
        flexShrink: 0,
        marginTop: "4px",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#666")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#2a2a2a")}
    >
      ◎
    </button>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      title="Copy"
      style={{
        background: "none",
        border: "none",
        padding: "2px 4px",
        cursor: "pointer",
        color: copied ? "#4a8" : "#2a2a2a",
        fontSize: "11px",
        lineHeight: 1,
        outline: "none",
        flexShrink: 0,
        marginTop: "5px",
        fontFamily: "inherit",
        letterSpacing: "0.04em",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.color = "#666";
      }}
      onMouseLeave={(e) => {
        if (!copied) e.currentTarget.style.color = "#2a2a2a";
      }}
    >
      {copied ? "✓" : "⌘"}
    </button>
  );
}

function Row({
  value,
  onJump,
}: {
  value: string;
  onJump?: (t: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "6px",
        borderLeft: "2px solid #1e1e1e",
        marginBottom: "4px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#777",
          lineHeight: 1.65,
          padding: "5px 10px",
          flex: 1,
        }}
      >
        {value}
      </div>
      <CopyBtn text={value} />
      {onJump && <JumpBtn onClick={() => onJump(value)} />}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontSize: "10px",
          color: "#3a3a3a",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "8px",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: "3px 8px",
        background: "#0f0f0f",
        border: "1px solid #1e1e1e",
        borderRadius: "3px",
        fontSize: "11px",
        color: "#4a4a4a",
        letterSpacing: "0.03em",
      }}
    >
      {children}
    </span>
  );
}
