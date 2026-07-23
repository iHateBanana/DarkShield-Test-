/**
 * DarkShield v1.1
 * ───────────────────────────────────────────────────────────────────────────
 * Detects three dark UX patterns on Booking.com, Ryanair, and Expedia:
 *   1. Preselection     — pre-ticked checkboxes for commercial add-ons
 *   2. Confirmshaming   — guilt-framed dismiss / opt-out button text
 *   3. False Urgency    — fake countdown timers, scarcity claims,
 *                         inflated viewer/booking counts, expiring prices
 *
 * HOW TO USE:
 *   Open DevTools (F12) → Console tab → paste this entire script → Enter
 *   Works on any page of booking.com, ryanair.com, or expedia.com
 *
 * NOTES:
 *   - Detection is heuristic. Each result is flagged for human review.
 *   - The script does NOT modify the page (except visual highlight markers).
 *   - Run again after navigating to a new step in the booking flow.
 * ───────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── 0. GUARD: prevent duplicate overlays ──────────────────────────────
  if (document.getElementById('darkshield-overlay')) {
    document.getElementById('darkshield-overlay').remove();
  }

  // ── 1. CONFIGURATION ──────────────────────────────────────────────────

  /**
   * Keywords that suggest a checkbox label is a commercial add-on
   * rather than a legitimate user preference (e.g. "remember me").
   */
  const PRESELECTION_KEYWORDS = [
    'insurance', 'travel insurance', 'priority boarding', 'priority',
    'seat selection', 'seat upgrade', 'upgrade', 'extra bag', 'baggage',
    'luggage', 'add-on', 'add on', 'newsletter', 'marketing',
    'promotional', 'offers', 'deals', 'car hire', 'car rental',
    'transfer', 'airport transfer', 'parking', 'lounge',
    'fast track', 'flexi plus', 'flexibility',
    'genius', 'subscribe', 'subscription', 'opt in', 'opt-in',
    'receive emails', 'send me', 'keep me informed',
    'partner', 'third party', 'third-party'
  ];

  /**
   * Legitimate checkbox contexts — never flag these.
   */
  const WHITELIST_KEYWORDS = [
    'terms', 'conditions', 'privacy policy', 'i agree', 'i accept',
    'remember me', 'stay signed in', 'keep me logged',
    'accessibility', 'cookie', 'save my details',
    'i am over', 'age verification'
  ];

  /**
   * Confirmshaming patterns — first-person guilt-framed opt-out phrases.
   */
  const CONFIRMSHAMING_PATTERNS = [
    /no[,\s]+thanks?[,\s]+i('d| would| do)? ?(not|never|don'?t|hate|dislike|prefer not)/i,
    /no[,\s]+thanks?[,\s]+i('d| would)? ?prefer to pay/i,
    /no[,\s]+thanks?[,\s]+i('d| would)? ?rather/i,
    /i (hate|dislike|don'?t want|don'?t need|prefer not to) (save|deal|get|receive|have|miss|take)/i,
    /i('d| would) rather (pay full|miss out|not save|bleed|stay uninformed)/i,
    /no thanks,?\s*i('ll| will)? ?(pay more|pass|skip|miss)/i,
    /that'?s? ok(ay)?,?\s*i (like|prefer|don'?t mind) (paying|full price)/i,
    /decline (the )?(offer|deal|discount|savings)/i,
    /i don'?t want (to save|a deal|discount|offers|savings|to be informed)/i,
    /stay (uninformed|in the dark|ignorant)/i,
    /i('d| would)? ?rather pay (full|more)/i,
    /no,?\s*i (hate|don'?t like|dislike) (saving|discounts|deals|offers)/i,
    /i prefer to pay (full price|more|higher)/i,
  ];

  /**
   * Elements that are likely dismiss/opt-out candidates for confirmshaming.
   */
  const DISMISS_SELECTORS = [
    'button', 'a', '[role="button"]',
    'label', 'span[class*="decline"]', 'span[class*="dismiss"]',
    'span[class*="close"]', 'span[class*="skip"]', 'div[class*="decline"]'
  ];

  // ── FALSE URGENCY CONFIGURATION ───────────────────────────────────────

  /**
   * Text patterns that signal fake scarcity / limited availability.
   * Matched against visible text in any element on the page.
   *
   * Sub-categories:
   *   SCARCITY   — stock/availability claims ("only X left")
   *   SOCIAL     — crowd pressure ("X people viewing / booked")
   *   COUNTDOWN  — time-pressure language alongside timer-like elements
   *   EXPIRY     — price/deal expiry framing ("price expires in", "today only")
   */
  const FALSE_URGENCY_PATTERNS = [

    // ── SCARCITY ──────────────────────────────────────────────────────
    {
      subtype: 'scarcity',
      label:   'Artificial scarcity — limited availability claim',
      patterns: [
        /only\s+\d+\s+(rooms?|seats?|tickets?|spots?|left|available|remaining)/i,
        /\d+\s+(rooms?|seats?|tickets?|spots?)\s+(left|remaining|available)/i,
        /last\s+(room|seat|ticket|spot|chance|one)/i,
        /limited\s+(availability|rooms?|seats?|supply|stock)/i,
        /selling\s+(out|fast)/i,
        /almost\s+(gone|full|sold\s+out)/i,
        /high\s+demand/i,
        /filling\s+up\s+fast/i,
        /nearly\s+(full|gone|sold)/i,
        /just\s+\d+\s+(left|remaining)/i,
        /rooms?\s+left\s+at\s+this\s+price/i,
      ]
    },

    // ── SOCIAL PROOF / CROWD PRESSURE ────────────────────────────────
    {
      subtype: 'social',
      label:   'Manipulative social proof — crowd pressure signal',
      patterns: [
        /\d+\s+people\s+(are\s+)?(viewing|looking at|watching|checking)/i,
        /\d+\s+(guests?|people|others?|travell?ers?)\s+(booked|reserved|purchased|stayed)/i,
        /\d+\s+(bookings?|reservations?)\s+(today|in the last|this (week|hour|day))/i,
        /booked\s+\d+\s+times?\s+(today|this week|recently)/i,
        /\d+\s+others?\s+are\s+(looking|viewing|watching)/i,
        /someone\s+(just\s+)?(booked|reserved|purchased)/i,
        /popular\s+choice\s*[:\-–]\s*\d+/i,
        /trending\s+now/i,
        /most\s+booked\s+(hotel|flight|property)/i,
      ]
    },

    // ── COUNTDOWN / TIME PRESSURE ─────────────────────────────────────
    {
      subtype: 'countdown',
      label:   'Countdown timer — artificial time pressure',
      patterns: [
        /price\s+(expires?|ends?|valid)\s+(in|for)\s+[\d:]+/i,
        /deal\s+(expires?|ends?)\s+in/i,
        /offer\s+(expires?|ends?)\s+in/i,
        /locked?\s+(for|until)\s+[\d:]+/i,
        /book\s+within\s+[\d:]+/i,
        /reserved?\s+for\s+[\d:]+\s+(minutes?|mins?|seconds?|secs?)/i,
        /hurry[!\s]*[\d:]+/i,
        /act\s+(fast|now|quickly)/i,
        /don'?t\s+(miss\s+out|wait|delay)/i,
        /expires?\s+soon/i,
        /time\s+(is\s+)?running\s+out/i,
        /your\s+(session|cart|reservation)\s+(expires?|times?\s+out)\s+in/i,
      ]
    },

    // ── PRICE / DEAL EXPIRY ───────────────────────────────────────────
    {
      subtype: 'expiry',
      label:   'False price urgency — expiring deal or discount',
      patterns: [
        /price\s+(valid|available|guaranteed)\s+(only\s+)?(for|until|today)/i,
        /today.?s?\s+(price|deal|rate|offer)/i,
        /limited[- ]time\s+(offer|deal|price|rate)/i,
        /special\s+(offer|rate|deal)\s+(ends?|expires?)/i,
        /this\s+(price|deal|offer|rate)\s+(won'?t|doesn'?t)\s+last/i,
        /prices?\s+(increase|rise|go up)\s+(after|soon|at midnight)/i,
        /sale\s+ends?\s+(today|soon|at midnight|in \d+)/i,
        /save\s+\d+%?\s+(today\s+only|now\s+only|for\s+\d+\s+(more\s+)?hours?)/i,
        /flash\s+(sale|deal|offer)/i,
        /midnight\s+(deadline|cutoff)/i,
        /book\s+(now|today)\s+(to\s+)?(lock|secure|guarantee)\s+(your|this|the)\s+price/i,
        /don'?t\s+miss\s+(out\s+on\s+)?(this|our|the)\s+(deal|offer|discount|price)/i,
      ]
    }
  ];

  /**
   * CSS selectors for elements that are likely to contain countdown timers.
   * Checked separately so we can detect timers even if text isn't visible.
   */
  const TIMER_SELECTORS = [
    '[class*="countdown"]', '[class*="count-down"]', '[class*="timer"]',
    '[class*="clock"]',     '[class*="expire"]',     '[class*="urgent"]',
    '[id*="countdown"]',    '[id*="timer"]',          '[id*="clock"]',
    '[id*="expire"]',       '[class*="time-left"]',   '[class*="timeleft"]',
    '[class*="deal-expires"]', '[data-countdown]',    '[data-timer]',
  ];

  /**
   * Regex that matches a MM:SS or HH:MM:SS timer string.
   * Used to detect rendered countdown elements even without
   * explicit class names.
   */
  const TIMER_TEXT_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/;

  // ── 2. UTILITY FUNCTIONS ──────────────────────────────────────────────

  function getVisibleText(el) {
    return (el.innerText || el.textContent || '').trim().toLowerCase();
  }

  function getLabelText(checkbox) {
    const texts = [];
    if (checkbox.id) {
      const lbl = document.querySelector(`label[for="${checkbox.id}"]`);
      if (lbl) texts.push(getVisibleText(lbl));
    }
    const parentLabel = checkbox.closest('label');
    if (parentLabel) texts.push(getVisibleText(parentLabel));
    if (checkbox.getAttribute('aria-label')) {
      texts.push(checkbox.getAttribute('aria-label').toLowerCase());
    }
    const labelledBy = checkbox.getAttribute('aria-labelledby');
    if (labelledBy) {
      labelledBy.split(' ').forEach(id => {
        const el = document.getElementById(id);
        if (el) texts.push(getVisibleText(el));
      });
    }
    let parent = checkbox.parentElement;
    for (let i = 0; i < 4; i++) {
      if (!parent) break;
      const text = getVisibleText(parent);
      if (text.length > 5 && text.length < 300) { texts.push(text); break; }
      parent = parent.parentElement;
    }
    return texts.join(' ');
  }

  function isCommercialLabel(labelText) {
    const lower = labelText.toLowerCase();
    return PRESELECTION_KEYWORDS.some(kw => lower.includes(kw));
  }

  function isWhitelisted(labelText) {
    const lower = labelText.toLowerCase();
    return WHITELIST_KEYWORDS.some(kw => lower.includes(kw));
  }

  function isConfirmshaming(text) {
    return CONFIRMSHAMING_PATTERNS.some(rx => rx.test(text));
  }

  function isVisible(el) {
    try {
      const rect  = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display     !== 'none' &&
        style.visibility  !== 'hidden' &&
        style.opacity     !== '0'
      );
    } catch (e) {
      return false;
    }
  }

  // ── 3. DETECTION FUNCTIONS ────────────────────────────────────────────

  function detectPreselection() {
    const results = [];
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (!cb.checked || !isVisible(cb)) return;
      const labelText = getLabelText(cb);
      if (isWhitelisted(labelText)) return;
      const hasCommercialLabel = isCommercialLabel(labelText);
      const hasEmptyLabel = labelText.trim().length < 5;
      if (hasCommercialLabel || hasEmptyLabel) {
        const confidence = hasCommercialLabel ? 'High' : 'Medium';
        const snippet    = labelText.length > 80 ? labelText.substring(0, 80) + '...' : labelText || '(no label found)';
        results.push({
          type: 'preselection',
          subtype: 'preselection',
          element: cb,
          confidence,
          label: snippet,
          reason: hasCommercialLabel
            ? 'Pre-ticked checkbox with commercial add-on label'
            : 'Pre-ticked checkbox with no associated label text'
        });
      }
    });
    return results;
  }

  function detectConfirmshaming() {
    const results = [];
    const seen = new Set();
    DISMISS_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!isVisible(el)) return;
        const text = getVisibleText(el);
        if (text.length < 8 || text.length > 200) return;
        if (seen.has(text)) return;
        if (isConfirmshaming(text)) {
          seen.add(text);
          results.push({
            type: 'confirmshaming',
            subtype: 'confirmshaming',
            element: el,
            confidence: 'High',
            label: text.length > 80 ? text.substring(0, 80) + '...' : text,
            reason: 'Guilt-framed opt-out / dismiss text'
          });
        }
      });
    });
    return results;
  }

  // ── FALSE URGENCY DETECTION ───────────────────────────────────────────

  /**
   * detectFalseUrgency()
   *
   * Strategy — two complementary passes:
   *
   * Pass A — TEXT SWEEP
   *   Walk every visible text node in the document using a TreeWalker.
   *   For each text node, check its content against every sub-category
   *   pattern array. When a match is found, record the closest block-level
   *   ancestor as the flagged element (so the highlight lands on something
   *   meaningful rather than a bare text node).
   *
   * Pass B — STRUCTURAL TIMER SWEEP
   *   Query known timer CSS selectors (countdown, clock, expire…) and
   *   also scan all elements whose text matches a MM:SS / HH:MM:SS regex.
   *   This catches dynamically-rendered timers whose surrounding text
   *   may not contain urgency keywords (the number itself is the signal).
   *
   * De-duplication:
   *   A Set of already-seen text strings prevents the same phrase being
   *   reported multiple times when it appears in nested DOM containers.
   *
   * @returns {Array<{type, subtype, element, confidence, label, reason}>}
   */
  function detectFalseUrgency() {
    const results = [];
    const seenText = new Set();

    // ── Helper: find the nearest meaningful ancestor to highlight ──────
    function closestBlock(node) {
      const BLOCK = new Set([
        'DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER',
        'P','LI','TD','TH','SPAN','LABEL','BUTTON','A'
      ]);
      let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      while (el && el !== document.body) {
        if (BLOCK.has(el.tagName)) return el;
        el = el.parentElement;
      }
      return node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    }

    // ── Helper: test text against one sub-category ─────────────────────
    function testCategory(text, category) {
      return category.patterns.some(rx => rx.test(text));
    }

    // ── PASS A: text-node sweep ────────────────────────────────────────
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip script/style content
          const tag = node.parentElement && node.parentElement.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node.textContent.trim();
          // Skip very short or very long text nodes
          if (text.length < 6 || text.length > 400) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const raw  = node.textContent.trim();
      const text = raw.toLowerCase();

      // Skip if we've already flagged this exact string
      if (seenText.has(text)) continue;

      // Check against all false-urgency sub-categories
      for (const category of FALSE_URGENCY_PATTERNS) {
        if (testCategory(raw, category)) {
          const el = closestBlock(node);
          if (!isVisible(el)) continue;

          seenText.add(text);
          const snippet = raw.length > 90 ? raw.substring(0, 90) + '...' : raw;
          results.push({
            type:       'false-urgency',
            subtype:    category.subtype,
            element:    el,
            confidence: 'High',
            label:      snippet,
            reason:     category.label
          });
          break; // one category match per text node is enough
        }
      }
    }

    // ── PASS B: structural timer sweep ────────────────────────────────
    const timerSeen = new Set();

    // B1 — elements with known timer class/id names
    TIMER_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!isVisible(el) || timerSeen.has(el)) return;
        const text = getVisibleText(el);
        if (seenText.has(text)) return; // already caught in Pass A

        timerSeen.add(el);
        const snippet = text.length > 90 ? text.substring(0, 90) + '...' : text || '(timer element)';
        results.push({
          type:       'false-urgency',
          subtype:    'countdown',
          element:    el,
          confidence: 'Medium',  // structural match, no text confirmation
          label:      snippet,
          reason:     'Countdown timer element detected (class/id heuristic)'
        });
      });
    });

    // B2 — elements containing a visible MM:SS or HH:MM:SS string
    //      that weren't caught by the selector sweep above
    document.querySelectorAll('*').forEach(el => {
      if (timerSeen.has(el) || !isVisible(el)) return;
      const text = (el.innerText || '').trim();
      if (!text || text.length > 20) return; // timers are short strings
      if (!TIMER_TEXT_RE.test(text)) return;

      // Make sure this element's only meaningful content is the timer
      // (avoids flagging e.g. a phone number "12:34" inside a paragraph)
      const children = el.querySelectorAll('*').length;
      if (children > 3) return; // too complex — not a dedicated timer element

      const key = text.toLowerCase();
      if (seenText.has(key)) return;

      timerSeen.add(el);
      seenText.add(key);
      results.push({
        type:       'false-urgency',
        subtype:    'countdown',
        element:    el,
        confidence: 'Medium',
        label:      text,
        reason:     'MM:SS countdown value detected in isolated element'
      });
    });

    return results;
  }

  // ── 4. VISUAL HIGHLIGHT ───────────────────────────────────────────────

  // Colour per pattern type
  const TYPE_COLOURS = {
    'preselection':  '#e53e3e',
    'confirmshaming':'#dd6b20',
    'false-urgency': '#6b46c1'
  };

  function highlightElement(el, index, type) {
    const colour = TYPE_COLOURS[type] || '#e53e3e';
    el.dataset.darkshieldOrigOutline  = el.style.outline  || '';
    el.dataset.darkshieldOrigPosition = el.style.position || '';
    el.style.outline       = `3px solid ${colour}`;
    el.style.outlineOffset = '3px';

    const badge = document.createElement('div');
    badge.className = 'ds-badge';
    badge.setAttribute('data-darkshield', 'true');
    badge.textContent = `DS #${index + 1}`;
    badge.style.cssText = `
      position: absolute;
      background: ${colour};
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      font-family: monospace;
      padding: 1px 5px;
      border-radius: 3px;
      z-index: 2147483646;
      pointer-events: none;
      line-height: 1.6;
      white-space: nowrap;
    `;
    const rect = el.getBoundingClientRect();
    badge.style.top      = `${rect.top  + window.scrollY - 20}px`;
    badge.style.left     = `${rect.left + window.scrollX}px`;
    badge.style.position = 'absolute';
    document.body.appendChild(badge);
  }

  function removeHighlights() {
    document.querySelectorAll('[data-darkshield-outlined]').forEach(el => {
      el.style.outline  = el.dataset.darkshieldOrigOutline  || '';
      el.style.position = el.dataset.darkshieldOrigPosition || '';
      delete el.dataset.darkshieldOutlined;
    });
    document.querySelectorAll('[data-darkshield="true"]').forEach(el => el.remove());
  }

  // ── 5. OVERLAY UI ─────────────────────────────────────────────────────

  function showOverlay(results) {
    const styleId = 'darkshield-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #darkshield-overlay {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 360px;
          max-height: 72vh;
          background: #fff;
          border: 1.5px solid #e53e3e;
          border-radius: 10px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        #darkshield-overlay * { box-sizing: border-box; margin: 0; padding: 0; }
        #ds-header {
          background: #e53e3e;
          color: #fff;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        #ds-header-title {
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        #ds-version {
          font-size: 10px;
          font-weight: 400;
          opacity: .75;
          margin-left: 4px;
        }
        #ds-close {
          background: none; border: none; color: #fff;
          font-size: 18px; cursor: pointer; line-height: 1; padding: 0 2px; opacity: .85;
        }
        #ds-close:hover { opacity: 1; }
        #ds-body { overflow-y: auto; flex: 1; padding: 10px 12px; }
        #ds-summary {
          background: #fff5f5;
          border: 1px solid #fed7d7;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 10px;
          color: #742a2a;
          font-size: 12px;
          line-height: 1.5;
        }
        .ds-result {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 8px;
          background: #fafafa;
        }
        .ds-result-header {
          display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
        }
        .ds-type-badge {
          font-size: 10px; font-weight: 700; padding: 2px 6px;
          border-radius: 4px; text-transform: uppercase;
          letter-spacing: .04em; flex-shrink: 0;
        }
        .ds-type-preselection  { background: #fed7d7; color: #9b2c2c; }
        .ds-type-confirmshaming{ background: #feebc8; color: #7b341e; }
        .ds-type-false-urgency { background: #e9d8fd; color: #44337a; }
        .ds-subtype {
          font-size: 9px; font-weight: 600; padding: 1px 5px;
          border-radius: 3px; text-transform: uppercase; letter-spacing: .05em;
          background: #edf2f7; color: #4a5568; flex-shrink: 0;
        }
        .ds-confidence { font-size: 10px; color: #718096; margin-left: auto; flex-shrink: 0; }
        .ds-result-num { font-size: 11px; font-weight: 700; color: #e53e3e; flex-shrink: 0; }
        .ds-reason { font-size: 11px; color: #4a5568; margin-bottom: 3px; }
        .ds-label {
          font-size: 11px; color: #718096; font-style: italic; word-break: break-word;
        }
        .ds-label::before { content: '"'; }
        .ds-label::after  { content: '"'; }
        #ds-footer {
          padding: 8px 12px; border-top: 1px solid #e2e8f0;
          display: flex; gap: 6px; flex-shrink: 0;
        }
        .ds-btn {
          flex: 1; padding: 6px 10px; border-radius: 5px;
          font-size: 12px; font-weight: 500; cursor: pointer;
          border: 1px solid #e2e8f0; background: #fff; color: #4a5568;
        }
        .ds-btn:hover { background: #f7fafc; }
        .ds-btn-dismiss { background: #e53e3e; color: #fff; border-color: #e53e3e; }
        .ds-btn-dismiss:hover { background: #c53030; }
        #ds-zero {
          padding: 16px; text-align: center; color: #48bb78; font-weight: 500;
        }
        #ds-zero span {
          display: block; font-size: 11px; color: #718096;
          margin-top: 4px; font-weight: 400;
        }
      `;
      document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.id = 'darkshield-overlay';

    const preselectionCount   = results.filter(r => r.type === 'preselection').length;
    const confirmshamingCount = results.filter(r => r.type === 'confirmshaming').length;
    const falseUrgencyCount   = results.filter(r => r.type === 'false-urgency').length;

    // Header
    const header = document.createElement('div');
    header.id = 'ds-header';
    header.innerHTML = `
      <div id="ds-header-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        DarkShield
        <span id="ds-version">v1.1</span>
      </div>
      <button id="ds-close" title="Close DarkShield">×</button>
    `;
    overlay.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.id = 'ds-body';

    if (results.length === 0) {
      body.innerHTML = `
        <div id="ds-zero">
          ✓ No dark patterns detected on this page step.
          <span>Try running DarkShield again after proceeding to the next booking step.</span>
        </div>
      `;
    } else {
      const summary = document.createElement('div');
      summary.id = 'ds-summary';
      const parts = [];
      if (preselectionCount   > 0) parts.push(`${preselectionCount} pre-ticked checkbox${preselectionCount > 1 ? 'es' : ''}`);
      if (confirmshamingCount > 0) parts.push(`${confirmshamingCount} confirmshaming instance${confirmshamingCount > 1 ? 's' : ''}`);
      if (falseUrgencyCount   > 0) parts.push(`${falseUrgencyCount} false urgency signal${falseUrgencyCount > 1 ? 's' : ''}`);
      summary.textContent = `⚑ Detected: ${parts.join(', ')}. Review each item below before proceeding.`;
      body.appendChild(summary);

      const TYPE_LABEL = {
        'preselection':   'Pre-ticked',
        'confirmshaming': 'Confirmshaming',
        'false-urgency':  'False Urgency'
      };

      results.forEach((r, i) => {
        const card = document.createElement('div');
        card.className = 'ds-result';
        card.innerHTML = `
          <div class="ds-result-header">
            <span class="ds-result-num">#${i + 1}</span>
            <span class="ds-type-badge ds-type-${r.type}">${TYPE_LABEL[r.type] || r.type}</span>
            ${r.subtype && r.subtype !== r.type
              ? `<span class="ds-subtype">${r.subtype}</span>`
              : ''}
            <span class="ds-confidence">Confidence: ${r.confidence}</span>
          </div>
          <div class="ds-reason">${r.reason}</div>
          <div class="ds-label">${r.label}</div>
        `;
        body.appendChild(card);
      });
    }

    overlay.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.id = 'ds-footer';
    footer.innerHTML = `
      <button class="ds-btn" id="ds-rescan">↻ Rescan</button>
      <button class="ds-btn ds-btn-dismiss" id="ds-dismiss">Dismiss</button>
    `;
    overlay.appendChild(footer);
    document.body.appendChild(overlay);

    document.getElementById('ds-close').addEventListener('click', teardown);
    document.getElementById('ds-dismiss').addEventListener('click', teardown);
    document.getElementById('ds-rescan').addEventListener('click', () => {
      teardown();
      setTimeout(run, 100);
    });
  }

  // ── 6. CLEANUP ────────────────────────────────────────────────────────

  function teardown() {
    removeHighlights();
    const overlay = document.getElementById('darkshield-overlay');
    if (overlay) overlay.remove();
  }

  // ── 7. MAIN ENTRY POINT ───────────────────────────────────────────────

  function run() {
    console.log('%c🛡 DarkShield v1.1 running...', 'color:#e53e3e;font-weight:bold;');

    const preselectionResults   = detectPreselection();
    const confirmshamingResults = detectConfirmshaming();
    const falseUrgencyResults   = detectFalseUrgency();
    const allResults = [
      ...preselectionResults,
      ...confirmshamingResults,
      ...falseUrgencyResults
    ];

    allResults.forEach((r, i) => {
      try {
        highlightElement(r.element, i, r.type);
        r.element.dataset.darkshieldOutlined = 'true';
      } catch (e) { /* element may no longer be in DOM */ }
    });

    if (allResults.length > 0) {
      console.group('%c🛡 DarkShield — Detections', 'color:#e53e3e;font-weight:bold;');
      allResults.forEach((r, i) => {
        const colour = { 'preselection':'#e53e3e','confirmshaming':'#dd6b20','false-urgency':'#6b46c1' }[r.type] || '#e53e3e';
        console.log(
          `%c#${i + 1} [${r.type.toUpperCase()}/${r.subtype}] %c${r.reason}`,
          `color:${colour};font-weight:bold;`,
          'color:#4a5568;'
        );
        console.log('  Label:', r.label);
        console.log('  Element:', r.element);
      });
      console.groupEnd();
    } else {
      console.log('%c🛡 DarkShield — No detections on this page step.', 'color:#48bb78;font-weight:bold;');
    }

    showOverlay(allResults);
  }

  // ── 8. SPA NAVIGATION OBSERVER ────────────────────────────────────────

  let navDebounce = null;
  let lastUrl = location.href;

  const navObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      clearTimeout(navDebounce);
      navDebounce = setTimeout(() => {
        console.log('%c🛡 DarkShield — Page navigation detected. Re-running...', 'color:#e53e3e;');
        teardown();
        run();
      }, 1200);
    }
  });

  navObserver.observe(document.body, { childList: true, subtree: true });

  run();

  window.darkshield = {
    run,
    stop: () => {
      navObserver.disconnect();
      teardown();
      console.log('%c🛡 DarkShield stopped.', 'color:#718096;');
    }
  };

  console.log('%c🛡 DarkShield v1.1 loaded. Call darkshield.stop() to deactivate.', 'color:#e53e3e;font-weight:bold;');

})();

