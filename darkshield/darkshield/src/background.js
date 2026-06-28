'use strict';

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'STORE_RESULT') return;

  chrome.storage.session.set({ latest_result: message.payload }, () => {
    if (chrome.runtime.lastError) {
      console.warn('[DarkShield background] Storage error:', chrome.runtime.lastError);
    }
  });
});
