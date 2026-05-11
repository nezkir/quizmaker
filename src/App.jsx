import { useState, useCallback, useEffect, useRef } from "react";

// ─── CSS Variables injected globally ──────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
  :root {
    --bg: #0d0f14; --surface: #161a24; --surface2: #1e2333;
    --border: rgba(255,255,255,0.08); --border2: rgba(255,255,255,0.15);
    --accent: #6ee7b7; --accent2: #818cf8; --accent3: #fb923c;
    --text: #f1f5f9; --muted: #64748b;
    --danger: #f87171; --success: #4ade80;
    --font: 'Sora', sans-serif; --mono: 'Space Mono', monospace;
    --r: 14px; --rs: 8px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; }
  button { font-family: var(--font); cursor: pointer; border: none; outline: none; }
  input, textarea { font-family: var(--font); color: var(--text); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scoreReveal { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
  .fu  { animation: fadeUp 0.35s ease both; }
  .fu1 { animation: fadeUp 0.35s 0.07s ease both; }
  .fu2 { animation: fadeUp 0.35s 0.14s ease both; }
  .fu3 { animation: fadeUp 0.35s 0.21s ease both; }
  .fu4 { animation: fadeUp 0.35s 0.28s ease both; }
`;

// ─── URL sharing helpers ───────────────────────────────────────────────────────
function encodeQuiz(quizData) {
  try {
    const json = JSON.stringify(quizData);
    return btoa(encodeURIComponent(json));
  } catch { return null; }
}

function decodeQuiz(hash) {
  try {
    const json = decodeURIComponent(atob(hash));
    return JSON.parse(json);
  } catch { return null; }
}

function getShareURL(quizData) {
  const encoded = encodeQuiz(quizData);
  if (!encoded) return null;
  const url = new URL(window.location.href);
  url.hash = `quiz=${encoded}`;
  return url.toString();
}

function readHashQuiz() {
  try {
    const hash = window.location.hash.slice(1); // remove #
    if (!hash.startsWith("quiz=")) return null;
    return decodeQuiz(hash.slice(5));
  } catch { return null; }
}

// ─── OCR (Gemini) ─────────────────────────────────────────────────────────────
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey() { try { return localStorage.getItem("gemini_api_key") || ""; } catch { return ""; } }
function setApiKey(k) { try { localStorage.setItem("gemini_api_key", k.trim()); } catch {} }
function hasApiKey() { return !!getApiKey(); }

async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Could not read image."));
    r.readAsDataURL(file);
  });
}

async function callGemini(imageBase64, mimeType, prompt, maxTokens = 4096) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");
  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
        }),
      });
      if (res.status === 404 || res.status === 429) { lastErr = new Error("Model unavailable"); continue; }
      if (res.status === 400) {
        const b = await res.json().catch(() => ({}));
        if ((b?.error?.message || "").toLowerCase().includes("api key")) throw new Error("INVALID_API_KEY");
        throw new Error(`Bad request: ${b?.error?.message}`);
      }
      if (!res.ok) { lastErr = new Error(`Error ${res.status}`); continue; }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text;
    } catch (e) { if (e.message === "INVALID_API_KEY" || e.message === "NO_API_KEY") throw e; lastErr = e; }
  }
  throw lastErr || new Error("All models failed.");
}

async function runQuestionOCR(file, onPct = () => {}) {
  onPct(10);
  const b64 = await fileToBase64(file); onPct(30);
  const prompt = `Extract exam questions from this image. Return ONLY valid JSON, no markdown fences.
Math: fractions as $\\frac{a}{b}$, roots as $\\sqrt{x}$, powers as $x^{2}$, Greek as $\\pi$ etc.
Options a+b and c+d may be on same line — split correctly.
{"questions":[{"num":1,"text":"...","options":{"a":"...","b":"...","c":"...","d":"..."}}]}`;
  const text = await callGemini(b64, file.type || "image/jpeg", prompt, 4096); onPct(90);
  const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim(); onPct(100);
  return clean;
}

async function runAnswerOCR(file, onPct = () => {}) {
  onPct(10);
  const b64 = await fileToBase64(file); onPct(30);
  const prompt = `Extract answer key. Return ONLY: 1.a  2.b  3.c — no explanation, no markdown.`;
  const text = await callGemini(b64, file.type || "image/jpeg", prompt, 512); onPct(100);
  return text.trim();
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Cannot read file."));
    r.readAsDataURL(file);
  });
}

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseAnswerKey(raw) {
  const key = {};
  const cleaned = raw.replace(/[|│┃\[\](){}]/g, " ").replace(/\s+/g, " ");
  const pat = /\b(\d{1,3})\s*[.):\-–]?\s*([a-dA-D])\b/g;
  let m;
  while ((m = pat.exec(cleaned)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 200 && !key[n]) key[n] = m[2].toLowerCase();
  }
  return key;
}

function parseQuestions(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const qs = []; let cur = null;
  for (const line of lines) {
    const qm = line.match(/^(\d{1,3})\s*[.):\-–]\s*(.+)/);
    if (qm && !/^[a-dA-D]\s*[.)]\s*/i.test(qm[2])) {
      cur = { num: parseInt(qm[1], 10), text: qm[2].trim(), options: {} };
      qs.push(cur); continue;
    }
    const om = line.match(/^([a-dA-D])\s*[.):\-–]\s*(.+)/i);
    if (om && cur) { cur.options[om[1].toLowerCase()] = om[2].trim(); continue; }
    if (cur && Object.keys(cur.options).length === 0) cur.text += " " + line;
  }
  for (const q of qs) if (Object.keys(q.options).length === 0) q.options = { a: "Option A", b: "Option B", c: "Option C", d: "Option D" };
  return qs;
}

function answerKeyToRaw(ak) {
  return Object.entries(ak).sort(([a],[b]) => parseInt(a)-parseInt(b)).map(([n,v]) => `${n}.${v}`).join("  ");
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE = {
  subject: "Science Mixed — Sample",
  questions: [
    { num:1, text:"What is the powerhouse of the cell?", options:{a:"Nucleus",b:"Mitochondria",c:"Ribosome",d:"Golgi body"} },
    { num:2, text:"Which planet is closest to the Sun?", options:{a:"Earth",b:"Venus",c:"Mercury",d:"Mars"} },
    { num:3, text:"What is the chemical symbol for Gold?", options:{a:"Go",b:"Gd",c:"Gl",d:"Au"} },
    { num:4, text:"Kinetic energy is given by:", options:{a:"mv",b:"½mv²",c:"mv²",d:"2mv"} },
    { num:5, text:"The chemical formula for water is:", options:{a:"H₂O₂",b:"HO",c:"H₂O",d:"H₃O"} },
  ],
  answerKey: {1:"b",2:"c",3:"d",4:"b",5:"c"},
};

// ─── Shared tiny components ───────────────────────────────────────────────────
function ProgressBar({ value, color = "var(--accent)", height = 5 }) {
  return (
    <div style={{ width:"100%", height, background:"var(--surface2)", borderRadius:99, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,value)}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.4s ease" }} />
    </div>
  );
}

// ─── ShareModal ───────────────────────────────────────────────────────────────
function ShareModal({ quizData, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = getShareURL(quizData);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { /* fallback */ }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="fu" style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:"var(--r)", padding:28, maxWidth:480, width:"100%" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <p style={{ fontWeight:700, fontSize:17 }}>🔗 Share this quiz</p>
            <p style={{ color:"var(--muted)", fontSize:12, marginTop:3 }}>Anyone with the link can take it — no app needed</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:99, background:"var(--surface2)", border:"1px solid var(--border2)", color:"var(--muted)", fontSize:16 }}>×</button>
        </div>

        <div style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:"var(--rs)", padding:"12px 14px", marginBottom:14, display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ flex:1, fontSize:12, color:"var(--muted)", fontFamily:"var(--mono)", wordBreak:"break-all", lineHeight:1.5 }}>
            {url ? url.slice(0,80) + (url.length > 80 ? "…" : "") : "Error generating link"}
          </span>
        </div>

        <button onClick={copy} style={{ width:"100%", padding:14, background: copied ? "var(--success)" : "linear-gradient(135deg, var(--accent), var(--accent2))", border:"none", borderRadius:"var(--rs)", color:"#000", fontWeight:700, fontSize:15, transition:"background 0.3s" }}>
          {copied ? "✓ Copied to clipboard!" : "Copy Link"}
        </button>

        <div style={{ marginTop:14, padding:"12px 14px", background:"rgba(110,231,183,0.06)", border:"1px solid rgba(110,231,183,0.2)", borderRadius:"var(--rs)" }}>
          <p style={{ fontSize:12, color:"var(--accent)", fontWeight:600, marginBottom:4 }}>📋 How sharing works</p>
          <p style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6 }}>
            The quiz is encoded directly in the URL — no server, no login. When someone opens the link, they jump straight to the quiz. Answer key stays hidden until they finish. ✓
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── UploadScreen ─────────────────────────────────────────────────────────────
function PhotoCard({ label, sublabel, icon, color, file, preview, onFile, disabled }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const onDrop = e => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) onFile(f);
  };

  return (
    <div style={{ flex:1, minWidth:0 }}>
      <p style={{ fontSize:10, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:7 }}>{label}</p>
      <div
        onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={onDrop}
        onClick={() => !disabled && ref.current.click()}
        style={{ border:`2px dashed ${drag ? color : file ? color+"66" : "var(--border2)"}`, borderRadius:"var(--r)", padding:"18px 12px", textAlign:"center", cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1, background:file?color+"11":"transparent", transition:"all .2s", minHeight:140, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}
      >
        <input ref={ref} type="file" accept="image/*" capture="environment" onChange={e=>onFile(e.target.files[0])} style={{display:"none"}} />
        {preview
          ? <><img src={preview} alt={label} style={{ width:"100%", maxHeight:120, objectFit:"contain", borderRadius:8 }} /><p style={{ fontSize:11, color, fontWeight:600, margin:0 }}>✓ Loaded — tap to change</p></>
          : <><span style={{fontSize:36}}>{icon}</span><p style={{fontSize:13,fontWeight:600,margin:0}}>{sublabel}</p><p style={{fontSize:11,color:"var(--muted)",margin:0}}>Tap or drag & drop</p></>
        }
      </div>
    </div>
  );
}

function UploadScreen({ onDone, history }) {
  const [subject, setSubject] = useState("");
  const [qFile, setQFile] = useState(null); const [aFile, setAFile] = useState(null);
  const [qPrev, setQPrev] = useState(null); const [aPrev, setAPrev] = useState(null);
  const [savedKey, setSavedKey] = useState(() => { try { return getApiKey(); } catch { return ""; } });
  const [keyInput, setKeyInput] = useState("");
  const [keyEdit, setKeyEdit] = useState(() => !hasApiKey());
  const [phase, setPhase] = useState("idle");
  const [qPct, setQPct] = useState(0); const [aPct, setAPct] = useState(0);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upload");

  const saveKey = () => {
    const k = keyInput.trim(); if (!k) return;
    setApiKey(k); setSavedKey(k); setKeyEdit(false); setKeyInput("");
  };

  const handleQFile = async f => { if (!f) return; setQFile(f); setQPrev(await fileToDataURL(f)); };
  const handleAFile = async f => { if (!f) return; setAFile(f); setAPrev(await fileToDataURL(f)); };

  const isProc = phase === "ocr-q" || phase === "ocr-a";
  const canStart = qFile && aFile && !isProc;

  const handleProcess = async () => {
    if (!qFile || !aFile) return;
    setError(""); setPhase("ocr-q"); setQPct(0); setAPct(0);
    try {
      const qRaw = await runQuestionOCR(qFile, setQPct);
      setPhase("ocr-a");
      const aRaw = await runAnswerOCR(aFile, setAPct);
      setPhase("done");
      let questions;
      try { const c = qRaw.replace(/```json|```/g,"").trim(); questions = JSON.parse(c).questions || []; }
      catch { questions = parseQuestions(qRaw); }
      const answerKey = parseAnswerKey(aRaw);
      if (!questions.length) { setError("No questions found. Check the image is clear and questions are numbered."); setPhase("idle"); return; }
      if (!Object.keys(answerKey).length) { setError("No answers found. Check the answer key image."); setPhase("idle"); return; }
      onDone({ questions, answerKey, subject: subject.trim() || "Untitled Quiz" });
    } catch(e) {
      if (e.message === "NO_API_KEY" || e.message === "INVALID_API_KEY") { setKeyEdit(true); setError(e.message === "INVALID_API_KEY" ? "Invalid API key — re-enter your Gemini key." : "Enter your Gemini API key first."); }
      else setError("OCR failed: " + (e.message || "Try a clearer photo."));
      setPhase("idle");
    }
  };

  const phaseStep = phase==="ocr-q"?1:phase==="ocr-a"?2:phase==="done"?3:0;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      <header style={{ padding:"16px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, background:"linear-gradient(135deg,var(--accent),var(--accent2))", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📸</div>
          <span style={{ fontWeight:700, fontSize:18, letterSpacing:"-0.5px" }}>PhotoQuiz</span>
        </div>
        <nav style={{ display:"flex", gap:4 }}>
          <button onClick={() => setKeyEdit(e=>!e)} style={{ padding:"7px 12px", borderRadius:99, background:"transparent", color:savedKey?"var(--accent)":"var(--danger)", fontSize:12, border:"1px solid transparent" }} title={savedKey?"API key set":"No API key"}>🔑</button>
          {["upload","history"].map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{ padding:"7px 16px", borderRadius:99, background:tab===t?"var(--surface2)":"transparent", color:tab===t?"var(--text)":"var(--muted)", fontSize:13, fontWeight:500, border:tab===t?"1px solid var(--border2)":"1px solid transparent", transition:"all .2s" }}>
              {t==="upload"?"📸 Scan":"📊 History"}
            </button>
          ))}
        </nav>
      </header>

      {tab === "upload" ? (
        <main style={{ flex:1, padding:"22px 20px", maxWidth:540, margin:"0 auto", width:"100%" }}>
          <div className="fu" style={{ marginBottom:22 }}>
            <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:"-0.8px", lineHeight:1.25, marginBottom:8 }}>Photo → Quiz in seconds</h1>
            <p style={{ color:"var(--muted)", fontSize:13, lineHeight:1.6 }}>Snap your <span style={{color:"var(--accent)",fontWeight:600}}>question sheet</span> and <span style={{color:"var(--accent2)",fontWeight:600}}>answer key</span>. Then share with anyone via a link.</p>
          </div>

          {/* API Key */}
          <div className="fu" style={{ marginBottom:16, background:"var(--surface)", border:`1px solid ${savedKey&&!keyEdit?"var(--border)":"var(--accent)"}`, borderRadius:"var(--r)", padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:keyEdit?10:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{fontSize:16}}>{savedKey&&!keyEdit?"✅":"🔑"}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, margin:0, color:savedKey&&!keyEdit?"var(--success)":"var(--accent)" }}>{savedKey&&!keyEdit?"Gemini API key saved":"Gemini API key required (free)"}</p>
                  {savedKey&&!keyEdit && <p style={{fontSize:11,color:"var(--muted)",margin:0}}>{savedKey.slice(0,8)}••••••••</p>}
                </div>
              </div>
              {savedKey && <button onClick={()=>setKeyEdit(e=>!e)} style={{fontSize:12,color:"var(--muted)",background:"transparent",border:"1px solid var(--border)",borderRadius:6,padding:"4px 10px"}}>{keyEdit?"Cancel":"Change"}</button>}
            </div>
            {keyEdit && (
              <>
                <p style={{fontSize:11,color:"var(--muted)",marginBottom:8,lineHeight:1.6}}>Free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{color:"var(--accent)",fontWeight:600}}>aistudio.google.com/apikey</a></p>
                <div style={{display:"flex",gap:8}}>
                  <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveKey()} placeholder="Paste your AIza… key" style={{flex:1,padding:"10px 14px",background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:"var(--rs)",fontSize:13,outline:"none"}} autoFocus />
                  <button onClick={saveKey} disabled={!keyInput.trim()} style={{padding:"10px 16px",borderRadius:"var(--rs)",background:keyInput.trim()?"var(--accent)":"var(--surface2)",color:keyInput.trim()?"#000":"var(--muted)",fontWeight:700,fontSize:13,cursor:keyInput.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>Save →</button>
                </div>
              </>
            )}
          </div>

          {/* Subject */}
          <div className="fu1" style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:7}}>Subject Name (optional)</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Biology Chapter 5" style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--rs)",fontSize:15,outline:"none"}} onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--border)"} />
          </div>

          {/* Photos */}
          <div className="fu1" style={{display:"flex",gap:12,marginBottom:16}}>
            <PhotoCard label="① Questions" sublabel="Photo of question sheet" icon="📄" color="var(--accent)" file={qFile} preview={qPrev} onFile={handleQFile} disabled={isProc} />
            <PhotoCard label="② Answers" sublabel="Photo of answer key" icon="🔑" color="var(--accent2)" file={aFile} preview={aPrev} onFile={handleAFile} disabled={isProc} />
          </div>

          {/* Processing */}
          {isProc && (
            <div className="fu" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r)",padding:"20px 22px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",marginBottom:18}}>
                {[{n:1,label:"Questions"},{n:2,label:"Answer Key"},{n:3,label:"Build Quiz"}].map((s,i) => (
                  <><div key={s.n} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{width:28,height:28,borderRadius:99,background:phaseStep>s.n?"var(--success)":phaseStep===s.n?"var(--accent)":"var(--surface2)",border:`2px solid ${phaseStep>s.n?"var(--success)":phaseStep===s.n?"var(--accent)":"var(--border2)"}`,color:phaseStep>=s.n?"#000":"var(--muted)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,transition:"all .3s"}}>{phaseStep>s.n?"✓":s.n}</div>
                    <span style={{fontSize:10,color:phaseStep>=s.n?"var(--text)":"var(--muted)",fontWeight:phaseStep===s.n?600:400,whiteSpace:"nowrap"}}>{s.label}</span>
                  </div>{i<2&&<div key={`l${i}`} style={{flex:1,height:2,background:phaseStep>s.n?"var(--success)":"var(--border)",margin:"0 4px",marginBottom:22,transition:"background .4s"}} />}</>
                ))}
              </div>
              <p style={{fontWeight:600,fontSize:14,marginBottom:4,textAlign:"center"}}>{phase==="ocr-q"?"🔍 Reading question sheet…":"🔑 Reading answer key…"}</p>
              <ProgressBar value={phase==="ocr-q"?qPct:aPct} color={phase==="ocr-a"?"var(--accent2)":"var(--accent)"} />
            </div>
          )}

          {error && <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"var(--rs)",padding:"11px 15px",color:"var(--danger)",fontSize:13,marginBottom:12,lineHeight:1.5}}>⚠️ {error}</div>}

          {!isProc && (
            <button onClick={handleProcess} disabled={!canStart} className="fu2" style={{width:"100%",padding:16,background:canStart?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface2)",border:"none",borderRadius:"var(--r)",color:canStart?"#000":"var(--muted)",fontWeight:700,fontSize:16,marginBottom:14,opacity:canStart?1:0.7,cursor:canStart?"pointer":"not-allowed",transition:"all .2s"}}>
              {!qFile&&!aFile?"↑ Upload both photos to start":!qFile?"↑ Upload question sheet too":!aFile?"↑ Upload answer key too":"Scan & Build Quiz →"}
            </button>
          )}

          <div className="fu3" style={{display:"flex",gap:10,alignItems:"center",margin:"4px 0 10px"}}>
            <div style={{flex:1,height:1,background:"var(--border)"}} />
            <span style={{color:"var(--muted)",fontSize:12}}>or try a sample</span>
            <div style={{flex:1,height:1,background:"var(--border)"}} />
          </div>
          <button onClick={()=>onDone(SAMPLE)} className="fu3" style={{width:"100%",padding:13,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--rs)",color:"var(--muted)",fontSize:14,fontWeight:500,marginBottom:24}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--muted)"}}>
            🧪 Load sample quiz →
          </button>
        </main>
      ) : (
        <main style={{flex:1,padding:"22px 20px",maxWidth:540,margin:"0 auto",width:"100%"}}>
          {history.length === 0
            ? <div style={{textAlign:"center",padding:"60px 20px",color:"var(--muted)"}}>
                <div style={{fontSize:48,marginBottom:16}}>📊</div>
                <p style={{fontWeight:600,fontSize:16,color:"var(--text)",marginBottom:8}}>No quiz history yet</p>
                <p style={{fontSize:14}}>Complete a quiz to see your results here.</p>
              </div>
            : history.slice().reverse().map((s,i) => (
                <div key={s.id||i} className="fu" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r)",padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <p style={{fontWeight:600,fontSize:14}}>{s.subject}</p>
                    <p style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{new Date(s.date).toLocaleDateString()} · {s.correct}/{s.total} correct</p>
                  </div>
                  <div style={{fontSize:22,fontWeight:700,color:s.pct>=80?"var(--success)":s.pct>=60?"var(--accent)":"var(--danger)"}}>{s.pct}%</div>
                </div>
              ))
          }
        </main>
      )}
    </div>
  );
}

// ─── EditScreen ───────────────────────────────────────────────────────────────
function EditScreen({ data, onConfirm, onBack, onShare }) {
  const [questions, setQuestions] = useState(data.questions);
  const [answerKey, setAnswerKey] = useState(data.answerKey);
  const [rawKey, setRawKey] = useState(() => answerKeyToRaw(data.answerKey));
  const [showShare, setShowShare] = useState(false);

  const updateQText = (i, v) => setQuestions(qs => qs.map((q,j) => j===i ? {...q,text:v} : q));
  const updateOpt = (i, opt, v) => setQuestions(qs => qs.map((q,j) => j===i ? {...q,options:{...q.options,[opt]:v}} : q));
  const handleKeyChange = v => { setRawKey(v); setAnswerKey(parseAnswerKey(v)); };
  const addQ = () => { const n = questions.length>0?Math.max(...questions.map(q=>q.num))+1:1; setQuestions(qs => [...qs,{num:n,text:"New question text here",options:{a:"",b:"",c:"",d:""}}]); };
  const removeQ = i => setQuestions(qs => qs.filter((_,j)=>j!==i));
  const missing = questions.filter(q=>!answerKey[q.num]).length;
  const optColors = {a:"#818cf8",b:"#6ee7b7",c:"#fb923c",d:"#f472b6"};
  const currentQuizData = { questions, answerKey, subject: data.subject };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      {showShare && <ShareModal quizData={currentQuizData} onClose={() => setShowShare(false)} />}

      <header style={{position:"sticky",top:0,zIndex:10,background:"rgba(13,15,20,0.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid var(--border)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{width:38,height:38,borderRadius:99,background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text)",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div>
            <p style={{fontWeight:600,fontSize:15,lineHeight:1}}>Review & Edit</p>
            <p style={{color:"var(--muted)",fontSize:12,marginTop:2}}>{questions.length} question{questions.length!==1?"s":""}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={() => setShowShare(true)} style={{padding:"10px 18px",background:"var(--surface)",border:"1px solid var(--accent)",borderRadius:99,color:"var(--accent)",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
            🔗 Share
          </button>
          <button onClick={() => onConfirm({questions,answerKey})} style={{padding:"10px 18px",background:"var(--accent)",border:"none",borderRadius:99,color:"#000",fontWeight:700,fontSize:13}}>
            Start Quiz →
          </button>
        </div>
      </header>

      <main style={{padding:"20px",maxWidth:560,margin:"0 auto",width:"100%"}}>
        {/* Share banner */}
        <div className="fu" style={{background:"rgba(110,231,183,0.06)",border:"1px solid rgba(110,231,183,0.25)",borderRadius:"var(--r)",padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>🔗</span>
          <div style={{flex:1}}>
            <p style={{fontWeight:600,fontSize:13,color:"var(--accent)"}}>Quiz ready to share!</p>
            <p style={{fontSize:12,color:"var(--muted)",marginTop:2,lineHeight:1.5}}>Edit questions below, then hit <strong style={{color:"var(--text)"}}>Share</strong> to get a link anyone can open to take the quiz.</p>
          </div>
          <button onClick={() => setShowShare(true)} style={{padding:"8px 14px",background:"var(--accent)",border:"none",borderRadius:8,color:"#000",fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>
            Get Link
          </button>
        </div>

        {missing > 0 && (
          <div style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.4)",borderRadius:"var(--rs)",padding:"12px 16px",marginBottom:18,fontSize:14,color:"var(--accent3)"}}>
            ⚠️ {missing} question{missing>1?"s are":" is"} missing an answer.
          </div>
        )}

        {/* Answer key */}
        <section style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r)",padding:20,marginBottom:22}}>
          <p style={{fontWeight:600,fontSize:14,color:"var(--accent)",marginBottom:4}}>🔑 Answer Key</p>
          <p style={{color:"var(--muted)",fontSize:12,marginBottom:12}}>Format: <code style={{fontFamily:"var(--mono)"}}>1.a 2.b 3.c</code></p>
          <textarea value={rawKey} onChange={e=>handleKeyChange(e.target.value)} rows={3} style={{width:"100%",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--rs)",color:"var(--text)",padding:"10px 14px",fontSize:14,fontFamily:"var(--mono)",resize:"vertical",outline:"none",lineHeight:1.7}} />
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:12}}>
            {Object.entries(answerKey).sort(([a],[b])=>parseInt(a)-parseInt(b)).map(([n,a]) => (
              <span key={n} style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:6,padding:"3px 10px",fontSize:12,fontFamily:"var(--mono)",color:"var(--accent)"}}>{n}:{a.toUpperCase()}</span>
            ))}
          </div>
        </section>

        {/* Questions */}
        {questions.map((q,i) => (
          <div key={`${q.num}-${i}`} className="fu" style={{background:"var(--surface)",border:`1px solid ${answerKey[q.num]?"var(--border)":"rgba(251,146,60,0.3)"}`,borderRadius:"var(--r)",padding:20,marginBottom:14}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:14}}>
              <span style={{background:answerKey[q.num]?"rgba(110,231,183,0.12)":"rgba(251,146,60,0.12)",border:`1px solid ${answerKey[q.num]?"var(--accent)":"var(--accent3)"}`,borderRadius:6,padding:"2px 9px",fontSize:12,fontFamily:"var(--mono)",color:answerKey[q.num]?"var(--accent)":"var(--accent3)",flexShrink:0,marginTop:2}}>Q{q.num}</span>
              <textarea value={q.text} onChange={e=>updateQText(i,e.target.value)} rows={2} style={{flex:1,background:"transparent",border:"none",color:"var(--text)",fontSize:14,fontWeight:500,resize:"none",outline:"none",padding:0,lineHeight:1.6,fontFamily:"var(--font)"}} />
              <button onClick={()=>removeQ(i)} style={{width:28,height:28,borderRadius:6,flexShrink:0,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",color:"var(--danger)",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {["a","b","c","d"].map(opt => {
                const isCorrect = answerKey[q.num] === opt;
                return (
                  <div key={opt} style={{display:"flex",gap:8,alignItems:"center",background:"var(--surface2)",borderRadius:"var(--rs)",padding:"9px 12px",border:`1px solid ${isCorrect?optColors[opt]+"80":"var(--border)"}`,transition:"border-color 0.2s"}}>
                    <span style={{fontSize:12,fontFamily:"var(--mono)",fontWeight:700,color:isCorrect?optColors[opt]:"var(--muted)",flexShrink:0,width:14,textAlign:"center"}}>{opt.toUpperCase()}</span>
                    <input value={q.options[opt]||""} onChange={e=>updateOpt(i,opt,e.target.value)} placeholder={`Option ${opt.toUpperCase()}`} style={{flex:1,background:"transparent",border:"none",color:"var(--text)",fontSize:13,outline:"none",minWidth:0,fontFamily:"var(--font)"}} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button onClick={addQ} style={{width:"100%",padding:14,background:"transparent",border:"1px dashed var(--border2)",borderRadius:"var(--rs)",color:"var(--muted)",fontSize:14,marginTop:4,marginBottom:16,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--accent)";e.currentTarget.style.color="var(--accent)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--muted)"}}>
          + Add Question Manually
        </button>

        <div style={{display:"flex",gap:10,marginBottom:24}}>
          <button onClick={() => setShowShare(true)} style={{flex:1,padding:17,background:"var(--surface)",border:"1px solid var(--accent)",borderRadius:"var(--r)",color:"var(--accent)",fontWeight:700,fontSize:15}}>
            🔗 Share Quiz
          </button>
          <button onClick={() => onConfirm({questions,answerKey})} style={{flex:1,padding:17,background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",borderRadius:"var(--r)",color:"#000",fontWeight:700,fontSize:15}}>
            Take Quiz →
          </button>
        </div>
      </main>
    </div>
  );
}

// ─── QuizScreen ───────────────────────────────────────────────────────────────
const OPT_COLORS = {
  a:{base:"#818cf8",bg:"rgba(129,140,248,0.15)"},
  b:{base:"#6ee7b7",bg:"rgba(110,231,183,0.15)"},
  c:{base:"#fb923c",bg:"rgba(251,146,60,0.15)"},
  d:{base:"#f472b6",bg:"rgba(244,114,182,0.15)"},
};

function QuizScreen({ questions, answerKey, subject, onFinish, isTaker = false }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const total = questions.length;
  const q = questions[idx];
  const progress = ((idx + (revealed ? 1 : 0)) / total) * 100;

  const choose = useCallback(opt => {
    if (revealed) return;
    setSelected(opt); setRevealed(true);
    setAnswers(prev => ({ ...prev, [q.num]: opt }));
  }, [revealed, q]);

  const next = useCallback(() => {
    if (idx < total - 1) { setIdx(i=>i+1); setSelected(null); setRevealed(false); setAnimKey(k=>k+1); }
    else onFinish({ ...answers, [q.num]: selected });
  }, [idx, total, answers, q, selected, onFinish]);

  const getState = opt => {
    if (!revealed) return "idle";
    const correct = answerKey[q.num];
    if (opt === correct) return "correct";
    if (opt === selected && opt !== correct) return "wrong";
    return "idle";
  };

  const correctOpt = revealed ? answerKey[q.num] : null;
  const isCorrect = revealed && selected === correctOpt;
  const opts = ["a","b","c","d"].filter(o => q.options[o]);

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      <header style={{position:"sticky",top:0,zIndex:10,background:"rgba(13,15,20,0.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid var(--border)",padding:"14px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,color:"var(--muted)",fontWeight:500}}>{subject}{isTaker ? " · Shared Quiz" : ""}</span>
          <span style={{fontSize:13,fontFamily:"var(--mono)",color:"var(--accent)"}}>{idx+1} / {total}</span>
        </div>
        <ProgressBar value={progress} />
      </header>

      <main style={{flex:1,padding:"24px 20px",maxWidth:580,margin:"0 auto",width:"100%",display:"flex",flexDirection:"column"}}>
        <div key={`q-${animKey}`} className="fu" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r)",padding:"22px 20px",marginBottom:20}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
            <span style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:6,padding:"3px 10px",fontSize:11,fontFamily:"var(--mono)",fontWeight:700,color:"var(--accent)",flexShrink:0}}>Q{q.num}</span>
            <span style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>{idx+1} of {total}</span>
          </div>
          <h2 style={{fontSize:19,fontWeight:600,lineHeight:1.6,letterSpacing:"-0.2px"}}>{q.text}</h2>
        </div>

        <div key={`opts-${animKey}`} style={{display:"flex",flexDirection:"column",gap:10,flex:1}}>
          {opts.map((opt, i) => {
            const state = getState(opt);
            const colors = OPT_COLORS[opt];
            const isSel = selected === opt;
            let borderColor="var(--border)", bgColor="var(--surface)", lblBg=colors.bg, lblColor=colors.base;
            if (state==="correct") { borderColor="var(--success)"; bgColor="rgba(74,222,128,0.08)"; lblBg="var(--success)"; lblColor="#000"; }
            else if (state==="wrong") { borderColor="var(--danger)"; bgColor="rgba(248,113,113,0.08)"; lblBg="var(--danger)"; lblColor="#fff"; }
            else if (isSel) { borderColor=colors.base; bgColor=colors.bg; }

            return (
              <button key={opt} onClick={()=>choose(opt)} style={{width:"100%",padding:"14px 18px",borderRadius:"var(--r)",background:bgColor,border:`2px solid ${borderColor}`,color:"var(--text)",textAlign:"left",display:"flex",alignItems:"center",gap:14,transition:"all .2s",cursor:revealed?"default":"pointer",minHeight:54,animation:`fadeUp 0.3s ${0.05*i}s ease both`}}>
                <span style={{width:32,height:32,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:lblBg,color:lblColor,fontFamily:"var(--mono)",fontSize:13,fontWeight:700,transition:"all .2s"}}>
                  {state==="correct"?"✓":state==="wrong"?"✗":opt.toUpperCase()}
                </span>
                <span style={{flex:1,fontSize:15,lineHeight:1.5}}>{q.options[opt]}</span>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="fu" style={{marginTop:20}}>
            <div style={{padding:"12px 18px",borderRadius:"var(--rs)",background:isCorrect?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${isCorrect?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`,color:isCorrect?"var(--success)":"var(--danger)",fontSize:14,fontWeight:600,marginBottom:14}}>
              {isCorrect ? "🎉 Correct!" : <span>❌ Incorrect — correct answer is <strong>{correctOpt?.toUpperCase()}</strong>{q.options[correctOpt] && <span style={{fontWeight:400,marginLeft:6}}>({q.options[correctOpt]})</span>}</span>}
            </div>
            <button onClick={next} style={{width:"100%",padding:16,background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",borderRadius:"var(--r)",color:"#000",fontWeight:700,fontSize:16,marginBottom:4}}>
              {idx<total-1?"Next Question →":"See My Results 🎉"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── ResultsScreen ────────────────────────────────────────────────────────────
function getGrade(pct) {
  if (pct>=90) return {letter:"A",color:"var(--success)",emoji:"🏆"};
  if (pct>=80) return {letter:"B",color:"#60a5fa",emoji:"🎉"};
  if (pct>=70) return {letter:"C",color:"var(--accent)",emoji:"👍"};
  if (pct>=60) return {letter:"D",color:"var(--accent3)",emoji:"📚"};
  return {letter:"F",color:"var(--danger)",emoji:"💪"};
}

function ResultsScreen({ questions, answers, answerKey, subject, onRetake, onHome, isTaker, quizData }) {
  const [showShare, setShowShare] = useState(false);
  const correct = questions.filter(q=>answers[q.num]===answerKey[q.num]).length;
  const total = questions.length;
  const pct = total>0?Math.round((correct/total)*100):0;
  const grade = getGrade(pct);
  const missed = questions.filter(q=>answers[q.num]!==answerKey[q.num]);

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      {showShare && <ShareModal quizData={quizData} onClose={()=>setShowShare(false)} />}
      <main style={{flex:1,padding:"24px 20px",maxWidth:580,margin:"0 auto",width:"100%"}}>
        <div className="fu" style={{textAlign:"center",padding:"32px 20px 24px"}}>
          <div style={{fontSize:40,marginBottom:14}}>{grade.emoji}</div>
          <div style={{width:110,height:110,borderRadius:"50%",background:`${grade.color}18`,border:`3px solid ${grade.color}`,margin:"0 auto 16px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"scoreReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) both"}}>
            <span style={{fontSize:38,fontWeight:700,color:grade.color,lineHeight:1}}>{grade.letter}</span>
          </div>
          <p style={{fontSize:46,fontWeight:700,letterSpacing:"-2px",color:grade.color,lineHeight:1}}>{pct}%</p>
          <p style={{color:"var(--muted)",fontSize:15,marginTop:6}}>{correct} out of {total} correct</p>
          <p style={{color:"var(--muted)",fontSize:13,marginTop:4}}>{subject}</p>
        </div>

        <div className="fu1" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
          {[{label:"Correct",val:correct,color:"var(--success)"},{label:"Wrong",val:total-correct,color:"var(--danger)"},{label:"Total",val:total,color:"var(--muted)"}].map(s=>(
            <div key={s.label} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--rs)",padding:"14px 10px",textAlign:"center"}}>
              <p style={{fontSize:26,fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</p>
              <p style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="fu2" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--rs)",padding:"16px 18px",marginBottom:22}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:13,color:"var(--muted)"}}>Score</span>
            <span style={{fontSize:13,fontFamily:"var(--mono)",color:grade.color}}>{pct}%</span>
          </div>
          <ProgressBar value={pct} color={grade.color} height={8} />
        </div>

        {missed.length>0 && (
          <div className="fu3" style={{marginBottom:24}}>
            <p style={{fontWeight:600,fontSize:14,color:"var(--danger)",marginBottom:14}}>❌ Missed Questions ({missed.length})</p>
            {missed.map(q=>(
              <div key={q.num} style={{background:"var(--surface)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"var(--rs)",padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:12,color:"var(--muted)",fontFamily:"var(--mono)"}}>Q{q.num}</span>
                  <div style={{display:"flex",gap:6}}>
                    <span style={{fontSize:12,background:"rgba(248,113,113,0.1)",color:"var(--danger)",padding:"2px 9px",borderRadius:4,fontFamily:"var(--mono)"}}>You: {(answers[q.num]||"—").toUpperCase()}</span>
                    <span style={{fontSize:12,background:"rgba(74,222,128,0.1)",color:"var(--success)",padding:"2px 9px",borderRadius:4,fontFamily:"var(--mono)"}}>✓ {answerKey[q.num]?.toUpperCase()||"?"}</span>
                  </div>
                </div>
                <p style={{fontSize:14,color:"var(--text)",lineHeight:1.6,marginBottom:8}}>{q.text}</p>
                {answerKey[q.num]&&q.options[answerKey[q.num]]&&(
                  <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:6,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,color:"var(--success)",fontWeight:700}}>{answerKey[q.num].toUpperCase()}.</span>
                    <span style={{fontSize:13,color:"var(--success)",lineHeight:1.5}}>{q.options[answerKey[q.num]]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {missed.length===0&&(
          <div className="fu3" style={{textAlign:"center",padding:"28px 20px",background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"var(--r)",marginBottom:24}}>
            <div style={{fontSize:36,marginBottom:10}}>🎯</div>
            <p style={{fontWeight:700,fontSize:16,color:"var(--success)",marginBottom:4}}>Perfect Score!</p>
            <p style={{color:"var(--muted)",fontSize:14}}>You answered every question correctly.</p>
          </div>
        )}

        <div className="fu4" style={{display:"flex",gap:12,marginBottom:24}}>
          <button onClick={onRetake} style={{flex:1,padding:16,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--rs)",color:"var(--text)",fontWeight:600,fontSize:15}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border2)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>↺ Retake</button>
          {!isTaker
            ? <button onClick={onHome} style={{flex:1,padding:16,background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",borderRadius:"var(--rs)",color:"#000",fontWeight:700,fontSize:15}}>New Quiz →</button>
            : <button onClick={() => setShowShare(true)} style={{flex:1,padding:16,background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",borderRadius:"var(--rs)",color:"#000",fontWeight:700,fontSize:15}}>🔗 Share Quiz</button>
          }
        </div>
      </main>
    </div>
  );
}

// ─── App state machine ─────────────────────────────────────────────────────────
const S = { UPLOAD:"upload", EDIT:"edit", QUIZ:"quiz", RESULTS:"results" };

export default function App() {
  const [screen, setScreen] = useState(S.UPLOAD);
  const [ocrData, setOcrData] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("pq_history_v1")||"[]"); } catch { return []; } });
  const [isTaker, setIsTaker] = useState(false);
  const [takerQuizData, setTakerQuizData] = useState(null);

  // Check URL hash for shared quiz
  useEffect(() => {
    const sharedQuiz = readHashQuiz();
    if (sharedQuiz) {
      setTakerQuizData(sharedQuiz);
      setQuizData(sharedQuiz);
      setIsTaker(true);
      setScreen(S.QUIZ);
    }
  }, []);

  const saveSession = useCallback((session) => {
    const newSession = { ...session, id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}` };
    setHistory(h => {
      const updated = [...h, newSession];
      try { localStorage.setItem("pq_history_v1", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const handleOCRDone = useCallback(data => { setOcrData(data); setScreen(S.EDIT); }, []);
  const handleConfirm = useCallback(({ questions, answerKey }) => {
    const qd = { questions, answerKey, subject: ocrData?.subject || "Quiz" };
    setQuizData(qd); setAnswers({}); setScreen(S.QUIZ); setIsTaker(false);
  }, [ocrData]);

  const handleFinish = useCallback(finalAnswers => {
    setAnswers(finalAnswers);
    if (quizData) {
      const correct = quizData.questions.filter(q=>finalAnswers[q.num]===quizData.answerKey[q.num]).length;
      const total = quizData.questions.length;
      const pct = total>0?Math.round((correct/total)*100):0;
      saveSession({ date:new Date().toISOString(), subject:quizData.subject, correct, total, pct, missedNums:quizData.questions.filter(q=>finalAnswers[q.num]!==quizData.answerKey[q.num]).map(q=>q.num) });
    }
    setScreen(S.RESULTS);
  }, [quizData, saveSession]);

  const handleRetake = useCallback(() => { setAnswers({}); setScreen(S.QUIZ); }, []);
  const handleHome = useCallback(() => {
    window.location.hash = ""; // clear share hash
    setOcrData(null); setQuizData(null); setAnswers({}); setScreen(S.UPLOAD); setIsTaker(false);
  }, []);

  return (
    <>
      <style>{GLOBAL_STYLE}</style>
      {screen===S.UPLOAD && !isTaker && <UploadScreen onDone={handleOCRDone} history={history} />}
      {screen===S.EDIT && ocrData && <EditScreen data={ocrData} onConfirm={handleConfirm} onBack={()=>setScreen(S.UPLOAD)} />}
      {screen===S.QUIZ && quizData && <QuizScreen questions={quizData.questions} answerKey={quizData.answerKey} subject={quizData.subject} onFinish={handleFinish} isTaker={isTaker} />}
      {screen===S.RESULTS && quizData && <ResultsScreen questions={quizData.questions} answers={answers} answerKey={quizData.answerKey} subject={quizData.subject} onRetake={handleRetake} onHome={handleHome} isTaker={isTaker} quizData={quizData} />}
    </>
  );
}
