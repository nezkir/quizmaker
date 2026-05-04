import React, { useState, useRef, useCallback, useEffect } from 'react';
import { runQuestionOCR, runAnswerOCR, fileToDataURL, getApiKey, setApiKey, hasApiKey } from '../utils/ocr';
import { parseQuestions, parseAnswerKey, mergeQuizData } from '../utils/parser';
import ProgressBar from './ProgressBar';
import HistoryTab from './HistoryTab';

/* ── Sample data ── */
const SAMPLE = {
  subject: 'Science Mixed — Sample',
  questions: [
    { num:1, text:'What is the powerhouse of the cell?',              options:{a:'Nucleus',b:'Mitochondria',c:'Ribosome',d:'Golgi body'} },
    { num:2, text:'Which planet is closest to the Sun?',              options:{a:'Earth',b:'Venus',c:'Mercury',d:'Mars'} },
    { num:3, text:'What is $12 \\times 12$?',                         options:{a:'$124$',b:'$144$',c:'$132$',d:'$148$'} },
    { num:4, text:'Who wrote "Romeo and Juliet"?',                    options:{a:'Charles Dickens',b:'Mark Twain',c:'William Shakespeare',d:'Jane Austen'} },
    { num:5, text:'What is the chemical symbol for Gold?',            options:{a:'Go',b:'Gd',c:'Gl',d:'Au'} },
    { num:6, text:'Kinetic energy is given by:',                      options:{a:'$mv$',b:'$\\frac{1}{2}mv^2$',c:'$mv^2$',d:'$2mv$'} },
    { num:7, text:'The chemical formula for water is:',               options:{a:'$H_2O_2$',b:'$HO$',c:'$H_2O$',d:'$H_3O$'} },
    { num:8, text:'In which phase do chromosomes align at the equator?', options:{a:'Prophase',b:'Telophase',c:'Anaphase',d:'Metaphase'} },
    { num:9, text:'The ratio of circumference to diameter of a circle is:', options:{a:'$2$',b:'$\\pi$',c:'$\\frac{\\pi}{2}$',d:'$2\\pi$'} },
    { num:10, text:'What is $\\sqrt{144}$?', options:{a:'$10$',b:'$11$',c:'$12$',d:'$13$'} },
  ],
  answerKey:{1:'b',2:'c',3:'b',4:'c',5:'d',6:'b',7:'c',8:'d',9:'b',10:'c'},
};

