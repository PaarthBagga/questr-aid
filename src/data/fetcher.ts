/**
 * Thin messaging layer between content script and background service worker.
 * Content scripts cannot directly call Yahoo Finance (CORS), so all fetches
 * are proxied through the service worker.
 */

import type { QuoteData } from '../types';

type BackgroundResponse =
  | { ok: true;  data: QuoteData }
  | { ok: false; error: string  };

/**
 * Requests a full quote for the given ticker from the background worker.
 * Rejects on network/messaging errors; resolves with QuoteData on success.
 */
export function fetchQuote(symbol: string): Promise<QuoteData> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'FETCH_QUOTE', symbol },
      (response: BackgroundResponse | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error('No response from background worker'));
          return;
        }
        if (response.ok) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}
