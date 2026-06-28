'use strict';

const card = document.getElementById('result-card');

chrome.storage.session.get(['latest_result'], ({ latest_result }) => {
  if (!latest_result) return;

  const { confirmshaming_count, false_urgency_count, total, url, timestamp } = latest_result;

  const time     = timestamp ? new Date(timestamp).toLocaleTimeString() : '—';
  const shortUrl = url ? url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50) : '—';

  const csPill = confirmshaming_count > 0
    ? `<span class="pill pill-found">${confirmshaming_count} found</span>`
    : `<span class="pill pill-clean">Clean</span>`;

  const fuPill = false_urgency_count > 0
    ? `<span class="pill pill-found">${false_urgency_count} found</span>`
    : `<span class="pill pill-clean">Clean</span>`;

  card.innerHTML = `
    <div class="row">
      <span class="row-label">Confirmshaming</span>${csPill}
    </div>
    <div class="row">
      <span class="row-label">False urgency</span>${fuPill}
    </div>
    <div class="row">
      <span class="row-label">Total detections</span>
      <span class="pill ${total > 0 ? 'pill-found' : 'pill-clean'}">${total}</span>
    </div>
    <div class="row">
      <span class="row-label">Scanned at</span>
      <span style="font-size:11px;color:#374151">${time}</span>
    </div>
    <div class="result-url">${shortUrl}</div>
  `;
});
