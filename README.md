# ApiForge Lite — Spring Edition

ApiForge Lite is a lightweight, secure Windows desktop API client tailored specifically for Spring Boot developers.

---

## 1. Project Overview

ApiForge Lite is designed as a focused, high-performance desktop tool for testing and developing Spring Boot APIs. It replaces bloated, slow API suites with a clean, developer-first architecture.

* **Step 1 (Completed)**: Established the Electron application shell, secure preload bridge (`window.apiForge`), context isolation, sandboxing, navigation security, and dark graphite UI.
* **Step 2 (Completed)**: Implemented the **Real HTTP Engine**, **Interactive Request Builder**, and **Response Viewer**.
* **Step 3 (Completed)**: Implemented **Collections and Folders Management**, **Local Atomic JSON Storage**, request saving/reopening with full HTTP metadata, unsaved changes tracking, and recursive tree navigation.
* **Step 4 (Completed)**: Implemented **Request History & Application Settings**:
  - Dedicated request history panel in the sidebar with live request recording, duration, status badges, and short body previews.
  - Automatic case-insensitive credential redaction (`***` for `Authorization`, `Cookie`, `X-API-Key`, etc.) and total exclusion of request bodies/passwords from history storage.
  - History entry restoration directly into the request editor with credential safety warnings.
  - Clear history action with confirmation modal.
  - Comprehensive Settings modal supporting configurable request timeouts (1,000–120,000 ms), history retention limits (10–1,000 entries), and Dark / Light theme selection with instant preview and restart persistence.
  - Local atomic JSON storage for `history.json` and `settings.json` with corruption recovery and strict schema validation.

---

## 2. Features Implemented in Step 4: Request History and Settings

