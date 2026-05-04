import React, { useState, useRef } from 'react';
import { parseOCRText } from '../utils/parser';
import { fileToDataURL } from '../utils/ocr';
import HistoryTab from './HistoryTab';

/* ── Rich sample data ── */
const SAMPLE_DATA = {
  subject: 'Science Mixed — Sample',
  questions: [
    { num:1, text:'What is the value of $\\frac{d}{dx}\\left(x^3 + 2x\\right)$ at $x = 2$?', options:{a:'$14$',b:'$16$',c:'$12$',d:'$10$'} },
    { num:2, text:'A body of mass $m$ moving with velocity $v$ has kinetic energy:', options:{a:'$mv$',b:'$\\frac{1}{2}mv^2$',c:'$mv^2$',d:'$\\frac{mv^2}{4}$'} },
    { num:3, text:'Which organelle is responsible for ATP synthesis in eukaryotic cells?', options:{a:'Nucleus',b:'Ribosome',c:'Mitochondria',d:'Lysosome'} },
    { num:4, text:'Solve for $x$: $\\sqrt{3x + 1} = 4$', options:{a:'$x = 4$',b:'$x = 5$',c:'$x = 6$',d:'$x = 3$'} },
    { num:5, text:'If $F = 20\\,N$ and $m = 4\\,kg$, what is the acceleration $a$?', options:{a:'$4\\,m/s^2$',b:'$8\\,m/s^2$',c:'$5\\,m/s^2$',d:'$2\\,m/s^2$'} },
    { num:6, text:'The chemical formula for glucose is:', options:{a:'$C_6H_{12}O_6$',b:'$C_{12}H_{22}O_{11}$',c:'$C_2H_5OH$',d:'$H_2O_2$'} },
    { num:7, text:'What is $\\int_0^2 (3x^2 + 1)\\,dx$?', options:{a:'$8$',b:'$10$',c:'$12$',d:'$6$'} },
    { num:8, text:'In which phase of mitosis do chromosomes align at the equatorial plate?', options:{a:'Prophase',b:'Telophase',c:'Anaphase',d:'Metaphase'} },
    { num:9, text:'If $f = 6 \\times 10^{14}\\,Hz$ and $c = 3 \\times 10^8\\,m/s$, find wavelength $\\lambda = \\frac{c}{f}$:', options:{a:'$4 \\times 10^{-7}\\,m$',b:'$5 \\times 10^{-7}\\,m$',c:'$6 \\times 10^{-7}\\,m$',d:'$2 \\times 10^{-7}\\,m$'} },
    { num:10, text:'Which is NOT a base found in DNA?', options:{a:'Adenine',b:'Uracil',c:'Guanine',d:'Cytosine'} },
  ],
  answerKey:{1:'a',2:'b',3:'c',4:'b',5:'c',6:'a',7:'b',8:'d',9:'b',10:'b'},
};

/* ── Format hint for typing ── */
const FORMAT_HINT = `1. What is the capital of France?
a. Berlin
b. Madrid
c. Paris
d. Rome

2. What is 2 + 2?
a. 3
b. 4
c. 5
d. 6

Answer Key:
1.c  2.b`;

