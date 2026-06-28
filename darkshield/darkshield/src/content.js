
'use strict';

// ── 1. DETECTION CONFIGURATION ────────────────────────────────────────────

const CONFIRMSHAMING_PATTERNS = [
  /no[,\s]+thanks?[,\s]+i('d| would| do)?\s?(not|never|don'?t|hate|dislike|prefer not)/i,
  /no[,\s]+thanks?[,\s]+i('d| would)?\s?prefer to pay/i,
  /no[,\s]+thanks?[,\s]+i('d| would)?\s?rather/i,
  /i\s(hate|dislike|don'?t want|don'?t need|prefer not to)\s(save|deal|get|receive|have|miss|take)/i,
  /i('d| would) rather\s(pay full|miss out|not save|stay uninformed)/i,
  /no thanks,?\s*i('ll| will)?\s?(pay more|pass|skip|miss)/i,
  /that'?s?\sok(ay)?,?\s*i\s(like|prefer|don'?t mind)\s(paying|full price)/i,
  /decline\s(the\s)?(offer|deal|discount|savings)/i,
  /i don'?t want\s(to save|a deal|discount|offers|savings|to be informed)/i,
  /stay\s(uninformed|in the dark|ignorant)/i,
  /i prefer to remain/i,
  /no,?\s*i don'?t want/i,
];

/**
 * FALSE URGENCY
 * Regex patterns matched against visible text anywhere on the page.
 * Targets manufactured scarcity, countdown language, and social pressure.
 */
const FALSE_URGENCY_PATTERNS = [
  // Scarcity — rooms, seats, items
  /only\s+\d+\s+(rooms?|seats?|tickets?|items?|left|remaining|available)/i,
  /\d+\s+(rooms?|seats?|tickets?|items?)\s+(left|remaining|available)/i,
  /last\s+(room|seat|ticket|item|one|chance)/i,
  /almost\s+(gone|sold out|full)/i,
  /selling\s+fast/i,
  /limited\s+(availability|seats?|rooms?|stock|time\s+offer)/i,
  /low\s+availability/i,
  /high\s+demand/i,
  // Social proof / pressure
  /\d+\s+people?\s+(are\s+)?(viewing|looking at|watching|booked)\s+this/i,
  /\d+\s+others?\s+(are\s+)?(viewing|looking|interested)/i,
  /booked\s+\d+\s+times?\s+(today|this week|in the last)/i,
  /someone\s+(just\s+)?(booked|reserved|purchased)/i,
  // Time pressure
  /offer\s+(expires?|ends?)\s+in/i,
  /deal\s+(expires?|ends?)\s+in/i,
  /price\s+(increases?|goes up)\s+in/i,
  /\d+:\d{2}(:\d{2})?\s*(left|remaining|to\s+(book|claim|get))/i,
  /ends?\s+(today|tonight|soon|at midnight)/i,
  /today\s+only/i,
  /flash\s+sale/i,
  /hurry[,!\s]/i,
  /don'?t\s+(miss|wait|delay)/i,
  /act\s+now/i,
  /grab\s+(it|yours?|this)\s+(now|today|before)/i,
];

/**
 * Elements most likely to carry confirmshaming text.
 */
const CONFIRMSHAMING_SELECTORS = [
  'button',
  'a',
  '[role="button"]',
  'label',
  'span[class*="decline"]',
  'span[class*="dismiss"]',
  'span[class*="close"]',
  'span[class*="skip"]',
  'div[class*="decline"]',
];

/**
 * Elements most likely to carry false urgency text.
 * Broader than confirmshaming — urgency can appear anywhere on the page.
 */
const FALSE_URGENCY_SELECTORS = [
  '[class*="urgency"]',
  '[class*="scarcity"]',
  '[class*="countdown"]',
  '[class*="timer"]',
  '[class*="stock"]',
  '[class*="availability"]',
  '[class*="limited"]',
  '[class*="demand"]',
  '[class*="popular"]',
  '[class*="selling"]',
  '[class*="banner"]',
  '[class*="notice"]',
  '[class*="alert"]',
  '[class*="notification"]',
  '[class*="message"]',
  'p', 'span', 'div', 'li',   // broad pass for text not in named containers
];

// ── 2. UTILITY FUNCTIONS ──────────────────────────────────────────────────

/**
 * Return normalised visible text from an element.
 */
function getVisibleText(el) {
  return (el.innerText || el.textContent || '').trim();
}

/**
 * Check whether an element is rendered and visible on screen.
 */
function isVisible(el) {
  const rect  = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width    > 0           &&
    rect.height   > 0           &&
    style.display !== 'none'    &&
    style.visibility !== 'hidden' &&
    parseFloat(style.opacity)   > 0
  );
}

/**
 * Escape a string for safe insertion into innerHTML.
 */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 3. DETECTION FUNCTIONS ────────────────────────────────────────────────

/**
 * Scan for confirmshaming.
 * Checks buttons, links, and dismiss-like elements for guilt-framed text.
 *
 * @returns {DetectionResult[]}
 */
function detectConfirmshaming() {
  const results = [];
  const seen    = new Set();

  CONFIRMSHAMING_SELECTORS.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (!isVisible(el)) return;

      const text = getVisibleText(el);
      if (text.length < 5 || text.length > 300) return;
      if (seen.has(text.toLowerCase())) return;

      const matched = CONFIRMSHAMING_PATTERNS.find(rx => rx.test(text));
      if (matched) {
        seen.add(text.toLowerCase());
        results.push({
          type:       'confirmshaming',
          confidence: 'High',
          excerpt:    text.length > 100 ? text.slice(0, 100) + '…' : text,
          reason:     'Guilt-framed opt-out or dismiss text',
          element:    el,
        });
      }
    });
  });

  return results;
}

