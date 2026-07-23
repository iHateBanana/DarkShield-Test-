// regex-detector.js — DarkShield V2
// Heuristic dark pattern detection using regex.
// Runs before the LLM. Fast, explainable, but limited to known patterns.

const DARK_PATTERN_RULES = [
  {
    name: 'False Urgency',
    severity: 4,
    patterns: [
      /only\s+\d+\s+(left|remaining|available)/i,
      /(\d+)\s+(people|users|others).*(looking|viewing|watching)/i,
      /(sale|offer|deal)\s+ends?\s+(today|soon|in\s+\d+\s+(min|hour))/i,
      /(hurry|hurry up|don't miss out|limited time|act now)/i,
      /(\d+:\d+:\d+).*(timer|countdown)/i,
    ]
  },
  {
    name: 'Confirmshaming',
    severity: 4,
    patterns: [
      /(no\s+thanks|no\s+thank\s+you).*(I\s+(don't|won't).*(save|money|wealth|future))/i,
      /(I\s+(don't|won't).*(save|invest|improve|better))/i,
      /(I'?d?\s+(rather|prefer)\s+(to\s+)?pay\s+(more|full\s+price))/i,
      /(I\s+(don't|hate)\s+(saving|deals|discounts|free))/i,
    ]
  },
  {
    name: 'Preselection',
    severity: 3,
    patterns: [
      /(\d+)\s+(pre[- ]?selected|checked)/i,
      /(all|both)\s+(boxes?\s+)?(pre[- ]?checked|pre[- ]?selected)/i,
      /(subscribe|sign\s*up|opt[- ]?in).*(by\s+default|automatically)/i,
      /(we\s+may|we\s+will|we\s+can)\s+(send|share|contact)/i,
    ]
  },
  {
    name: 'Hidden Subscription',
    severity: 3,
    patterns: [
      /(free\s+trial).*(credit\s+card|billing|payment)/i,
      /(cancel|unsubscribe).*(call|phone|mail|write)/i,
      /(subscription|recurring).*(automatically\s+renew|will\s+continue)/i,
    ]
  },
  {
    name: 'Fake Social Proof',
    severity: 2,
    patterns: [
      /(\d+[,\d]*)\s+(customers|users|people|downloads)/i,
      /(join\s+)+\d+[,\d]*\s*(happy|satisfied)/i,
      /(everyone\s+is|people\s+are|trending|popular.*right\s+now)/i,
    ]
  }
];

/**
 * Scan text and return all matched dark pattern rules.
 * @param {string} text
 * @returns {Array} [{patternName, severity, matchedText, patternIndex}]
 */
function scanWithRegex(text) {
  const results = [];
  for (const rule of DARK_PATTERN_RULES) {
    for (let i = 0; i < rule.patterns.length; i++) {
      const match = text.match(rule.patterns[i]);
      if (match) {
        results.push({
          patternName: rule.name,
          severity: rule.severity,
          matchedText: match[0],
          patternIndex: i
        });
        break;
      }
    }
  }
  return results;
}

/**
 * Calculate overall dark pattern score from regex results.
 * @param {Array} results
 * @returns {number} 0 (clean) to 1 (very suspicious)
 */
function calculateRegexScore(results) {
  if (results.length === 0) return 0;
  const maxPossible = DARK_PATTERN_RULES.reduce((sum, r) => sum + r.severity, 0);
  const actual = results.reduce((sum, r) => sum + r.severity, 0);
  return actual / maxPossible;
}