export default function UploadScreen({ onOCRDone, history, stats }) {
  const [tab, setTab]         = useState('upload');
  const [subject, setSubject] = useState('');
  const [rawText, setRawText] = useState('');
  const [imgURL, setImgURL]   = useState(null);
  const [error, setError]     = useState('');
  const [showHint, setShowHint] = useState(false);
  const fileRef = useRef();

  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const url = await fileToDataURL(file);
      setImgURL(url);
    } catch {}
  };

  const handleParse = () => {
    setError('');
    const text = rawText.trim();
    if (!text) { setError('Please type or paste your question text first.'); return; }
    const parsed = parseOCRText(text);
    if (parsed.questions.length === 0) {
      setError('No questions found. Check the format — see the hint below the text box.');
      return;
    }
    onOCRDone({
      ...parsed,
      rawText: text,
      subject: subject.trim() || 'Untitled Quiz',
      imageUrl: imgURL,
    });
  };

  const useSample = () => onOCRDone({ ...SAMPLE_DATA, rawText:'', imageUrl:null });

  const cardStyle = {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:'var(--r)', padding:'18px 20px',
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      {/* Header */}
      <header style={{padding:'16px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:38,height:38,background:'linear-gradient(135deg,var(--accent),var(--accent2))',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
            📝
          </div>
          <span style={{fontWeight:700,fontSize:18,letterSpacing:'-0.5px'}}>PhotoQuiz</span>
        </div>
        <nav style={{display:'flex',gap:4}}>
          {['upload','history'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'7px 16px',borderRadius:99,
              background:tab===t ? 'var(--surface2)' : 'transparent',
              color:tab===t ? 'var(--text)' : 'var(--muted)',
              fontSize:13,fontWeight:500,
              border:tab===t ? '1px solid var(--border2)' : '1px solid transparent',
              transition:'all .2s',
            }}>
              {t === 'upload' ? '📝 Create' : '📊 History'}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'upload' ? (
        <main style={{flex:1,padding:'24px 20px',maxWidth:560,margin:'0 auto',width:'100%'}}>

          {/* Hero */}
          <div className="fade-up" style={{marginBottom:24}}>
            <h1 style={{fontSize:27,fontWeight:700,letterSpacing:'-1px',lineHeight:1.25,marginBottom:8}}>
              Type or paste your test —<br/>
              <span style={{color:'var(--accent)'}}>build a quiz instantly</span>
            </h1>
            <p style={{color:'var(--muted)',fontSize:13,lineHeight:1.6}}>
              No internet required. Works 100% offline. Supports math notation like <code style={{background:'var(--surface2)',padding:'1px 6px',borderRadius:4,fontFamily:'monospace'}}>$\frac{1}{2}mv^2$</code>.
            </p>
          </div>

          {/* Subject */}
          <div className="fade-up-d1" style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:7}}>
              Subject Name (optional)
            </label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Physics Chapter 4"
              style={{width:'100%',padding:'12px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rs)',color:'var(--text)',fontSize:15,outline:'none'}}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e  => e.target.style.borderColor='var(--border)'}
            />
          </div>

          {/* Text input */}
          <div className="fade-up-d1" style={{marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
              <label style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                Question Text
              </label>
              <button onClick={() => setShowHint(h => !h)} style={{fontSize:12,color:'var(--accent2)',background:'none',border:'none',cursor:'pointer',padding:'2px 0'}}>
                {showHint ? 'Hide format guide ↑' : 'Show format guide ↓'}
              </button>
            </div>

            {showHint && (
              <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--rs)',padding:'12px 14px',marginBottom:10,fontSize:12,color:'var(--muted)',fontFamily:'monospace',lineHeight:1.8,whiteSpace:'pre-wrap'}}>
                {FORMAT_HINT}
              </div>
            )}

            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={'Paste your questions here...\n\n1. What is...\na. Option A\nb. Option B\nc. Option C\nd. Option D\n\nAnswer Key:\n1.a  2.b  3.c'}
              rows={12}
              style={{width:'100%',padding:'13px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rs)',color:'var(--text)',fontSize:14,outline:'none',resize:'vertical',lineHeight:1.7,fontFamily:'monospace'}}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e  => e.target.style.borderColor='var(--border)'}
            />
          </div>

          {/* Optional image upload for reference */}
          <div className="fade-up-d2" style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                Reference Image (optional — stays on device)
              </label>
            </div>
            <div
              onClick={() => fileRef.current.click()}
              style={{
                border:'1px dashed var(--border2)',borderRadius:'var(--rs)',
                padding:'14px 18px',cursor:'pointer',display:'flex',
                alignItems:'center',gap:14,transition:'border-color .2s',
                background: imgURL ? 'var(--surface2)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border2)'}
            >
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                onChange={e => handleImageUpload(e.target.files[0])} style={{display:'none'}} />
              {imgURL ? (
                <>
                  <img src={imgURL} alt="reference" style={{width:56,height:56,objectFit:'cover',borderRadius:6,flexShrink:0}} />
                  <div>
                    <p style={{fontSize:13,fontWeight:500,marginBottom:2}}>Image loaded for reference</p>
                    <p style={{fontSize:12,color:'var(--muted)'}}>Never sent anywhere — stays on your device</p>
                  </div>
                </>
              ) : (
                <>
                  <span style={{fontSize:28,flexShrink:0}}>📷</span>
                  <div>
                    <p style={{fontSize:13,fontWeight:500,marginBottom:2}}>Tap to upload your test photo</p>
                    <p style={{fontSize:12,color:'var(--muted)'}}>Use as a visual reference while you type</p>
                  </div>
                </>
              )}
            </div>

            {imgURL && (
              <div style={{marginTop:10,borderRadius:'var(--rs)',overflow:'hidden',border:'1px solid var(--border)'}}>
                <img src={imgURL} alt="test reference" style={{width:'100%',maxHeight:280,objectFit:'contain',display:'block',background:'#000'}} />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:'var(--rs)',padding:'11px 15px',color:'var(--danger)',fontSize:14,marginBottom:12}}>
              ⚠️ {error}
            </div>
          )}

          {/* Build button */}
          <button
            onClick={handleParse}
            className="fade-up-d2"
            style={{width:'100%',padding:16,background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',borderRadius:'var(--r)',color:'#000',fontWeight:700,fontSize:16,marginBottom:12}}
          >
            Build Quiz →
          </button>

          {/* Divider + sample */}
          <div className="fade-up-d3" style={{display:'flex',gap:10,alignItems:'center',margin:'4px 0 10px'}}>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
            <span style={{color:'var(--muted)',fontSize:12}}>or try a built-in sample</span>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
          </div>
          <button
            onClick={useSample}
            className="fade-up-d3"
            style={{width:'100%',padding:13,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--rs)',color:'var(--muted)',fontSize:14,fontWeight:500,marginBottom:24}}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)';  e.currentTarget.style.color='var(--muted)'; }}
          >
            🧪 Load sample — Math, Physics & Biology →
          </button>

          {/* Tips */}
          <div className="fade-up-d4" style={cardStyle}>
            <p style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>
              Formatting tips
            </p>
            {[
              ['Questions', 'Start with a number: 1. or 1) or 1:'],
              ['Options',   'Start with a letter: a. or a) or a:'],
              ['Answer Key','Add "Answer Key:" then 1.a  2.b  3.c'],
              ['Math',      'Wrap LaTeX in dollar signs: $\\frac{1}{2}mv^2$'],
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
