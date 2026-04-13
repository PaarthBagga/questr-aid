/**
 * Extension popup — shown when the user clicks the toolbar icon.
 * Displays current tab status and lets the user manually enter a ticker
 * if auto-detection fails.
 */

import { useState, useEffect } from 'react';

export function Popup() {
  const [tabUrl, setTabUrl] = useState<string>('');
  const [manualTicker, setManualTicker] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setTabUrl(tabs[0]?.url ?? '');
    });
  }, []);

  const isOnQuestrade =
    tabUrl.includes('my.questrade.com') || tabUrl.includes('app.questrade.com');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTicker.trim()) return;

    // Send the manual ticker to the content script on the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId == null) return;
      chrome.tabs.sendMessage(tabId, {
        type: 'MANUAL_TICKER',
        symbol: manualTicker.trim().toUpperCase(),
      });
    });
    setSubmitted(true);
  }

  return (
    <div className="bg-q-bg font-sans">
      {/* Header */}
      <div className="bg-q-purple px-4 py-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-white text-[10px] font-black">Q</span>
        </div>
        <span className="text-white font-bold text-sm tracking-tight">Questr-aid</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Page status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isOnQuestrade ? 'bg-q-success' : 'bg-q-textMuted'
            }`}
          />
          <span className="text-xs text-q-textSecondary">
            {isOnQuestrade
              ? 'Active on Questrade — panel should appear on stock pages.'
              : 'Not on Questrade. Navigate to my.questrade.com to use Questr-aid.'}
          </span>
        </div>

        {/* Manual ticker entry */}
        {isOnQuestrade && !submitted && (
          <form onSubmit={handleSubmit} className="space-y-2">
            <p className="text-[11px] text-q-textMuted">
              If the panel didn't detect a stock automatically, enter the ticker manually:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTicker}
                onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
                placeholder="e.g. TD or TD.TO"
                maxLength={8}
                className="
                  flex-1 border border-q-border rounded-lg px-2.5 py-1.5
                  text-xs text-q-textPrimary bg-white
                  focus:outline-none focus:ring-2 focus:ring-q-purple/40 focus:border-q-purple
                "
              />
              <button
                type="submit"
                className="
                  bg-q-purple text-white text-xs font-semibold px-3 py-1.5
                  rounded-lg hover:bg-q-purpleLight transition-colors
                "
              >
                Load
              </button>
            </div>
          </form>
        )}

        {submitted && (
          <p className="text-xs text-q-green font-medium">
            ✓ Ticker sent — check the panel on the page.
          </p>
        )}

        {/* Footer */}
        <p className="text-[9px] text-q-textMuted border-t border-q-border pt-2">
          Data via Yahoo Finance · Not financial advice
        </p>
      </div>
    </div>
  );
}