/**
 * Scan for false urgency.
 * Checks urgency-class elements first, then a broad pass over text nodes.
 *
 * @returns {DetectionResult[]}
 */
function detectFalseUrgency() {
  const results = [];
  const seen    = new Set();

  FALSE_URGENCY_SELECTORS.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (!isVisible(el)) return;

      const text = getVisibleText(el);
      if (text.length < 5 || text.length > 400) return;
      if (seen.has(text.toLowerCase())) return;

      // Skip elements that are containers of other already-checked elements
      // to avoid double-counting parent/child text
      const isContainer = el.querySelectorAll(FALSE_URGENCY_SELECTORS.join(',')).length > 0;
      if (isContainer && text.length > 80) return;

      const matched = FALSE_URGENCY_PATTERNS.find(rx => rx.test(text));
      if (matched) {
        seen.add(text.toLowerCase());
        results.push({
          type:       'false_urgency',
          confidence: 'High',
          excerpt:    text.length > 100 ? text.slice(0, 100) + '…' : text,
          reason:     'Manufactured scarcity or time-pressure language',
          element:    el,
        });
      }
    });
  });

  return results;
}

// ── 4. SHADOW DOM PANEL ────────────────────────────────────────────────────

const PANEL_CSS = `
  :host {
    all: initial;
    display: block;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  #ds-panel {
    width: 340px;
    max-height: 70vh;
    background: #fff;
    border: 2px solid #dc2626;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.20);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ds-in 0.2s ease-out;
  }

  @keyframes ds-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  /* Header */
  #ds-header {
    background: #dc2626;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  #ds-title {
    color: #fff;
    font-weight: 700;
    font-size: 13.5px;
    flex: 1;
  }
  #ds-close {
    background: none;
    border: none;
    color: rgba(255,255,255,0.8);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    padding: 0 2px;
  }
  #ds-close:hover { color: #fff; }

  /* Body */
  #ds-body {
    overflow-y: auto;
    flex: 1;
    padding: 11px 13px;
  }

  /* Zero state */
  #ds-zero {
    text-align: center;
    padding: 10px 4px;
    color: #16a34a;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
  }
  #ds-zero small {
    display: block;
    color: #6b7280;
    font-size: 11px;
    font-weight: 400;
    margin-top: 4px;
  }

  /* Summary */
  #ds-summary {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 7px;
    padding: 8px 11px;
    margin-bottom: 10px;
    color: #7f1d1d;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
  }

  /* Detection cards */
  .ds-card {
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    padding: 9px 11px;
    margin-bottom: 8px;
    background: #f9fafb;
  }
  .ds-card-top {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 5px;
  }
  .ds-num {
    font-size: 11px;
    font-weight: 700;
    color: #dc2626;
  }
  .ds-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ds-badge-cs { background: #fef3c7; color: #92400e; }
  .ds-badge-fu { background: #fee2e2; color: #991b1b; }
  .ds-conf {
    margin-left: auto;
    font-size: 10px;
    color: #9ca3af;
  }
  .ds-reason {
    font-size: 11.5px;
    color: #374151;
    margin-bottom: 4px;
  }
  .ds-excerpt {
    font-size: 11px;
    color: #6b7280;
    font-style: italic;
    padding: 3px 7px;
    background: #fff;
    border-left: 2px solid #dc2626;
    border-radius: 0 4px 4px 0;
    word-break: break-word;
    line-height: 1.5;
  }
  .ds-excerpt::before { content: '"'; }
  .ds-excerpt::after  { content: '"'; }

  /* Footer */
  #ds-footer {
    padding: 8px 12px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .ds-btn {
    flex: 1;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #374151;
  }
  .ds-btn:hover { background: #f3f4f6; }
  .ds-btn-red {
    background: #dc2626;
    color: #fff;
    border-color: #dc2626;
  }
  .ds-btn-red:hover { background: #b91c1c; }

  /* Meta */
  #ds-meta {
    padding: 5px 13px 7px;
    font-size: 10px;
    color: #9ca3af;
    border-top: 1px solid #f3f4f6;
    flex-shrink: 0;
  }
`;

