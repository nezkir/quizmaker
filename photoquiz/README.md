# 📝 PhotoQuiz — 100% Offline MCQ Quiz PWA

No internet. No API keys. No sign-ups. No data leaves your device. Ever.

Type or paste your printed test questions and take the quiz instantly.

---

## Features

| Feature | Details |
|---|---|
| ✍️ **Manual input** | Type/paste questions — no OCR library needed |
| 📷 **Image reference** | Upload photo as a visual guide while typing |
| 🧮 **Math notation** | LaTeX in `$...$` rendered with pure CSS — no KaTeX CDN |
| 🎯 **Quiz Mode** | One question at a time with A/B/C/D feedback |
| 📊 **History** | Session scores saved to localStorage |
| 📱 **PWA** | Installable, works fully offline |
| 🔒 **Privacy** | Zero network requests after first page load |

---

## Quick Start

```bash
npm install
npm start
```

**Build for production:**
```bash
npm run build
```

Deploy the `build/` folder to any static host (Vercel, Netlify, GitHub Pages).  
No environment variables needed. No backend required.

---

## Input Format

```
1. What is the powerhouse of the cell?
a. Nucleus
b. Mitochondria
c. Ribosome
d. Golgi body

2. Solve $\sqrt{3x+1} = 4$
a. $x=3$
b. $x=4$
c. $x=5$
d. $x=6$

Answer Key:
1.b  2.c
```

### Supported question number formats
`1.` `1)` `1:` `1-`

### Supported option formats
`a.` `a)` `a:` `A.` `A)`

### Supported answer key formats
`1.a` `1) a` `1: a` `1 - a` (inline on one line or one per line)

### Math notation
Wrap LaTeX in `$...$`:
- Fractions: `$\frac{1}{2}$`
- Powers: `$x^2$` `$10^{-7}$`
- Subscripts: `$H_2O$` `$C_6H_{12}O_6$`
- Square roots: `$\sqrt{x+1}$`
- Greek: `$\alpha$ $\beta$ $\lambda$`
- Operators: `$\times$ $\div$ $\pm$ $\leq$`

---

## Project Structure

```
src/
  App.jsx                  # State machine
  components/
    UploadScreen.jsx        # Text input + image reference
    EditScreen.jsx          # Review & edit parsed questions
    QuizScreen.jsx          # Interactive quiz
    ResultsScreen.jsx       # Score + missed questions
    HistoryTab.jsx          # Trend chart + session list
    MathText.jsx            # Pure-CSS LaTeX renderer (no CDN)
    ProgressBar.jsx
  hooks/
    useQuizHistory.js       # localStorage persistence
  utils/
    ocr.js                  # Image preview helpers (offline)
    parser.js               # Text → structured questions
    storage.js              # localStorage CRUD
```

---

## License
MIT
