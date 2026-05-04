/**
 * ocr.js — Uses Google Gemini 1.5 Flash (genuinely free tier) for OCR.
 *
 * FREE TIER (no billing required, May 2026):
 *   gemini-2.5-flash      → 10 req/min, 250 req/day free
 *   gemini-2.0-flash-lite → 15 req/min, 1,500 req/day free (fallback)
 *
 * Older 1.5-flash names are deprecated and return 404.
 */

// Try these models in order — first one that works wins
// Current free-tier models (May 2026)
// gemini-2.5-flash is the correct current model with a free tier
// gemini-2.0-flash-lite is a lighter fallback also on free tier
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
];

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Save/load API key from localStorage safely */
export function getApiKey()    { try { return localStorage.getItem('gemini_api_key') || ''; } catch { return ''; } }
export function setApiKey(key) { try { localStorage.setItem('gemini_api_key', key.trim()); } catch {} }
export function hasApiKey()    { return !!getApiKey(); }

/** Convert File → base64 string (no data: prefix) */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

/** Call Gemini, trying each model until one succeeds */
async function callGemini(imageBase64, mimeType, prompt, maxTokens = 4096) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  let lastError = null;

  for (const model of MODELS) {
    const url = `${BASE}/${model}:generateContent?key=${apiKey}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
        }),
      });
    } catch (e) {
      lastError = new Error('Network error — check your internet connection.');
      continue;
    }

    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      lastError = new Error('Rate limit reached. Wait a minute and try again, or check your API key quota at aistudio.google.com.');
      continue;
    }

    if (res.status === 404) {
      // This model variant not available — silently try next
      lastError = new Error('Model not available, retrying...');
      continue;
    }

    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || '';
      if (msg.toLowerCase().includes('api key')) throw new Error('INVALID_API_KEY');
      throw new Error(`Bad request: ${msg}`);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      lastError = new Error(`Gemini error ${res.status}: ${body?.error?.message || res.statusText}`);
      continue;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) return text;
    lastError = new Error('Empty response from Gemini.');
  }

  throw lastError || new Error('All Gemini models failed.');
}

/**
 * Extract structured questions from a question sheet image.
 * Returns JSON string: { questions: [{ num, text, options:{a,b,c,d} }] }
 */
export async function runQuestionOCR(file, onProgress = () => {}) {
  onProgress(10);
  const base64 = await fileToBase64(file);
  onProgress(30);

  const prompt = `You are extracting exam/quiz questions from this image.
Return ONLY valid JSON — no markdown fences, no explanation, nothing else.

MATH RULES (critical):
- Fractions: $\\frac{numerator}{denominator}$ e.g. 5/2 R becomes $\\frac{5}{2}$R
- Square roots: $\\sqrt{value}$ e.g. √3 becomes $\\sqrt{3}$
- Powers: $x^{2}$   Subscripts: $H_{2}O$
- Greek: $\\pi$ $\\theta$ $\\alpha$ $\\omega$ $\\mu$
- Ratios: $\\sqrt{3}:1$ or $3:1$
- Fractions in options e.g. E/2 becomes $\\frac{E}{2}$

LAYOUT RULES:
- Options a+b are often on the SAME LINE (two columns) — split them correctly
- Options c+d are often on the SAME LINE — split them correctly  
- Always capture ALL 4 options (a, b, c, d) — never skip one
- If an option is just a math expression, still capture it

JSON structure to return:
{
  "questions": [
    {
      "num": 1,
      "text": "full question text here",
      "options": {
        "a": "option a text",
        "b": "option b text",
        "c": "option c text",
        "d": "option d text"
      }
    }
  ]
}`;

  const text = await callGemini(base64, file.type || 'image/jpeg', prompt, 4096);
  onProgress(90);

  // Strip markdown fences if model adds them anyway
  const clean = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  onProgress(100);
  return clean;
}

/**
 * Extract answer key from an answer key image.
 * Returns plain text like "1.a  2.b  3.c"
 */
export async function runAnswerOCR(file, onProgress = () => {}) {
  onProgress(10);
  const base64 = await fileToBase64(file);
  onProgress(30);

  const prompt = `Extract the answer key from this image.
Return ONLY a plain text list — no explanation, no markdown:
1.a  2.b  3.c  4.d  5.a

Rules:
- Format: number.letter  (letter must be a, b, c, or d — lowercase)
- One entry per question, separated by spaces`;

  const text = await callGemini(base64, file.type || 'image/jpeg', prompt, 512);
  onProgress(100);
  return text.trim();
}

/**
 * Convert a File to a local data-URL for image preview.
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}
