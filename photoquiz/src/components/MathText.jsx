import React from 'react';

/**
 * MathText — renders inline LaTeX math with ZERO external dependencies.
 * Pure React + CSS. No KaTeX, no MathJax, no CDN.
 *
 * Supports: fractions, powers, subscripts, square roots, Greek letters,
 * common operators, overline, vectors, text{}, and more.
 */

const SYM = {
  alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',zeta:'ζ',eta:'η',
  theta:'θ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',
  rho:'ρ',sigma:'σ',tau:'τ',upsilon:'υ',phi:'φ',chi:'χ',psi:'ψ',omega:'ω',
  Alpha:'Α',Beta:'Β',Gamma:'Γ',Delta:'Δ',Epsilon:'Ε',Theta:'Θ',Lambda:'Λ',
  Pi:'Π',Sigma:'Σ',Phi:'Φ',Omega:'Ω',
  times:'×',div:'÷',pm:'±',mp:'∓',cdot:'·',circ:'∘',bullet:'•',
  leq:'≤',geq:'≥',neq:'≠',approx:'≈',equiv:'≡',sim:'∼',propto:'∝',
  infty:'∞',partial:'∂',nabla:'∇',forall:'∀',exists:'∃',
  rightarrow:'→',leftarrow:'←',Rightarrow:'⇒',Leftarrow:'⇐',
  leftrightarrow:'↔',Leftrightarrow:'⇔',uparrow:'↑',downarrow:'↓',
  sum:'∑',prod:'∏',int:'∫',oint:'∮',
  ldots:'…',cdots:'⋯',angle:'∠',perp:'⊥',parallel:'∥',triangle:'△',
  hbar:'ℏ',ell:'ℓ',quad:'\u2003',qquad:'\u2003\u2003',
  in:'∈',subset:'⊂',supset:'⊃',cup:'∪',cap:'∩',emptyset:'∅',
};

function tokenise(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '\\') {
      i++;
      let cmd = '';
      if (i < s.length && /[a-zA-Z]/.test(s[i])) {
        while (i < s.length && /[a-zA-Z]/.test(s[i])) cmd += s[i++];
      } else if (i < s.length) { cmd = s[i++]; }
      toks.push({ t:'cmd', v:cmd });
    } else if (s[i] === '{') { toks.push({t:'lb'}); i++; }
    else if (s[i] === '}') { toks.push({t:'rb'}); i++; }
    else if (s[i] === '^') { toks.push({t:'sup'}); i++; }
    else if (s[i] === '_') { toks.push({t:'sub'}); i++; }
    else if (s[i] === ' ') { i++; }
    else { toks.push({t:'ch', v:s[i++]}); }
  }
  return toks;
}

let _k = 0;
const kk = () => `m${_k++}`;

function parseGroup(toks, pos) {
  if (toks[pos] && toks[pos].t === 'lb') {
    pos++;
    const ch = [];
    while (pos < toks.length && toks[pos].t !== 'rb') {
      const [n, p] = parseOne(toks, pos); ch.push(n); pos = p;
    }
    if (toks[pos]) pos++;
    return [ch, pos];
  }
  const [n, p] = parseOne(toks, pos);
  return [[n], p];
}

