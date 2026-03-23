"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  Link2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Database,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  History,
  ArrowRight,
  X,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConfidenceBreakdown {
  clarity: number;
  userRights: number;
  dataTransparency: number;
  ambiguity: number;
}

interface Analysis {
  id: string;
  createdAt: string;
  inputType: "TEXT" | "URL";
  sourceUrl?: string;
  summary: string;
  positivePoints: string[];
  negativePoints: string[];
  dataCollected: string[];
  dataRetention: string;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  processingMs?: number;
  cached?: boolean;
}

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return { text: "#10b981", bg: "rgba(16,185,129,0.1)", label: "Fiable" };
  if (score >= 40) return { text: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "Modéré" };
  return { text: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Risqué" };
}

function ScoreRing({ score }: { score: number }) {
  const { text, label } = scoreColor(score);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={text} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
        />
        <text x="55" y="52" textAnchor="middle" fill={text} fontSize="22" fontWeight="700" fontFamily="'DM Mono', monospace">{score}</text>
        <text x="55" y="66" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="inherit">/ 100</text>
      </svg>
      <span style={{ color: text }} className="text-xs font-semibold tracking-widest uppercase">{label}</span>
    </div>
  );
}

function BreakdownBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  const { text } = scoreColor((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-xs text-white/40 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: text }} />
      </div>
      <span className="w-8 text-right text-xs font-mono" style={{ color: text }}>{value}<span className="text-white/20">/{max}</span></span>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ data, onClose }: { data: Analysis; onClose?: () => void }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const bd = data.confidenceBreakdown as ConfidenceBreakdown;

  return (
    <div className="result-card rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(14,14,22,0.95)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/40">
              {data.inputType === "URL" ? data.sourceUrl?.replace(/https?:\/\//,"").slice(0,40) : "Texte collé"}
            </span>
            {data.cached && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                ⚡ Cache
              </span>
            )}
          </div>
          <p className="text-sm text-white/60 leading-relaxed">{data.summary}</p>
        </div>
        <div className="flex-shrink-0">
          <ScoreRing score={data.confidenceScore} />
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/20 hover:text-white/60 transition-colors absolute top-4 right-4">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Score breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full px-6 py-2.5 flex items-center justify-between text-xs text-white/30 hover:text-white/60 hover:bg-white/3 transition-all"
      >
        <span>Détail du score</span>
        {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {showBreakdown && (
        <div className="px-6 pb-4 space-y-2 border-b border-white/6">
          <BreakdownBar label="Clarté des clauses" value={bd?.clarity ?? 0} />
          <BreakdownBar label="Droits utilisateur" value={bd?.userRights ?? 0} />
          <BreakdownBar label="Transparence données" value={bd?.dataTransparency ?? 0} />
          <BreakdownBar label="Absence d'ambiguïté" value={bd?.ambiguity ?? 0} />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/6">
        {/* Positifs */}
        <div className="bg-[#0e0e16] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">Points positifs</span>
          </div>
          <ul className="space-y-1.5">
            {(data.positivePoints as string[]).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                <span className="mt-1 w-1 h-1 rounded-full bg-emerald-400/60 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Négatifs */}
        <div className="bg-[#0e0e16] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-rose-400" />
            <span className="text-xs font-semibold text-rose-400 tracking-wider uppercase">Points négatifs</span>
          </div>
          <ul className="space-y-1.5">
            {(data.negativePoints as string[]).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                <span className="mt-1 w-1 h-1 rounded-full bg-rose-400/60 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Données collectées */}
        <div className="bg-[#0e0e16] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 tracking-wider uppercase">Données collectées</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(data.dataCollected as string[]).map((d, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Rétention */}
        <div className="bg-[#0e0e16] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">Conservation</span>
          </div>
          <p className="text-xs text-white/55 leading-relaxed">{data.dataRetention}</p>
          {data.processingMs && (
            <p className="mt-3 text-xs text-white/20 font-mono">Analysé en {(data.processingMs / 1000).toFixed(1)}s</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ item, onSelect }: { item: Analysis; onSelect: (a: Analysis) => void }) {
  const { text, bg } = scoreColor(item.confidenceScore);
  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left px-4 py-3 rounded-xl border border-white/6 hover:border-white/12 hover:bg-white/3 transition-all group flex items-center gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold" style={{ background: bg, color: text }}>
        {item.confidenceScore}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/60 truncate">{item.sourceUrl ?? "Texte"}</p>
        <p className="text-xs text-white/25 mt-0.5">{new Date(item.createdAt).toLocaleDateString("fr-FR")}</p>
      </div>
      <ArrowRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<"text" | "url">("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/history");
      if (res.ok) setHistory(await res.json());
    } catch {}
  }

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const body =
        tab === "text"
          ? { inputType: "TEXT", text: textInput }
          : { inputType: "URL", url: urlInput };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      setResult(data);
      fetchHistory();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = tab === "text" ? textInput.trim().length >= 100 : urlInput.startsWith("http");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #08080f;
          color: #fff;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          background-size: 256px;
          opacity: 0.4;
        }

        .glow-orb {
          position: fixed; pointer-events: none; border-radius: 50%; filter: blur(120px); opacity: 0.12;
        }

        .main-content { position: relative; z-index: 1; }

        .tab-btn {
          padding: 6px 18px; border-radius: 8px; font-size: 13px; font-weight: 500;
          transition: all 0.2s; border: none; cursor: pointer; color: rgba(255,255,255,0.4); background: transparent;
        }
        .tab-btn.active { background: rgba(255,255,255,0.08); color: #fff; }

        textarea, input[type="text"] {
          width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; color: #fff; font-family: inherit; font-size: 13px;
          resize: none; outline: none; transition: border-color 0.2s;
          padding: 14px 16px;
        }
        textarea:focus, input[type="text"]:focus { border-color: rgba(255,255,255,0.2); }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.2); }

        .analyze-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 14px;
          border: none; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
        }
        .analyze-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.35); }
        .analyze-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .result-card { animation: fadeUp 0.5s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <div className="noise" />
      <div className="glow-orb" style={{ width: 600, height: 600, top: -200, left: -200, background: "#6366f1" }} />
      <div className="glow-orb" style={{ width: 400, height: 400, bottom: 0, right: -100, background: "#8b5cf6" }} />

      <div className="main-content max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-white/8 text-xs text-white/40 font-mono">
            <Zap size={10} className="text-violet-400" /> Propulsé par Groq · Llama-3.3-70B
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Analyse vos <em>CGU</em><br />en quelques secondes.
          </h1>
          <p className="mt-4 text-sm text-white/40 max-w-md mx-auto leading-relaxed">
            Collez le texte ou entrez l'URL de n'importe quelles Conditions Générales.<br />L'IA extrait ce qui compte vraiment.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(14,14,22,0.8)" }}>
              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-10 mb-5" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, display: "inline-flex" }}>
                <button className={`tab-btn ${tab === "text" ? "active" : ""}`} onClick={() => setTab("text")}>
                  <FileText size={12} style={{ display: "inline", marginRight: 6 }} />Texte
                </button>
                <button className={`tab-btn ${tab === "url" ? "active" : ""}`} onClick={() => setTab("url")}>
                  <Link2 size={12} style={{ display: "inline", marginRight: 6 }} />URL
                </button>
              </div>

              {tab === "text" ? (
                <textarea
                  rows={10}
                  placeholder="Collez ici le texte des CGU (minimum 100 caractères)…"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  placeholder="https://example.com/terms"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              )}

              {tab === "text" && textInput.length > 0 && (
                <p className="mt-2 text-xs font-mono" style={{ color: textInput.length < 100 ? "#ef4444" : "rgba(255,255,255,0.25)" }}>
                  {textInput.length} caractères {textInput.length < 100 && `(min 100)`}
                </p>
              )}

              <div className="mt-4">
                <button className="analyze-btn" onClick={handleAnalyze} disabled={!canSubmit || loading}>
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Analyse en cours…</>
                  ) : (
                    <><Shield size={16} /> Analyser les CGU</>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-3 px-4 py-3 rounded-xl text-sm text-rose-300 border border-rose-500/20 flex items-center gap-2" style={{ background: "rgba(239,68,68,0.06)" }}>
                  <AlertTriangle size={14} className="flex-shrink-0" /> {error}
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <FileText size={14} />, label: "Soumettez", desc: "Texte ou URL" },
                { icon: <Zap size={14} />, label: "Groq analyse", desc: "Llama-3.3-70B" },
                { icon: <Shield size={14} />, label: "Score & rapport", desc: "Sauvegardé" },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="rounded-xl border border-white/6 p-3 text-center" style={{ background: "rgba(14,14,22,0.6)" }}>
                  <div className="inline-flex w-7 h-7 rounded-lg items-center justify-center mb-2 text-violet-400" style={{ background: "rgba(99,102,241,0.1)" }}>{icon}</div>
                  <p className="text-xs font-semibold text-white/70">{label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* History Sidebar */}
          <div className="space-y-3">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 hover:border-white/12 transition-all text-sm"
              style={{ background: "rgba(14,14,22,0.8)" }}
            >
              <div className="flex items-center gap-2 text-white/60">
                <History size={14} />
                <span>Historique</span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/30">{history.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); fetchHistory(); }} className="text-white/20 hover:text-white/50 transition-colors">
                  <RefreshCw size={12} />
                </button>
                {historyOpen ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
              </div>
            </button>

            {(historyOpen || window.innerWidth >= 1024) && (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-6">Aucune analyse pour l'instant</p>
                ) : (
                  history.map((item) => (
                    <HistoryItem key={item.id} item={item} onSelect={(a) => { setResult(a); resultRef.current?.scrollIntoView({ behavior: "smooth" }); }} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div ref={resultRef} className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-white/6" />
              <span className="text-xs text-white/25 font-mono">Résultat de l'analyse</span>
              <div className="h-px flex-1 bg-white/6" />
            </div>
            <ResultCard data={result} onClose={() => setResult(null)} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-white/15 font-mono">
          CGU Analyzer · Next.js + Groq + Prisma · <a href="https://github.com" className="hover:text-white/40 transition-colors">GitHub</a>
        </footer>
      </div>
    </>
  );
}
