/**
 * mathNormalize.js
 *
 * Converts OCR plain-text math notation into inline LaTeX ($...$)
 * that MathText.jsx can render as fractions, roots, powers, ratios, etc.
 *
 * Call normalizeMath(str) on every question text and every option text
 * after OCR parsing.
 */

/**
 * Main entry point.
 * Wraps detected math expressions in $...$ so MathText renders them.
 * @param {string} text
 * @returns {string}
 */
export function normalizeMath(text) {
  if (!text) return text;

  // Already has LaTeX markers — leave alone
  if (text.includes('$')) return text;

  let t = text;

  // ── 1. Greek letters written out ─────────────────────────────────────────
  t = t
    .replace(/\balpha\b/gi,   '\\alpha')
    .replace(/\bbeta\b/gi,    '\\beta')
    .replace(/\bgamma\b/gi,   '\\gamma')
    .replace(/\bdelta\b/gi,   '\\delta')
    .replace(/\bepsilon\b/gi, '\\epsilon')
    .replace(/\btheta\b/gi,   '\\theta')
    .replace(/\blambda\b/gi,  '\\lambda')
    .replace(/\bmu\b/gi,      '\\mu')
    .replace(/\bpi\b/gi,      '\\pi')
    .replace(/\bsigma\b/gi,   '\\sigma')
    .replace(/\bomega\b/gi,   '\\omega');

  // ── 2. Square roots:  sqrt(x)  √x  √(x+y) ───────────────────────────────
  t = t.replace(/(?:sqrt|√)\s*\(([^)]+)\)/gi, (_m, body) => `\\sqrt{${body}}`);
  t = t.replace(/√\s*([A-Za-z0-9]+)/g,         (_m, body) => `\\sqrt{${body}}`);
  t = t.replace(/\bsqrt\s+([A-Za-z0-9]+)/gi,   (_m, body) => `\\sqrt{${body}}`);

  // ── 3. Fractions:  a/b  including things like (a+b)/(c+d) ────────────────
  // Parenthesised numerator and/or denominator
  t = t.replace(
    /\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g,
    (_m, num, den) => `\\frac{${num}}{${den}}`
  );
  // Plain tokens like  3/4  x/2  mv^2/2  (but not URLs or dates)
  t = t.replace(
    /(?<![:/\d])(-?[A-Za-z0-9_^{}+\-]+)\s*\/\s*(-?[A-Za-z0-9_^{}+\-]+)(?![:/\d])/g,
    (_m, num, den) => `\\frac{${num}}{${den}}`
  );

  // ── 4. Ratio notation written as  a : b ───────────────────────────────────
  // Only wrap when both sides are simple (avoid wrapping "Step 1 : do X")
  t = t.replace(
    /\b(\d[\d.]*)\s*:\s*(\d[\d.]*)\b/g,
    (_m, a, b) => `${a}:${b}`   // keep ratio, just ensure clean spacing
  );

  // ── 5. Superscripts  x^2  x^{n+1}  e^(-x) ───────────────────────────────
  // Already valid LaTeX — no change needed; MathText handles ^ directly.

  // ── 6. Subscripts  H_2O  CO_2  a_n ──────────────────────────────────────
  // Also valid LaTeX — pass through.

  // ── 7. Common symbols typed as ASCII ─────────────────────────────────────
  t = t.replace(/\binfinity\b/gi, '\\infty');
  t = t.replace(/>=/, '\\geq');
  t = t.replace(/<=/, '\\leq');
  t = t.replace(/!=/, '\\neq');
  t = t.replace(/\+-/, '\\pm');

  // ── 8. Detect if the result has any math-looking content ─────────────────
  const hasMath = /\\[a-zA-Z{]|[\^_]|\d+\/\d+/.test(t);

  if (!hasMath) return text; // nothing to render — return original unchanged

  // Wrap only the math-heavy segments (or the whole string if short)
  // Strategy: if the whole string looks like a math expression, wrap all.
  // Otherwise split on word boundaries and wrap sub-expressions.
  if (isMathExpression(t)) {
    return `$${t}$`;
  }

  // Mixed text + math: wrap each math token individually
  t = wrapMathTokens(t);

  return t;
}

/** Heuristic: is the entire string a math expression? */
function isMathExpression(s) {
  // Strip whitespace and check ratio of math chars to total
  const stripped = s.replace(/\s/g, '');
  const mathChars = (stripped.match(/[0-9+\-*/^_=<>()\\{}]|\\[a-zA-Z]+/g) || []).join('').length;
  return mathChars / stripped.length > 0.5 || /^[\d\s+\-*/^_=<>()\\{}A-Za-z.]+$/.test(stripped);
}

/**
 * Wraps inline math tokens within a mixed text string.
 * Looks for patterns like  \\frac{}{}, ^2, _2, \\sqrt{} etc.
 */
function wrapMathTokens(text) {
  // Replace LaTeX commands with $...$-wrapped versions
  return text.replace(
    /(\\(?:frac\{[^}]*\}\{[^}]*\}|sqrt\{[^}]*\}|[a-zA-Z]+)(?:\{[^}]*\})*)|([A-Za-z0-9]+(?:\^|_)[A-Za-z0-9{}]+)/g,
    (match) => `$${match}$`
  );
}