const SHIELD = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

// ── 5. PANEL LIFECYCLE ─────────────────────────────────────────────────────

let shadowHost = null;
let shadowRoot = null;

function mountPanel(results) {
  if (shadowHost) shadowHost.remove();

  shadowHost = document.createElement('div');
  shadowHost.id = 'darkshield-host';
  document.body.appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = PANEL_CSS;
  shadowRoot.appendChild(style);

  const csCount = results.filter(r => r.type === 'confirmshaming').length;
  const fuCount = results.filter(r => r.type === 'false_urgency').length;
  const total   = results.length;

  const titleText = total > 0
    ? `DarkShield — ${total} pattern${total > 1 ? 's' : ''} found`
    : 'DarkShield — Page clear';

  // Build body HTML
  let bodyHtml = '';

  if (total === 0) {
    bodyHtml = `
      <div id="ds-zero">
        ✓ No dark patterns detected
        <small>Run again after navigating to the next booking step.</small>
      </div>`;
  } else {
    const parts = [];
    if (csCount > 0) parts.push(`${csCount} confirmshaming`);
    if (fuCount > 0) parts.push(`${fuCount} false urgency`);
    bodyHtml += `<div id="ds-summary">⚑ Detected: ${parts.join(' and ')}. Review before proceeding.</div>`;

    results.forEach((r, i) => {
      const badgeClass = r.type === 'confirmshaming' ? 'ds-badge-cs' : 'ds-badge-fu';
      const badgeLabel = r.type === 'confirmshaming' ? 'Confirmshaming' : 'False Urgency';
      bodyHtml += `
        <div class="ds-card">
          <div class="ds-card-top">
            <span class="ds-num">#${i + 1}</span>
            <span class="ds-badge ${badgeClass}">${badgeLabel}</span>
            <span class="ds-conf">Confidence: ${r.confidence}</span>
          </div>
          <div class="ds-reason">${esc(r.reason)}</div>
          <div class="ds-excerpt">${esc(r.excerpt)}</div>
        </div>`;
    });
  }

  const panel = document.createElement('div');
  panel.id = 'ds-panel';
  panel.innerHTML = `
    <div id="ds-header">
      ${SHIELD}
      <span id="ds-title">${esc(titleText)}</span>
      <button id="ds-close" title="Close">×</button>
    </div>
    <div id="ds-body">${bodyHtml}</div>
    <div id="ds-footer">
      <button class="ds-btn" id="ds-rescan">↻ Rescan</button>
      <button class="ds-btn ds-btn-red" id="ds-dismiss">Dismiss</button>
    </div>
    <div id="ds-meta">DOM-based heuristic detection · ${new Date().toLocaleTimeString()}</div>
  `;

  shadowRoot.appendChild(panel);

  shadowRoot.getElementById('ds-close').addEventListener('click', removePanel);
  shadowRoot.getElementById('ds-dismiss').addEventListener('click', removePanel);
  shadowRoot.getElementById('ds-rescan').addEventListener('click', () => {
    removePanel();
    setTimeout(run, 150);
  });
}

