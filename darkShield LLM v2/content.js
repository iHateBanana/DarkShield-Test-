// content.js — DarkShield V2
// Extracts visible text, runs regex baseline, calls Laravel API, shows Shadow DOM alert.

// Skip iframes
if (window !== window.top) {
  throw new Error('DarkShield: skipping iframe');
}

// ===== TEXT EXTRACTION =====

function extractVisibleText() {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, [aria-hidden="true"]')
    .forEach(el => el.remove());

  const walker = document.createTreeWalker(
    clone,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const style = window.getComputedStyle(node.parentElement);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const parts = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text.length > 0) parts.push(text);
  }
  return parts.join('\n');
}

function collectFullPageText() {
  if (!document.body || document.body.textContent.trim().length < 50) {
    return '';
  }

  let fullText = 'TITLE: ' + document.title + '\n\n';
  fullText += 'BODY TEXT:\n' + extractVisibleText() + '\n\n';

  const buttons = document.querySelectorAll(
    'button, a, input[type="submit"], [role="button"], .btn, .button'
  );
  fullText += 'BUTTONS & LINKS:\n';
  buttons.forEach(el => {
    const label = el.textContent.trim();
    if (label && label.length < 200) fullText += `- ${label}\n`;
  });

  return fullText;
}

const MAX_CHARS = 3000;
const rawText = collectFullPageText();

if (!rawText) {
  throw new Error('DarkShield: page too empty to analyse');
}

const trimmedText = rawText.length > MAX_CHARS
  ? rawText.substring(0, MAX_CHARS) + '... [truncated]'
  : rawText;

window.__darkShieldText = trimmedText;

// ===== REGEX BASELINE =====

const regexResults = scanWithRegex(trimmedText);
const regexScore = calculateRegexScore(regexResults);

window.__darkShieldRegexResults = regexResults;
window.__darkShieldRegexScore = regexScore;

// ===== SHADOW DOM UI =====

function showLoading() {
  const host = document.createElement('div');
  host.id = 'darkshield-loading';
  document.body.prepend(host);
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .loader {
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        background: #1a1a2e; color: #ccc; padding: 8px 16px;
        border-radius: 20px; font-family: sans-serif; font-size: 13px;
        display: flex; align-items: center; gap: 8px;
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .spinner {
        width: 14px; height: 14px; border: 2px solid #555;
        border-top-color: #4a6cf7; border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <div class="loader">
      <div class="spinner"></div>
      Analysing page…
    </div>
  `;
  return host;
}

function showDarkPatternWarning(result) {
  if (document.getElementById('darkshield-root')) return;

  const host = document.createElement('div');
  host.id = 'darkshield-root';
  document.body.prepend(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  const typeLabels = {
    'False Urgency':    { icon: '⏰', label: 'Fake Urgency' },
    'Confirmshaming':   { icon: '😔', label: 'Guilt-Based Manipulation' },
    'Preselection':     { icon: '☑️', label: 'Pre-Checked Option' },
  };

  const info = typeLabels[result.pattern_detected] || { icon: '⚠️', label: result.pattern_detected || 'Dark Pattern' };
  const confEmoji = result.confidence >= 0.75 ? '🟢' : result.confidence >= 0.45 ? '🟡' : '🔴';
  const confPct = Math.round((result.confidence || 0) * 100) + '%';

  shadow.innerHTML = `
    <style>
      .banner {
        position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
        background: #1a1a2e; color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px;
        padding: 10px 20px; display: flex; align-items: center;
        justify-content: space-between; gap: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        animation: slideDown 0.3s ease;
      }
      @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
      .icon { font-size: 20px; }
      .msg { flex: 1; }
      .type { font-weight: bold; color: #ff6b6b; }
      .sub { font-size: 12px; color: #999; margin-top: 2px; }
      button {
        background: none; border: 1px solid #555; color: #ccc;
        padding: 4px 12px; cursor: pointer; border-radius: 4px; font-size: 13px;
      }
      button:hover { background: #333; border-color: #888; }
    </style>
    <div class="banner">
      <span class="icon">${info.icon}</span>
      <div class="msg">
        <div><span class="type">${info.label}</span> ${confEmoji} ${confPct} confidence</div>
        <div class="sub">${result.explanation || ''}</div>
      </div>
      <button id="ds-dismiss">Dismiss</button>
    </div>
  `;

  shadow.getElementById('ds-dismiss').addEventListener('click', () => host.remove());
  setTimeout(() => { if (document.getElementById('darkshield-root')) host.remove(); }, 15000);
}

// ===== API CALL =====

const API_BASE = 'http://127.0.0.1:8000/api';

async function analyzePage() {
  const loader = showLoading();

  try {
    const response = await fetch(API_BASE + '/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        text: window.__darkShieldText,
        regex_results: window.__darkShieldRegexResults,
        regex_score: window.__darkShieldRegexScore,
      })
    });

    if (!response.ok) {
      throw new Error('API returned ' + response.status);
    }

    const result = await response.json();
    window.__darkShieldResult = result;

    // Save to local history
    chrome.storage.local.get(['scanHistory'], (storage) => {
      const history = storage.scanHistory || [];
      history.push({
        url: window.location.hostname,
        isDarkPattern: result.is_dark_pattern,
        type: result.pattern_detected,
        confidence: result.confidence,
        timestamp: Date.now()
      });
      if (history.length > 50) history.shift();
      chrome.storage.local.set({ scanHistory: history });
    });

    if (result.is_dark_pattern) {
      showDarkPatternWarning(result);
    }

  } catch (err) {
    if (err.message.includes('Failed to fetch')) {
      console.error('DarkShield: network error — is the Laravel server running?');
    } else if (err.message.includes('401')) {
      console.error('DarkShield: unauthorised — check the server API key');
    } else if (err.message.includes('429')) {
      console.error('DarkShield: rate limited — try again shortly');
    } else {
      console.error('DarkShield: scan failed —', err.message);
    }
  } finally {
    loader.remove();
  }
}

// Listen for manual scan trigger from popup
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'scan') analyzePage();
});