/* ── Photo upload card ── */
function PhotoCard({ label, sublabel, icon, color, file, previewURL, onFile, accept, disabled }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  };

  return (
    <div style={{flex:1,minWidth:0}}>
      <p style={{fontSize:10,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>
        {label}
      </p>
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={()=>setDragging(false)}
        onDrop={handleDrop}
        onClick={()=>!disabled && ref.current.click()}
        style={{
          border:`2px dashed ${dragging ? color : file ? color+'66' : 'var(--border2)'}`,
          borderRadius:'var(--r)',
          padding:'18px 12px',
          textAlign:'center',
          cursor:disabled ? 'not-allowed' : 'pointer',
          opacity:disabled ? 0.5 : 1,
          background: file ? color+'11' : 'transparent',
          transition:'all .2s',
          minHeight:140,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,
        }}
        onMouseEnter={e=>{if(!disabled&&!file)e.currentTarget.style.borderColor=color}}
        onMouseLeave={e=>{if(!disabled&&!file)e.currentTarget.style.borderColor='var(--border2)'}}
      >
        <input ref={ref} type="file" accept={accept||'image/*'} capture="environment"
          onChange={e=>onFile(e.target.files[0])} style={{display:'none'}} />

        {previewURL ? (
          <>
            <img src={previewURL} alt={label}
              style={{width:'100%',maxHeight:120,objectFit:'contain',borderRadius:8,display:'block'}} />
            <p style={{fontSize:11,color,fontWeight:600,margin:0}}>✓ Loaded — tap to change</p>
          </>
        ) : (
          <>
            <span style={{fontSize:36}}>{icon}</span>
            <p style={{fontSize:13,fontWeight:600,margin:0}}>{sublabel}</p>
            <p style={{fontSize:11,color:'var(--muted)',margin:0}}>Tap or drag & drop</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Step indicator ── */
function Step({ n, label, active, done }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
      <div style={{
        width:28,height:28,borderRadius:99,
        background: done ? 'var(--ok)' : active ? 'var(--accent)' : 'var(--surface2)',
        border: `2px solid ${done ? 'var(--ok)' : active ? 'var(--accent)' : 'var(--border2)'}`,
        color: done||active ? '#000' : 'var(--muted)',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontWeight:700,fontSize:13,transition:'all .3s',
      }}>
        {done ? '✓' : n}
      </div>
      <span style={{fontSize:10,color:active||done?'var(--text)':'var(--muted)',fontWeight:active?600:400,whiteSpace:'nowrap'}}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }) {
  return (
    <div style={{flex:1,height:2,background:done?'var(--ok)':'var(--border)',margin:'0 4px',marginBottom:22,transition:'background .4s'}} />
  );
}

/* ── Main component ── */
export default function UploadScreen({ onOCRDone, history, stats }) {
  const [tab, setTab]         = useState('upload');
  const [subject, setSubject] = useState('');

  // Files + previews
  const [qFile, setQFile]     = useState(null);
  const [aFile, setAFile]     = useState(null);
  const [qPreview, setQPreview] = useState(null);
  const [aPreview, setAPreview] = useState(null);

  // API key — read from localStorage safely, fallback to empty string
  const [savedKey, setSavedKey] = useState(() => { try { return getApiKey(); } catch { return ''; } });
  const [keyInput, setKeyInput] = useState('');
  const [keyEditing, setKeyEditing] = useState(() => { try { return !hasApiKey(); } catch { return true; } });

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    try { setApiKey(k); } catch {}
    setSavedKey(k);
    setKeyEditing(false);
    setKeyInput('');
  };

  // OCR state
  const [phase, setPhase]     = useState('idle'); // idle|ocr-q|ocr-a|done|error
  const [qPct, setQPct]       = useState(0);
  const [aPct, setAPct]       = useState(0);
  const [error, setError]     = useState('');

  const handleQFile = useCallback(async (f) => {
    if (!f) return;
    setQFile(f);
    const url = await fileToDataURL(f);
    setQPreview(url);
  }, []);

  const handleAFile = useCallback(async (f) => {
    if (!f) return;
    setAFile(f);
    const url = await fileToDataURL(f);
    setAPreview(url);
  }, []);

  const handleProcess = async () => {
    if (!qFile || !aFile) return;
    setError(''); setPhase('ocr-q'); setQPct(0); setAPct(0);

    try {
      // Step 1: OCR question sheet
      const qRaw = await runQuestionOCR(qFile, setQPct);

      // Step 2: OCR answer key sheet
      setPhase('ocr-a');
      const aRaw = await runAnswerOCR(aFile, setAPct);

      // Step 3: Parse & merge
      setPhase('done');

      // Claude Vision returns JSON for questions — parse it directly.
      // Fall back to text parser if JSON parsing fails.
      let questions;
      try {
        const clean = qRaw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        questions = parsed.questions || [];
      } catch {
        // Fallback: treat as plain OCR text
        questions = parseQuestions(qRaw);
      }

      const answerKey = parseAnswerKey(aRaw);
      const { questions: qs, answerKey: ak } = mergeQuizData(questions, answerKey);

      if (qs.length === 0) {
        setError('No questions found in the question photo. Make sure questions are numbered (1. 2. 3.) and the image is clear.');
        setPhase('idle'); return;
      }
      if (Object.keys(ak).length === 0) {
        setError('No answers found in the answer photo. Make sure answers are formatted like "1.A 2.B" and the image is clear.');
        setPhase('idle'); return;
      }

      onOCRDone({
        questions: qs, answerKey: ak,
        rawText: qRaw,
        subject: subject.trim() || 'Untitled Quiz',
        imageUrl: qPreview,
      });
    } catch (e) {
      if (e.message === 'NO_API_KEY' || e.message === 'INVALID_API_KEY') {
        setKeyEditing(true);
        setError(e.message === 'INVALID_API_KEY'
          ? 'Invalid API key — please check and re-enter your Gemini key.'
          : 'Please enter your Gemini API key first.');
      } else {
        setError('OCR failed: ' + (e.message || 'Unknown error. Try a clearer photo.'));
      }
      setPhase('idle');
    }
  };

  const isProcessing = phase === 'ocr-q' || phase === 'ocr-a';
  const canStart     = qFile && aFile && !isProcessing;

  const phaseStep = phase === 'ocr-q' ? 1 : phase === 'ocr-a' ? 2 : phase === 'done' ? 3 : 0;

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      {/* ── Header ── */}
      <header style={{padding:'16px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:38,height:38,background:'linear-gradient(135deg,var(--accent),var(--accent2))',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
            📸
          </div>
          <span style={{fontWeight:700,fontSize:18,letterSpacing:'-0.5px'}}>PhotoQuiz</span>
        </div>
        <nav style={{display:'flex',gap:4}}>
          <button onClick={()=>setKeyEditing(e=>!e)} style={{padding:'7px 12px',borderRadius:99,background:'transparent',color:savedKey?'var(--accent)':'var(--danger)',fontSize:12,border:'1px solid transparent'}} title={savedKey?'API key set — click to change':'No API key set'}>🔑</button>
          {['upload','history'].map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 16px',borderRadius:99,
              background:tab===t?'var(--surface2)':'transparent',
              color:tab===t?'var(--text)':'var(--muted)',
              fontSize:13,fontWeight:500,
              border:tab===t?'1px solid var(--border2)':'1px solid transparent',
              transition:'all .2s',
            }}>
              {t==='upload'?'📸 Scan':'📊 History'}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'upload' ? (
        <main style={{flex:1,padding:'22px 20px',maxWidth:540,margin:'0 auto',width:'100%'}}>

          {/* Hero */}
          <div className="fade-up" style={{marginBottom:22}}>
            <h1 style={{fontSize:26,fontWeight:700,letterSpacing:'-0.8px',lineHeight:1.25,marginBottom:8}}>
              Photo → Quiz in seconds
            </h1>
            <p style={{color:'var(--muted)',fontSize:13,lineHeight:1.6}}>
              Snap your <span style={{color:'var(--accent)',fontWeight:600}}>question sheet</span> and your <span style={{color:'var(--accent2)',fontWeight:600}}>answer key</span> separately. Claude Vision reads fractions, roots, ratios and all math notation accurately.
            </p>
          </div>

          {/* ── API Key Card ── */}
          <div className="fade-up" style={{marginBottom:16,background:'var(--surface)',border:`1px solid ${savedKey && !keyEditing ? 'var(--border)' : 'var(--accent)'}`,borderRadius:'var(--r)',padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: keyEditing ? 10 : 0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>{savedKey && !keyEditing ? '✅' : '🔑'}</span>
                <div>
                  <p style={{fontSize:12,fontWeight:700,margin:0,color: savedKey && !keyEditing ? 'var(--success)' : 'var(--accent)'}}>
                    {savedKey && !keyEditing ? 'Gemini API key saved' : 'Gemini API key required (free)'}
                  </p>
                  {savedKey && !keyEditing && (
                    <p style={{fontSize:11,color:'var(--muted)',margin:0}}>
                      {savedKey.slice(0,8)}••••••••
                    </p>
                  )}
                </div>
              </div>
              {savedKey && (
                <button onClick={()=>setKeyEditing(e=>!e)} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'1px solid var(--border)',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>
                  {keyEditing ? 'Cancel' : 'Change'}
                </button>
              )}
            </div>
            {keyEditing && (
              <>
                <p style={{fontSize:11,color:'var(--muted)',marginBottom:8,lineHeight:1.6}}>
                  Get a free key at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{color:'var(--accent)',fontWeight:600}}>
                    aistudio.google.com/apikey
                  </a>
                  {' '}— free tier, no billing or credit card needed.
                </p>
                <div style={{display:'flex',gap:8}}>
                  <input
                    value={keyInput}
                    onChange={e=>setKeyInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter' && saveKey()}
                    placeholder="Paste your AIza... key here"
                    style={{flex:1,padding:'10px 14px',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:'var(--rs)',color:'var(--text)',fontSize:13,outline:'none'}}
                    onFocus={e=>e.target.style.borderColor='var(--accent)'}
                    onBlur={e=>e.target.style.borderColor='var(--border2)'}
                    autoFocus
                  />
                  <button onClick={saveKey} disabled={!keyInput.trim()} style={{
                    padding:'10px 16px',borderRadius:'var(--rs)',
                    background:keyInput.trim()?'var(--accent)':'var(--surface2)',
                    color:keyInput.trim()?'#000':'var(--muted)',
                    fontWeight:700,fontSize:13,border:'none',
                    cursor:keyInput.trim()?'pointer':'not-allowed',whiteSpace:'nowrap',
                  }}>Save →</button>
                </div>
              </>
            )}
          </div>

          {/* Subject */}
          <div className="fade-up-d1" style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:7}}>
              Subject Name (optional)
            </label>
            <input value={subject} onChange={e=>setSubject(e.target.value)}
              placeholder="e.g. Biology Chapter 5"
              style={{width:'100%',padding:'12px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rs)',color:'var(--text)',fontSize:15,outline:'none'}}
              onFocus={e=>e.target.style.borderColor='var(--accent)'}
              onBlur={e=>e.target.style.borderColor='var(--border)'}
            />
          </div>

          {/* Two photo cards */}
          <div className="fade-up-d1" style={{display:'flex',gap:12,marginBottom:16}}>
            <PhotoCard
              label="① Questions"
              sublabel="Photo of question sheet"
              icon="📄"
              color="var(--accent)"
              file={qFile}
              previewURL={qPreview}
              onFile={handleQFile}
              disabled={isProcessing}
            />
            <PhotoCard
              label="② Answers"
              sublabel="Photo of answer key"
              icon="🔑"
              color="var(--accent2)"
              file={aFile}
              previewURL={aPreview}
              onFile={handleAFile}
              disabled={isProcessing}
            />
          </div>

          {/* Progress panel */}
          {isProcessing && (
            <div className="fade-up" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'20px 22px',marginBottom:14}}>
              {/* Step indicators */}
              <div style={{display:'flex',alignItems:'center',marginBottom:18}}>
                <Step n={1} label="Questions" active={phase==='ocr-q'} done={phaseStep>1} />
                <StepLine done={phaseStep>1} />
                <Step n={2} label="Answer Key" active={phase==='ocr-a'} done={phaseStep>2} />
                <StepLine done={phaseStep>2} />
                <Step n={3} label="Build Quiz" active={false} done={phaseStep>=3} />
              </div>

              {phase === 'ocr-q' && (
                <>
                  <p style={{fontWeight:600,fontSize:14,marginBottom:4,textAlign:'center'}}>
                    🔍 Reading question sheet…
                  </p>
                  <p style={{color:'var(--muted)',fontSize:12,marginBottom:12,textAlign:'center'}}>
                    Gemini is reading your questions & math
                  </p>
                  <ProgressBar value={qPct} />
                  <p style={{color:'var(--accent)',fontSize:12,marginTop:6,textAlign:'center',fontFamily:'monospace'}}>{qPct}%</p>
                </>
              )}
              {phase === 'ocr-a' && (
                <>
                  <p style={{fontWeight:600,fontSize:14,marginBottom:4,textAlign:'center'}}>
                    🔑 Reading answer key…
                  </p>
                  <p style={{color:'var(--muted)',fontSize:12,marginBottom:12,textAlign:'center'}}>
                    Extracting answer letters
                  </p>
                  <ProgressBar value={aPct} color="var(--accent2)" />
                  <p style={{color:'var(--accent2)',fontSize:12,marginTop:6,textAlign:'center',fontFamily:'monospace'}}>{aPct}%</p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:'var(--rs)',padding:'11px 15px',color:'var(--danger)',fontSize:13,marginBottom:12,lineHeight:1.5}}>
              ⚠️ {error}
            </div>
          )}

          {/* Start button */}
          {!isProcessing && (
            <button onClick={handleProcess} disabled={!canStart}
              className="fade-up-d2"
              style={{
                width:'100%',padding:16,
                background:canStart ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
                border:'none',borderRadius:'var(--r)',
                color:canStart ? '#000' : 'var(--muted)',
                fontWeight:700,fontSize:16,marginBottom:14,
                opacity:canStart ? 1 : 0.7,
                cursor:canStart ? 'pointer' : 'not-allowed',
                transition:'all .2s',
              }}
            >
              {!qFile && !aFile ? '↑ Upload both photos to start'
               : !qFile         ? '↑ Upload question sheet too'
               : !aFile         ? '↑ Upload answer key too'
               :                  'Scan & Build Quiz →'}
            </button>
          )}

          {/* Divider + sample */}
          <div className="fade-up-d3" style={{display:'flex',gap:10,alignItems:'center',margin:'4px 0 10px'}}>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
            <span style={{color:'var(--muted)',fontSize:12}}>or try a sample</span>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
          </div>
          <button onClick={()=>onOCRDone({...SAMPLE,rawText:'',imageUrl:null})}
            className="fade-up-d3"
            style={{width:'100%',padding:13,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rs)',color:'var(--muted)',fontSize:14,fontWeight:500,marginBottom:24}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--muted)'}}
          >
            🧪 Load built-in sample quiz (8 questions) →
          </button>

          {/* Tips */}
          <div className="fade-up-d4" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'16px 18px',marginBottom:24}}>
            <p style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>
              Tips for best results
            </p>
            {[
              ['Lighting','Bright, even light — no shadows across text'],
              ['Focus',   'Hold steady — text must be sharp, not blurry'],
              ['Framing', 'Fill the frame with just the page content'],
              ['Answers', 'Any format works: bubbles, boxes, "1.A 2.B", circled letters'],
            ].map(([label, tip]) => (
              <div key={label} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:8}}>
                <span style={{color:'var(--accent)',fontSize:13,flexShrink:0,marginTop:1}}>✓</span>
                <span style={{color:'var(--muted)',fontSize:13,lineHeight:1.5}}>
                  <strong style={{color:'var(--text)',fontWeight:600}}>{label}:</strong> {tip}
                </span>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <HistoryTab history={history} stats={stats} />
      )}
    </div>
  );
}
