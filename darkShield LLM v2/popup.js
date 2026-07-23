// popup.js — DarkShield V2

document.addEventListener('DOMContentLoaded', () => {
  const scanBtn       = document.getElementById('scanBtn');
  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiBaseInput  = document.getElementById('apiBase');
  const saveKeyBtn    = document.getElementById('saveKeyBtn');
  const saveStatus    = document.getElementById('saveStatus');
  const historyDiv    = document.getElementById('history');

  // Toggle settings panel
  settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display =
      settingsPanel.style.display === 'none' ? 'block' : 'none';
  });

  // Load saved API base URL
  chrome.storage.sync.get(['api_base'], (result) => {
    if (result.api_base) apiBaseInput.value = result.api_base;
  });

  // Save API base URL
  saveKeyBtn.addEventListener('click', () => {
    const base = apiBaseInput.value.trim();
    chrome.storage.sync.set({ api_base: base }, () => {
      saveStatus.textContent = 'Saved.';
      setTimeout(() => saveStatus.textContent = '', 2000);
    });
  });

  // Trigger scan on active tab
  scanBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'scan' });
    window.close();
  });

  // Load scan history
  chrome.storage.local.get(['scanHistory'], (result) => {
    const history = result.scanHistory || [];
    if (history.length === 0) return;

    historyDiv.innerHTML = history
      .slice(-10)
      .reverse()
      .map(item => `
        <div class="history-item ${item.isDarkPattern ? 'dark' : 'clean'}">
          <strong>${item.url}</strong><br>
          ${item.isDarkPattern
            ? '🚨 ' + (item.type || 'dark pattern') + ' — ' + Math.round((item.confidence || 0) * 100) + '%'
            : '✅ Clean'}
        </div>
      `)
      .join('');
  });
});
