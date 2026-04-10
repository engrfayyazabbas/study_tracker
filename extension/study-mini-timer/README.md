# Study Mini Timer Extension

This Chrome extension shows your study mini timer on all browser tabs.

## How it works

- On your study app pages, it reads `localStorage.studyTimerState`.
- It mirrors that state into `chrome.storage.local`.
- On any other tab/site, it renders the floating mini timer from that shared state.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder:
   - `extension/study-mini-timer`

## Usage

1. Open your app timer page and start a timer session.
2. Switch to any other tab/website.
3. The mini timer appears at bottom-right.
4. Click `Open` to return to your app timer page.

## Notes

- Works on `http/https` pages where content scripts are allowed.
- It will not inject into restricted pages like `chrome://`.
- Dismiss button hides it for the current tab session only.
