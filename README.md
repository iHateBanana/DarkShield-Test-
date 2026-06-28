# DarkShield-Test-
Standalone HTML test surface for DarkShield v1.1 — simulates confirmshaming, preselected checkboxes, and false urgency patterns across a mock travel booking UI.

# NovaSky — DarkShield Test Surface

Standalone HTML test page simulating a mock travel booking site.  
Used to verify DarkShield v1.1 detection of:

- Preselected checkboxes (HIGH and MEDIUM confidence)
- Confirmshaming (HIGH confidence)
- False urgency — scarcity, social proof, expiry, countdown (HIGH and MEDIUM)

## Usage

1. Open `novasky.html` in Chrome
2. Paste `darkshield-v1.1.js` into DevTools console
3. Verify annotations appear on all labelled test items