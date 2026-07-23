/**
 * DarkShield LLM — Claude-powered dark pattern detector
 * Detects: confirmshaming, false urgency, preselected checkboxes
 * Model: claude-sonnet-4-6 via Anthropic Messages API
 */

const SYSTEM_PROMPT = `You are DarkShield, an expert dark UX pattern detector trained to identify manipulative design in e-commerce checkout flows.

Analyze the provided input and detect these three dark pattern categories:

1. CONFIRMSHAMING — Opt-out buttons or labels that use guilt or shame to manipulate. Examples: "No thanks, I don't mind paying more", "I'll risk it", "I don't want to save money".

2. FALSE URGENCY — Fabricated or exaggerated scarcity/time pressure. Examples: "Only 2 left!", "10 people viewing now", countdown timers, "Price increased 3x today". Distinguish genuine stock info from manipulative framing.

3. PRESELECTION — Checkboxes or options pre-ticked for paid add-ons, insurance, or non-essential services without user consent.

You MUST respond with ONLY a valid JSON object, no markdown, no preamble, no explanation outside the JSON. Format:
{
  "platform": "detected or stated platform name",
  "patterns": [
    {
      "type": "confirmshaming" | "false_urgency" | "preselection",
      "confidence": 0.0 to 1.0,
      "explanation": "1-2 sentence explanation of why this is a dark pattern",
      "quote": "exact text or label from the input that is the dark pattern (max 80 chars)"
    }
  ],
  "summary": "1 sentence overall assessment"
}

If no dark patterns are found, return { "platform": "...", "patterns": [], "summary": "No dark patterns detected." }
Only include patterns you are confident about. Do not hallucinate patterns not present in the input.`;

/**
 * Analyse a page snippet for dark UX patterns using Claude.
 *
 * @param {string} input     - HTML or plain text from the page
 * @param {string} platform  - e.g. "booking", "ryanair", "expedia", "generic"
 * @param {string} inputType - "html" | "text"
 * @param {string} apiKey    - Anthropic API key (omit if using a proxy that injects it)
 * @returns {Promise<DarkShieldResult>}
 */
async function analyzeWithClaude(input, platform = "generic", inputType = "html", apiKey = "") {
  const inputLabel = inputType === "html" ? "HTML snippet" : "visible page text";

  const userMessage = `Platform context: ${platform === "generic" ? "unknown" : platform}

${inputLabel}:
${input}`;

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.content?.map((b) => b.text || "").join("") || "";
  const clean = raw.replace(/```json|```/g, "").trim();

  /** @type {DarkShieldResult} */
  const result = JSON.parse(clean);
  return result;
}

// ---------------------------------------------------------------------------
// Types (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DarkPattern
 * @property {"confirmshaming"|"false_urgency"|"preselection"} type
 * @property {number} confidence  - 0.0 – 1.0
 * @property {string} explanation
 * @property {string} [quote]     - Exact excerpt from input
 */

/**
 * @typedef {Object} DarkShieldResult
 * @property {string}        platform
 * @property {DarkPattern[]} patterns
 * @property {string}        summary
 */

// ---------------------------------------------------------------------------
// Sample snippets (mirrors the in-artifact samples)
// ---------------------------------------------------------------------------

const SAMPLES = {
  booking: {
    platform: "booking",
    type: "html",
    input: `<div class="checkout-block">
  <h2>Complete your booking</h2>
  <p class="urgency-banner">⚡ Only 2 rooms left at this price! 14 people looking right now</p>
  <div class="add-ons">
    <input type="checkbox" checked id="breakfast" name="breakfast">
    <label for="breakfast">Add breakfast — €18/person</label>
    <input type="checkbox" checked id="insurance" name="insurance">
    <label for="insurance">Travel insurance — €24.99</label>
    <input type="checkbox" checked id="taxi" name="taxi">
    <label for="taxi">Airport taxi — €35</label>
  </div>
  <div class="price-warning">🔥 Price increased 3 times in the last 6 hours</div>
  <button class="cta">I want to pay more later</button>
  <p class="fine-print">Or book now to lock in this rate</p>
</div>`,
  },

  ryanair: {
    platform: "ryanair",
    type: "html",
    input: `<div class="seat-selection">
  <h3>Choose your seats</h3>
  <p class="scarcity">Only 3 standard seats left!</p>
  <div class="insurance-box">
    <input type="checkbox" checked id="ins" name="ins">
    <label for="ins">Travel insurance — €45.99 (recommended)</label>
  </div>
  <div class="priority-box">
    <input type="checkbox" checked id="priority" name="priority">
    <label for="priority">Priority boarding — €6.99</label>
  </div>
  <a class="no-thanks" href="#">No, I don't want to protect my trip and I understand I will lose my money if anything goes wrong</a>
  <p class="countdown">⏱ Offer expires in 08:32</p>
</div>`,
  },

  expedia: {
    platform: "expedia",
    type: "html",
    input: `<div class="hotel-detail">
  <span class="badge red">Only 1 left!</span>
  <p>🔥 Booked 28 times in the last 24 hours</p>
  <div class="extras">
    <input type="checkbox" checked id="free-cancel" name="free-cancel">
    <label for="free-cancel">Free cancellation protection — $12.99</label>
  </div>
  <p class="social-proof">10 people are viewing this right now</p>
  <button class="secondary-cta">No thanks, I'll risk it</button>
  <button class="primary-cta">Reserve — Best price guaranteed</button>
</div>`,
  },
};

// ---------------------------------------------------------------------------
// CLI runner
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  // Usage: node darkshield-llm.js <sample|html|text> [platform] [input]
  // e.g.:  node darkshield-llm.js sample booking
  //        node darkshield-llm.js html ryanair "<div>...</div>"
  //        node darkshield-llm.js text generic "Only 2 rooms left!"

  const mode = args[0] || "sample";
  let platform, inputType, input;

  if (mode === "sample") {
    const key = args[1] || "booking";
    const s = SAMPLES[key];
    if (!s) {
      console.error(`Unknown sample "${key}". Options: ${Object.keys(SAMPLES).join(", ")}`);
      process.exit(1);
    }
    ({ platform, type: inputType, input } = s);
    console.log(`\nRunning sample: ${key}\n${"─".repeat(50)}`);
  } else {
    inputType = mode; // "html" or "text"
    platform = args[1] || "generic";
    input = args[2] || "";
    if (!input) {
      console.error("Provide input as the third argument.");
      process.exit(1);
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || "";

  try {
    console.log(`Platform: ${platform} | Input type: ${inputType}`);
    console.log("Sending to Claude…\n");

    const result = await analyzeWithClaude(input, platform, inputType, apiKey);

    console.log(`Platform: ${result.platform}`);
    console.log(`Patterns found: ${result.patterns.length}`);
    console.log(`Summary: ${result.summary}\n`);

    for (const p of result.patterns) {
      const pct = Math.round(p.confidence * 100);
      console.log(`[${p.type.toUpperCase()}] ${pct}% confidence`);
      console.log(`  Explanation: ${p.explanation}`);
      if (p.quote) console.log(`  Quote: "${p.quote}"`);
      console.log();
    }

    if (result.patterns.length === 0) {
      console.log("✓ No dark patterns detected.");
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

// Run CLI if executed directly; export for use as a module
if (typeof require !== "undefined" && require.main === module) {
  main();
}

module.exports = { analyzeWithClaude, SAMPLES, SYSTEM_PROMPT };