### A. Request History Management
* **Automatic Recording**: Every HTTP Send attempt automatically logs an entry containing:
  - Exact timestamp and formatted time.
  - HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`).
  - Full effective URL, including active query parameters.
  - HTTP status code (if a response was received).
  - Request round-trip duration in milliseconds.
  - Short, size-limited response body preview (capped at 2 KB).
  - Network error flag and diagnostic error message for requests failing before HTTP response.
* **Sidebar History Panel**:
  - Prominently positioned in the workspace sidebar.
  - Newest-first chronological ordering.
  - Method badges with color-coded styling (`GET` green, `POST` blue, `DELETE` red, etc.).
  - Status badges (`2xx` green, `3xx` cyan, `4xx` orange, `5xx` red, `NET ERR` badge for network failures).
  - Active history count badge in the sidebar navigation.
  - Helpful empty, loading, and error states.
* **One-Click History Restoration**:
  - Selecting any history entry instantly restores its HTTP method, URL, query parameters, and non-sensitive headers into the active request editor tab.
  - Informative toast notification clearly alerts the developer if credentials were masked so they can be re-entered.
* **Clear History with Confirmation**:
  - Non-blocking confirmation modal prevents accidental history loss.
  - Atomically truncates persisted history file and refreshes UI immediately.
* **Security & Credential Redaction**:
  - **Zero Password / Token Persistence**: Request bodies and credentials are never stored in `history.json`.
  - **Header Redaction**: Sensitive headers (`Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`, `X-API-Key`, `X-Auth-Token`, `X-Secret`, `token`, `secret`) are strictly redacted as `***` before writing to disk.
  - Redaction is case-insensitive (handles `AUTHORIZATION`, `authorization`, `Authorization`, etc.).

### B. Application Settings
* **Dedicated Settings Modal**: Accessible via the gear icon in the sidebar footer.
* **Request Timeout**:
  - Default: `15,000 ms` (15 seconds).
  - Configurable range: `1,000 ms` to `120,000 ms`.
  - Live human-readable second conversion display (e.g., `15 seconds`).
  - Validation: rejects non-integers and out-of-range values.
  - Applied immediately to all subsequent HTTP requests via the HTTP engine.
* **History Retention Limit**:
  - Default: `100 entries`.
  - Configurable range: `10` to `1,000 entries`.
  - Automatic trimming: decreasing the limit immediately purges older entries from disk and UI.
* **Color Themes (Dark & Light)**:
  - Seamless toggle between Dark theme (Graphite & Slate) and Light theme (Clean Spring Palette).
  - Instant theme application across the entire application interface.
  - Persisted across application restarts.
* **Reset to Defaults**: One-click reset restores recommended factory defaults (`15,000 ms` timeout, `100` history limit, `dark` theme).

### C. Persistent Storage & Security (`historyStorage.js` & `settingsStorage.js`)
* **Dedicated JSON Files**: Stored under `app.getPath('userData')`:
  - `history.json`
  - `settings.json`
* **Atomic File Writes**: Writes data to a temporary file (`.tmp`) before renaming, guaranteeing zero partial writes or corruption upon sudden power loss or process exit.
* **Corruption Recovery**: Missing, empty, or corrupted JSON files automatically fall back to safe defaults without crashing the application.
* **Main-Process Isolation**: The renderer process has no direct Node.js filesystem access. All interactions are handled via validated IPC channels:
  - `history:get`, `history:add`, `history:clear`
  - `settings:get`, `settings:save`, `settings:reset`

---

## 3. Features Implemented in Step 3: Collections and Folders

### A. Collections & Folder Management
* **Sidebar Tree View**: Clean, collapsible tree view of collections, folders, and saved requests with HTTP method badges.
* **Hierarchical Nesting**: Multi-level nested folders within collections, supporting requests at collection root or organized deeply inside subfolders.
* **Full CRUD Operations**:
  - Collections: Create, Rename, Duplicate, Delete (with cascade delete confirmation).
  - Folders: Create (root or nested), Rename, Duplicate, Delete.
  - Requests: Save, Reopen in editor, Rename, Duplicate, Delete.
* **Safe Confirmation Dialogs**: Non-blocking modal confirmations before destructive delete operations to prevent accidental data loss.

### B. Request Saving & Reopening
* **Save New & Existing Requests**: Seamlessly saves URL, HTTP method, query parameters (with enabled/disabled states), custom headers, and JSON request body.
* **Direct Save (`Ctrl+S`)**: Existing requests save instantly to disk with updated visual feedback. Unsaved requests prompt the Save Modal with collection and folder selectors.
* **Save As (`btn-save-as-request`)**: Allows saving copies or branching requests under different collections or folders.
* **Unsaved Changes Tracking**: Visual indicator dot (`.save-indicator-dot`) in the header and tab strip detects differences between the working request and the saved snapshot on disk.
* **Reopen Saved Requests**: Clicking any request in the tree restores the complete editor configuration with all HTTP parameters, headers, and payload preserved.

---

## 4. Core HTTP Engine & Request Builder (Step 2)

### A. Main-Process HTTP Engine (`src/main/http/httpClient.js`)
* **Real Network Dispatch**: Requests execute exclusively within the Node.js Electron Main Process via `fetch`.
* **All 7 HTTP Methods Supported**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
* **Streaming Byte Limits**: Enforces a strict 5 MiB response limit to guard against memory exhaustion.
* **Configurable Timeouts**: Request execution aborts cleanly with `TIMEOUT` error after configured timeout (default 15,000 ms).
* **Real-time Cancellation**: Supports manual request cancellation via `AbortController`.
* **Error Normalization**: Maps network failures (`ECONNREFUSED`, `ENOTFOUND`, timeouts) into user-friendly error cards while treating HTTP 4xx/5xx as valid responses.

### B. Interactive Request Builder
* **Dynamic URL & Query Parameter Sync**: Two-way synchronization between the URL query string and parameter table.
* **Headers Table & Presets**: One-click presets for `Content-Type: application/json` and `Authorization: Bearer <token>`.
* **JSON Body Editor**: Real-time syntax validation with inline error messaging and JSON formatting.
* **Method Constraints**: Request bodies are strictly prohibited and disabled in the UI for `GET` and `HEAD` requests.

---

## 5. Security Architecture

ApiForge Lite strictly implements Electron desktop security best practices:
1. **Context Isolation**: `contextIsolation: true` is strictly enforced.
2. **Node Integration Disabled**: `nodeIntegration: false` in all `BrowserWindow` configurations.
3. **Chromium Sandbox**: `sandbox: true` enabled across all renderer contexts.
4. **Preload Bridge**: Narrowly scoped, frozen API exposed via `contextBridge.exposeInMainWorld('apiForge', Object.freeze(...))`.
5. **Path Traversal Defense**: All filesystem storage APIs enforce path resolution checks and ID pattern validation.
6. **Strict CSP**: Content Security Policy blocks inline script evaluation and external resource loading.
7. **Credential Protection**: Case-insensitive redaction of credentials in history, zero persistence of request bodies or sensitive tokens.

---

## 6. How to Run and Test

From the project root: `C:\Users\thiru\OneDrive\Desktop\API_Forge`

### Install Dependencies
```powershell
npm install
```

### Run Automated Unit & Integration Tests (72 Tests)
```powershell
npm test
```
*Executes all 72 tests across 12 test suites using the Node.js built-in test runner, including:*
1. Foundation security checks (CSP, context isolation, navigation filters).
2. HTTP engine integration tests (all 7 methods, query parameters, timeouts, cancellation).
3. Collections & folders atomic storage tests.
4. Step 4 Request History & Settings test suite (covering all 15 verification areas: response recording, 4xx/5xx responses, network failure status handling, newest-first ordering, default/custom trimming, clear history, editor restoration, sensitive-header redaction, credential exclusion, settings validation, timeout propagation, theme persistence, corruption recovery, and atomic writes).

### Run End-to-End Electron Smoke Test
```powershell
npm run test:smoke
```
*Launches Electron in an automated test harness to verify UI rendering, live HTTP request dispatch, collection creation, folder nesting, request saving, reopening, duplication, deletion, history recording, history restoration, theme switching, and history clearing.*

### Launch Desktop Application
```powershell
npm start
```
*or:*
```powershell
npm run dev
```

---

## 7. Project Structure

```
API_Forge/
├── package.json
├── README.md
├── src/
│   ├── main/
│   │   ├── main.js                      # Electron Main process lifecycle & window manager
│   │   ├── http/
│   │   │   └── httpClient.js            # Main process HTTP engine & validation
│   │   ├── ipc/
│   │   │   └── appHandlers.js           # Validated IPC handlers (app, http, collections, history, settings)
│   │   ├── security/
│   │   │   └── navigation.js            # Web navigation security & URL filtering
│   │   └── storage/
│   │       ├── collectionsStorage.js    # Atomic JSON storage engine for collections
│   │       ├── historyStorage.js        # Atomic JSON storage & redaction engine for request history
│   │       └── settingsStorage.js       # Atomic JSON storage & validation for application settings
│   ├── preload/
│   │   └── preload.js                   # Secure frozen preload bridge
│   └── renderer/
│       ├── index.html                   # UI layout, tree sidebar, history panel, settings modal
│       ├── scripts/
│       │   └── renderer.js              # Renderer controller (tabs, tree, history, settings, themes)
│       └── styles/
│           └── main.css                 # Graphite dark & light design system, themes, and modals
└── tests/
    ├── foundation.test.js               # Step 1 security & configuration unit tests
    ├── http.test.js                     # Step 2 HTTP engine & integration tests
    ├── collections.test.js              # Step 3 collections & atomic storage unit tests
    ├── history_settings.test.js         # Step 4 history & settings 15-point automated test suite
    └── smoke.js                         # Electron runtime end-to-end smoke test (Steps 1–4)
```

---

## 8. Next Steps

* **Step 5**: Authentication Tokens, Environment Variables (`{{baseUrl}}`), Bearer Presets & OpenAPI import.
