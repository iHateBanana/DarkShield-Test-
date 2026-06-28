# DarkShield — Chrome Extension (MV3)

---

## Project Structure

```
darkshield/
├── manifest.json        ← MV3 config
├── popup.html           ← Extension popup (last scan result)
├── src/
│   ├── content.js       ← Detection engine + Shadow DOM panel
│   ├── background.js    ← Service worker (stores results for popup)
│   └── popup.js         ← Popup display logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## How to Install

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `darkshield/` folder

No API key needed. Works immediately on supported sites.

---

## Supported Sites

- `amazon.com` / `amazon.co.uk`
- `booking.com`
- `ryanair.com`

To add more sites, edit `content_scripts.matches` in `manifest.json`.

---

## How Detection Works

All detection happens inside `src/content.js`. No data leaves the browser.

### Confirmshaming

Scans buttons, links, and dismiss-like elements using regex patterns targeting first-person guilt-framed opt-out language:

```js
/no[,\s]+thanks?[,\s]+i('d| would)?\s?rather/i
/i\s(hate|dislike|don't want)\s(save|deal|get|receive)/i
/i prefer to remain/i
// ...
```

### False Urgency

Scans urgency-class elements and broad text nodes for manufactured scarcity and time-pressure language:

```js
/only\s+\d+\s+(rooms?|seats?|tickets?)\s+(left|remaining)/i
/\d+\s+people?\s+(are\s+)?(viewing|looking at|watching)\s+this/i
/offer\s+(expires?|ends?)\s+in/i
// ...
```

### Shadow DOM isolation

The alert panel is injected inside a Shadow DOM subtree. This means:
- DarkShield's CSS cannot bleed into the host page
- The host page's CSS cannot override DarkShield's panel styles
- No page content is modified — observe and report only

---

## Architecture

```
Page loads
    │
    ▼
content.js
  - Runs regex detection over DOM elements
  - Highlights detected elements (red outline + badge)
  - Mounts Shadow DOM alert panel
  - Sends result summary to background worker
    │
    ▼
background.js (service worker)
  - Stores result in chrome.storage.session
    │
    ▼
popup.js
  - Reads result from storage and displays in popup
```

---

## Dissertation Notes

### Extending detection patterns

To add or refine patterns, edit the arrays at the top of `content.js`:
- `CONFIRMSHAMING_PATTERNS` — regex array
- `FALSE_URGENCY_PATTERNS` — regex array

Each change should be documented as a prompt/rule iteration in your methodology.

### Evaluation (§3.4)

For each test case, record manually:
- **True Positive (TP)** — DarkShield flagged it, and it is genuinely a dark pattern
- **False Positive (FP)** — DarkShield flagged it, but it is not a dark pattern
- **False Negative (FN)** — DarkShield missed it; it is a genuine dark pattern

Then calculate per category and per platform:
```
Precision = TP / (TP + FP)
Recall    = TP / (TP + FN)
F1        = 2 × (Precision × Recall) / (Precision + Recall)
```

### Known limitations (for §5 Discussion)

- Regex cannot detect novel phrasing outside the defined patterns → false negatives
- Broad selectors (p, span, div) in false urgency scan may produce false positives on legitimate promotional copy
- Platform DOM structure changes may break element targeting — date-stamp all test runs
- SPA navigation debounce (1200ms) may miss very fast route transitions