function parseOne(toks, pos) {
  const tok = toks[pos];
  if (!tok) return [null, pos];

  if (tok.t === 'cmd') {
    pos++;
    const c = tok.v;
    if (c === 'frac') {
      const [num, p2] = parseGroup(toks, pos);
      const [den, p3] = parseGroup(toks, p2);
      return [<span key={kk()} style={{display:'inline-flex',flexDirection:'column',alignItems:'center',verticalAlign:'middle',margin:'0 2px',lineHeight:1.1}}>
        <span style={{borderBottom:'1px solid currentColor',paddingBottom:1,fontSize:'0.85em'}}>{num}</span>
        <span style={{paddingTop:1,fontSize:'0.85em'}}>{den}</span>
      </span>, p3];
    }
    if (c === 'sqrt') {
      const [body, p2] = parseGroup(toks, pos);
      return [<span key={kk()} style={{display:'inline-flex',alignItems:'center'}}>
        <span style={{fontSize:'1.15em',marginRight:1,verticalAlign:'middle'}}>√</span>
        <span style={{borderTop:'1px solid currentColor',paddingTop:1}}>{body}</span>
      </span>, p2];
    }
    if (['text','mathrm','mathbf','mathit','mbox','mathsf'].includes(c)) {
      const [body, p2] = parseGroup(toks, pos);
      return [<span key={kk()} style={{fontStyle:'normal',fontWeight:c==='mathbf'?'500':'400'}}>{body}</span>, p2];
    }
    if (c === 'overline') {
      const [body, p2] = parseGroup(toks, pos);
      return [<span key={kk()} style={{textDecoration:'overline'}}>{body}</span>, p2];
    }
    if (c === 'underline') {
      const [body, p2] = parseGroup(toks, pos);
      return [<span key={kk()} style={{textDecoration:'underline'}}>{body}</span>, p2];
    }
    if (c === 'hat' || c === 'widehat') {
      const [body, p2] = parseGroup(toks, pos);
      return [<span key={kk()} style={{display:'inline-flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
        <span style={{fontSize:'0.65em'}}>^</span><span>{body}</span>
      </span>, p2];
    }
    if (c === 'vec' || c === 'overrightarrow') {
      const [body, p2] = parseGroup(toks, pos);
      return [<span key={kk()} style={{display:'inline-flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
        <span style={{fontSize:'0.65em'}}>→</span><span>{body}</span>
      </span>, p2];
    }
    if (['left','right','big','Big','bigg','Bigg'].includes(c)) {
      if (toks[pos] && toks[pos].t === 'ch') {
        const br = toks[pos].v === '.' ? '' : toks[pos].v;
        return [<span key={kk()}>{br}</span>, pos+1];
      }
      return [null, pos];
    }
    if (c in SYM) return [<span key={kk()}>{SYM[c]}</span>, pos];
    return [<span key={kk()} style={{fontStyle:'italic'}}>{c}</span>, pos];
  }

  if (tok.t === 'sup') {
    pos++;
    const [body, p2] = parseGroup(toks, pos);
    return [<sup key={kk()} style={{fontSize:'0.72em',lineHeight:0}}>{body}</sup>, p2];
  }
  if (tok.t === 'sub') {
    pos++;
    const [body, p2] = parseGroup(toks, pos);
    return [<sub key={kk()} style={{fontSize:'0.72em',lineHeight:0}}>{body}</sub>, p2];
  }
  if (tok.t === 'lb') {
    pos++;
    const ch = [];
    while (pos < toks.length && toks[pos].t !== 'rb') {
      const [n, p] = parseOne(toks, pos); ch.push(n); pos = p;
    }
    if (toks[pos]) pos++;
    return [<span key={kk()}>{ch}</span>, pos];
  }
  if (tok.t === 'ch') {
    const ch = tok.v;
    const isLetter = /[a-zA-Z]/.test(ch);
    return [<span key={kk()} style={isLetter?{fontStyle:'italic'}:{}}>{ch==='-'?'−':ch}</span>, pos+1];
  }
  return [null, pos+1];
}

function renderLatex(latex) {
  _k = 0;
  const toks = tokenise(latex);
  const nodes = [];
  let pos = 0;
  while (pos < toks.length) {
    const [n, np] = parseOne(toks, pos);
    if (n !== null) nodes.push(n);
    pos = np === pos ? pos+1 : np;
  }
  return nodes;
}

export default function MathText({ text, style, className }) {
  if (!text) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span className={className} style={{lineHeight:1.7,...style}}>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return (
            <span key={i} style={{fontFamily:'Georgia,"Times New Roman",serif',letterSpacing:'0.01em'}}>
              {renderLatex(part.slice(1,-1))}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