function removePanel() {
  if (shadowHost) {
    shadowHost.remove();
    shadowHost = null;
    shadowRoot = null;
  }
}

// ── 6. HIGHLIGHT DETECTED ELEMENTS ────────────────────────────────────────

/**
 * Add a red outline and small badge to each detected element in the page.
 * Uses absolute-positioned badges injected into document.body.
 */
function highlightResults(results) {
  // Clear any previous highlights
  document.querySelectorAll('[data-ds-outlined]').forEach(el => {
    el.style.outline = el.dataset.dsOrigOutline || '';
    delete el.dataset.dsOutlined;
  });
  document.querySelectorAll('.ds-page-badge').forEach(el => el.remove());

  results.forEach((r, i) => {
    try {
      const el = r.element;
      if (!el || !document.body.contains(el)) return;

      el.dataset.dsOrigOutline = el.style.outline || '';
      el.dataset.dsOutlined    = 'true';
      el.style.outline         = '2.5px solid #dc2626';
      el.style.outlineOffset   = '3px';

      const rect  = el.getBoundingClientRect();
      const badge = document.createElement('div');
      badge.className = 'ds-page-badge';
      badge.textContent = `DS #${i + 1}`;
      badge.style.cssText = `
        position: absolute;
        top: ${rect.top + window.scrollY - 20}px;
        left: ${rect.left + window.scrollX}px;
        background: #dc2626;
        color: #fff;
        font: 700 10px/1.6 monospace;
        padding: 1px 5px;
        border-radius: 3px;
        z-index: 2147483646;
        pointer-events: none;
        white-space: nowrap;
      `;
      document.body.appendChild(badge);
    } catch (_) { /* element may have left the DOM */ }
  });
}

// ── 7. MAIN RUN ────────────────────────────────────────────────────────────

function run() {
  console.log('%c🛡 DarkShield running…', 'color:#dc2626;font-weight:bold');

  const csResults = detectConfirmshaming();
  const fuResults = detectFalseUrgency();
  const all       = [...csResults, ...fuResults];

  highlightResults(all);
  mountPanel(all);

  // Log to console for test dataset recording
  if (all.length > 0) {
    console.group('%c🛡 DarkShield — Detections', 'color:#dc2626;font-weight:bold');
    all.forEach((r, i) => {
      console.log(`%c#${i+1} [${r.type.toUpperCase()}]`, 'color:#dc2626;font-weight:bold', r.reason);
      console.log('  Excerpt:', r.excerpt);
      console.log('  Element:', r.element);
    });
    console.groupEnd();
  } else {
    console.log('%c🛡 DarkShield — No detections.', 'color:#16a34a;font-weight:bold');
  }

  // Persist summary for popup display
  chrome.runtime.sendMessage({
    type: 'STORE_RESULT',
    payload: {
      confirmshaming_count: csResults.length,
      false_urgency_count:  fuResults.length,
      total:                all.length,
      url:                  location.href,
      timestamp:            new Date().toISOString(),
    }
  });
}

// ── 8. SPA NAVIGATION OBSERVER ─────────────────────────────────────────────

let lastUrl     = location.href;
let navDebounce = null;

const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    clearTimeout(navDebounce);
    navDebounce = setTimeout(() => {
      console.log('%c🛡 DarkShield — Navigation detected. Re-running…', 'color:#dc2626');
      removePanel();
      run();
    }, 1200);
  }
});

navObserver.observe(document.documentElement, { childList: true, subtree: true });

// ── 9. BOOT ─────────────────────────────────────────────────────────────────

setTimeout(run, 800);
